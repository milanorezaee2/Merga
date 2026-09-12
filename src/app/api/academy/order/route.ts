import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/data/store";
import { createCourseOrder, openCourseOrderFor, courseOrdersFor } from "@/lib/data/courseOrders";
import { isEnrolled } from "@/lib/data/enrollments";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Purchase orders for paid courses.
 *
 * POST registers an order; it does not pay anything and it does not enrol anybody. An admin marks
 * it paid in /admin → Orders, and *that* is what unlocks the lessons. Registering twice returns the
 * same open order instead of piling up duplicates.
 */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  return NextResponse.json({ ok: true, orders: await courseOrdersFor(session.id) }, withNoStore());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));

  const body = (await req.json().catch(() => null)) as { itemId?: string; note?: string } | null;
  if (!body?.itemId) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const content = await getContent();
  const item = content.education.find((e) => e.id === body.itemId);
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

  if (item.price === null || item.price === undefined) {
    return NextResponse.json({ ok: false, error: "item_is_free" }, withNoStore({ status: 400 }));
  }
  if (await isEnrolled(session.id, item.id)) {
    return NextResponse.json({ ok: false, error: "already_enrolled" }, withNoStore({ status: 409 }));
  }
  if (await openCourseOrderFor(session.id, item.id)) {
    return NextResponse.json({ ok: false, error: "order_already_open" }, withNoStore({ status: 409 }));
  }

  const order = await createCourseOrder({
    userId: session.id,
    userEmail: session.email ?? "",
    userName: session.name ?? "",
    itemId: item.id,
    itemTitle: item.title,
    amount: item.price,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 300) || undefined : undefined,
  });

  return NextResponse.json({ ok: true, order }, withNoStore());
}
