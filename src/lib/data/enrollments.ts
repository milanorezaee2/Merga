import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Course enrolments — who may open which lessons.
 *
 * Same dual-backend shape as the user store: Upstash Redis when configured, otherwise
 * `data/enrollments.json` (git-ignored; read-only on serverless, so set Redis before deploying).
 */

export interface Enrollment {
  id: string;
  userId: string;
  /** EducationItem id. */
  itemId: string;
  createdAt: string;
}

const KEY = "rosie-atelier:enrollments";
const FILE_PATH = path.join(process.cwd(), "data", "enrollments.json");

function redisEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCmd(args: string[]) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()) as { result: unknown };
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", KEY]);
      return typeof result === "string" ? (JSON.parse(result) as Enrollment[]) : [];
    }
    return JSON.parse(await fs.readFile(FILE_PATH, "utf8")) as Enrollment[];
  } catch {
    return [];
  }
}

async function saveAll(rows: Enrollment[]) {
  if (redisEnabled()) {
    await redisCmd(["SET", KEY, JSON.stringify(rows)]);
    return;
  }
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

export async function enrollmentsFor(userId: string): Promise<Enrollment[]> {
  return (await getAllEnrollments()).filter((e) => e.userId === userId);
}

export async function isEnrolled(userId: string, itemId: string): Promise<boolean> {
  return (await enrollmentsFor(userId)).some((e) => e.itemId === itemId);
}

/** Idempotent: enrolling twice returns the existing row. */
export async function enroll(userId: string, itemId: string): Promise<Enrollment> {
  const rows = await getAllEnrollments();
  const existing = rows.find((e) => e.userId === userId && e.itemId === itemId);
  if (existing) return existing;
  const row: Enrollment = { id: `enr-${crypto.randomBytes(6).toString("hex")}`, userId, itemId, createdAt: new Date().toISOString() };
  await saveAll([...rows, row]);
  return row;
}
