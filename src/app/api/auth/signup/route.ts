import { NextResponse } from "next/server";
import { createUser, findUserByEmail, toPublicUser } from "@/lib/data/users";
import { createArtistDraft, linkArtistAccount } from "@/lib/data/artists";
import { createSessionToken, publicUserToSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, recordFailure, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public sign-up.
 *
 * role "user"  → a plain customer account.
 * role "artist"→ a customer account *plus* a pending artist profile. The profile is not visible
 * anywhere on the public site until an admin approves it (see src/lib/data/artists.ts).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    /** Artist-only extras captured by /creators/join. */
    profession?: string;
    phone?: string;
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
  const email = body.email.trim();

  // Fail before writing anything: a duplicate e-mail must not leave an orphan profile behind.
  if (await findUserByEmail(email)) {
    recordFailure(key);
    return NextResponse.json({ ok: false, error: "email_taken" }, withNoStore({ status: 409 }));
  }

  let artistId: string | undefined;
  try {
    if (role === "artist") {
      const artist = await createArtistDraft({
        name: body.name,
        email,
        phone: body.phone,
        profession: body.profession,
      });
      artistId = artist.id;
    }

    const stored = await createUser(body.name, email, body.password, role, artistId);
    const pub = toPublicUser(stored);
    const session = publicUserToSession(pub);
    const res = NextResponse.json({ ok: true, user: session }, withNoStore());
    res.cookies.set(SESSION_COOKIE, await createSessionToken(session), sessionCookieOptions());

    // Link the account back onto the profile so the moderation queue can show who owns it.
    if (artistId) await linkArtistAccount(artistId, stored.id);

    return res;
  } catch (e) {
    if (e instanceof Error && e.message === "email_taken") {
      recordFailure(key);
      return NextResponse.json({ ok: false, error: "email_taken" }, withNoStore({ status: 409 }));
    }
    return NextResponse.json({ ok: false, error: "server_error" }, withNoStore({ status: 500 }));
  }
}
