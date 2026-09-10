import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * User store — same dual-backend pattern as the content store.
 *  1. Upstash Redis  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *  2. Local file     data/users.json
 *
 * Passwords are hashed with PBKDF2-SHA256. No plain-text is ever persisted.
 */

export type UserRole = "user" | "artist" | "admin";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** PBKDF2 hash: "pbkdf2:iterations:salt:hash" */
  passwordHash: string;
  artistId?: string; // linked Artist record if role === "artist"
  createdAt: string;
}

export type PublicUser = Omit<StoredUser, "passwordHash">;

/* ---------- helpers ---------- */
const ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const [, iter, salt, expected] = parts;
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, Number(iter), 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

/* ---------- Redis backend ---------- */
const USER_KEY = "rosie-atelier:users";
const FILE_PATH = path.join(process.cwd(), "data", "users.json");

function redisEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCmd(args: string[]) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()) as { result: unknown };
}

/* ---------- file backend ---------- */
async function fileRead(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function fileWrite(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(users, null, 2), "utf8");
}

/* ---------- public API ---------- */
export async function getAllUsers(): Promise<StoredUser[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", USER_KEY]);
      if (typeof result === "string") return JSON.parse(result) as StoredUser[];
      return [];
    }
    return await fileRead();
  } catch {
    return [];
  }
}

async function saveAllUsers(users: StoredUser[]): Promise<void> {
  if (redisEnabled()) {
    await redisCmd(["SET", USER_KEY, JSON.stringify(users)]);
  } else {
    await fileWrite(users);
  }
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = "user",
  artistId?: string,
): Promise<StoredUser> {
  const users = await getAllUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("email_taken");
  }
  const user: StoredUser = {
    id: `usr-${crypto.randomBytes(8).toString("hex")}`,
    name,
    email: email.toLowerCase().trim(),
    role,
    passwordHash: await hashPassword(password),
    ...(artistId ? { artistId } : {}),
    createdAt: new Date().toISOString(),
  };
  await saveAllUsers([...users, user]);
  return user;
}

export async function updateUser(id: string, patch: Partial<Pick<StoredUser, "name" | "artistId" | "role">>): Promise<StoredUser | null> {
  const users = await getAllUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const updated = { ...users[idx], ...patch };
  users[idx] = updated;
  await saveAllUsers(users);
  return updated;
}

export function toPublicUser(u: StoredUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...pub } = u;
  return pub;
}
