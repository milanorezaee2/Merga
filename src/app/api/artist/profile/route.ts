import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/data/store";
import { artistStatus, patchArtistProfile, SELF_EDITABLE_FIELDS } from "@/lib/data/artists";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Self-service artist profile.
 *
 * An artist edits their *own* record; an admin may edit any record by passing `?id=`. Only the keys
 * in `SELF_EDITABLE_FIELDS` are ever applied — `status`, `featured`, `followers`, `rating`,
 * `userId`, `slug` and `id` cannot be changed here, so nobody can approve or promote themselves.
 */

async function requireArtist() {
  const s = await getSession();
  if (!s || (s.role !== "artist" && s.role !== "admin")) return null;
  return s;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/** Which record this request may touch, or null when the caller has no profile yet. */
async function resolveTargetId(searchParams: URLSearchParams) {
  const session = await requireArtist();
  if (!session) return { error: "unauthorized" as const };
  const requested = searchParams.get("id");
  if (session.role === "admin" && requested) return { session, artistId: requested };
  if (!session.artistId) return { error: "no_profile" as const };
  return { session, artistId: session.artistId };
}

export async function GET(req: Request) {
  const { error, artistId } = await resolveTargetId(new URL(req.url).searchParams);
  if (error) {
    return error === "unauthorized"
      ? unauthorized()
      : NextResponse.json({ ok: false, error: "no_profile" }, withNoStore({ status: 404 }));
  }

  const content = await getContent();
  const artist = content.artists.find((a) => a.id === artistId);
  if (!artist) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

  return NextResponse.json({ ok: true, artist, status: artistStatus(artist) }, withNoStore());
}

export async function PUT(req: Request) {
  const { error, artistId } = await resolveTargetId(new URL(req.url).searchParams);
  if (error) {
    return error === "unauthorized"
      ? unauthorized()
      : NextResponse.json({ ok: false, error: "no_profile" }, withNoStore({ status: 404 }));
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const touched = SELF_EDITABLE_FIELDS.filter((f) => f in body);
  if (touched.length === 0) {
    return NextResponse.json({ ok: false, error: "nothing_to_update" }, withNoStore({ status: 400 }));
  }

  const artist = await patchArtistProfile(artistId as string, body);
  if (!artist) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

  return NextResponse.json({ ok: true, artist, status: artistStatus(artist) }, withNoStore());
}
