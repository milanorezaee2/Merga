import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistStatus, listArtistsWithAccounts, setArtistStatus } from "@/lib/data/artists";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Artist moderation — admin only.
 *
 * GET   → every profile (pending first) with the owning account and content counts.
 * PATCH → { id, status: "approved" | "rejected", note? } records the decision.
 */

async function requireAdmin() {
  const user = await getSession();
  return user?.role === "admin" ? user : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  const artists = await listArtistsWithAccounts();
  const rank = { pending: 0, rejected: 1, approved: 2 } as const;
  const sorted = [...artists].sort(
    (a, b) => rank[artistStatus(a)] - rank[artistStatus(b)] || (b.joinedAt ?? "").localeCompare(a.joinedAt ?? ""),
  );

  return NextResponse.json(
    {
      ok: true,
      artists: sorted,
      counts: {
        total: artists.length,
        pending: artists.filter((a) => artistStatus(a) === "pending").length,
        approved: artists.filter((a) => artistStatus(a) === "approved").length,
        rejected: artists.filter((a) => artistStatus(a) === "rejected").length,
      },
    },
    withNoStore(),
  );
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const body = (await req.json().catch(() => null)) as { id?: string; status?: string; note?: string } | null;
  if (!body?.id || (body.status !== "approved" && body.status !== "rejected")) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const artist = await setArtistStatus(body.id, body.status, body.note);
  if (!artist) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

  return NextResponse.json({ ok: true, artist }, withNoStore());
}
