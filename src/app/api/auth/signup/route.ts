import { NextResponse } from "next/server";
import { createUser, toPublicUser } from "@/lib/data/users";
import { createSessionToken, publicUserToSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, recordFailure, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  } | null;

  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  if (body.password.length < 6) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, withNoStore({ status: 400 }));
  }

  // Rate-limit by IP
  const key = `signup:${clientIp(req)}`;
  if (tooManyAttempts(key)) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
  }

  // Validate role — only "user" and "artist" allowed via public API
  const role = body.role === "artist" ? "artist" : "user";

  try {
    const stored = await createUser(body.name, body.email, body.password, role);
    const pub = toPublicUser(stored);
    const session = publicUserToSession(pub);
    const res = NextResponse.json({ ok: true, user: session }, withNoStore());
    res.cookies.set(SESSION_COOKIE, await createSessionToken(session), sessionCookieOptions());
    return res;
  } catch (e) {
    if (e instanceof Error && e.message === "email_taken") {
      recordFailure(key);
      return NextResponse.json({ ok: false, error: "email_taken" }, withNoStore({ status: 409 }));
    }
    return NextResponse.json({ ok: false, error: "server_error" }, withNoStore({ status: 500 }));
  }
}
