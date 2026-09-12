import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { CONTENT_STATUSES, listSubmissions, pendingCounts, reviewSubmission, type SubmissionKind } from "@/lib/data/moderation";
import type { ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Admin review queue for artist-submitted content.
 *
 * GET returns every submission that carries a `status` (atelier content has none, so it never shows
 * up here); PATCH is the only way a submission becomes visible on the public site.
 */

async function requireAdmin() {
  const user = await getSession();
  return user?.role === "admin" ? user : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/** GET /api/admin/review?status=pending|approved|rejected|all */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return unauthorized();
  const requested = new URL(req.url).searchParams.get("status") ?? "pending";
  const status = requested === "all" || CONTENT_STATUSES.includes(requested as ContentStatus) ? requested : "pending";
  const [submissions, counts] = await Promise.all([
    listSubmissions(status as ContentStatus | "all"),
    pendingCounts(),
  ]);
  return NextResponse.json({ ok: true, status, submissions, counts }, withNoStore());
}

/** PATCH /api/admin/review — { kind, id, status, note? } */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const body = (await req.json().catch(() => null)) as
    | { kind?: SubmissionKind; id?: string; status?: string; note?: string }
    | null;
  const kind = body?.kind;
  if (!body?.id || !kind || !["pattern", "product", "portfolio", "education"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const status = body.status as ContentStatus;
  if (!CONTENT_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, withNoStore({ status: 400 }));
  }

  try {
    const submission = await reviewSubmission(kind, body.id, status, typeof body.note === "string" ? body.note.trim() || undefined : undefined);
    if (!submission) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
    return NextResponse.json({ ok: true, submission, counts: await pendingCounts() }, withNoStore());
  } catch (e) {
    console.error("[admin/review] storage write failed:", e);
    return NextResponse.json({ ok: false, error: "storage_write_failed" }, withNoStore({ status: 502 }));
  }
}
