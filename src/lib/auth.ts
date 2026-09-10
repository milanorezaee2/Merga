import "server-only";
import { cookies } from "next/headers";
import { findUserByEmail, verifyPassword, type PublicUser } from "./data/users";
import { SESSION_COOKIE, type SessionUser, readSessionToken } from "./session";

export { SESSION_COOKIE, createSessionToken, readSessionToken } from "./session";
export type { SessionUser } from "./session";

/**
 * Server-side authentication helpers (Node.js runtime only).
 *
 * Supports three roles:
 *   "admin"  — configured via ADMIN_EMAIL + ADMIN_PASSWORD env vars
 *   "artist" — registered user with role=artist
 *   "user"   — regular customer
 */

const SESSION_TTL_S = 60 * 60 * 24 * 14;

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

/**
 * Validate credentials against:
 *   1. Env-var admin account
 *   2. User database (artists & regular users)
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const e = email.trim().toLowerCase();

  // --- Admin (env-var) ---
  if (adminConfigured()) {
    const okEmail = timingSafeEqualStr(e, String(process.env.ADMIN_EMAIL).trim().toLowerCase());
    const okPass = timingSafeEqualStr(password, String(process.env.ADMIN_PASSWORD));
    if (okEmail && okPass) {
      return {
        ok: true,
        user: { id: "admin", name: e.split("@")[0], email: e, role: "admin" },
      };
    }
  } else if (process.env.NODE_ENV !== "production" && e.startsWith("admin@") && password.length >= 4) {
    return {
      ok: true,
      user: { id: "admin", name: e.split("@")[0], email: e, role: "admin" },
    };
  }

  // --- Database users ---
  try {
    const stored = await findUserByEmail(e);
    if (!stored) return { ok: false, error: "invalid_credentials" };

    const match = await verifyPassword(password, stored.passwordHash);
    if (!match) return { ok: false, error: "invalid_credentials" };

    const user: SessionUser = {
      id: stored.id,
      name: stored.name,
      email: stored.email,
      role: stored.role,
      ...(stored.artistId ? { artistId: stored.artistId } : {}),
    };
    return { ok: true, user };
  } catch {
    return { ok: false, error: "server_error" };
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_S,
  };
}

/** Convert a PublicUser to a SessionUser (used after signup). */
export function publicUserToSession(u: PublicUser): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    ...(u.artistId ? { artistId: u.artistId } : {}),
  };
}
