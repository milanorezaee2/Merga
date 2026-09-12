import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/data/store";
import { enroll, enrollmentsFor } from "@/lib/data/enrollments";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Course enrolment — what unlocks non-preview lessons.
 *
 * GET  → the signed-in user's enrolments.
 * POST → { itemId }. Free items (`price === null`) enrol immediately. Paid items answer
 *        402 `payment_required`: checkout is not wired to this yet, and enrolling someone
 *        for free would be a lie about the price on the card.
 */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  return NextResponse.json({ ok: true, enrollments: await enrollmentsFor(session.id) }, withNoStore());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));

  const body = (await req.json().catch(() => null)) as { itemId?: string } | null;
  if (!body?.itemId) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const content = await getContent();
  const item = content.education.find((e) => e.id === body.itemId);
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

  if (item.price !== null) {
    return NextResponse.json(
      { ok: false, error: "payment_required", price: item.price },
      withNoStore({ status: 402 }),
    );
  }

  const enrollment = await enroll(session.id, item.id);
  return NextResponse.json({ ok: true, enrollment }, withNoStore());
}
