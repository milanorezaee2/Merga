import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllCourseOrders, setCourseOrderStatus, type CourseOrderStatus } from "@/lib/data/courseOrders";
import { enroll } from "@/lib/data/enrollments";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Admin order desk.
 *
 * Marking an order `paid` is the moment the buyer gets access — it creates the enrolment. Nothing
 * in this app talks to a bank, so this decision is a human one: the admin confirms the transfer
 * arrived and records it here. `rejected` closes the order without granting anything.
 */

async function requireAdmin() {
  const user = await getSession();
  return user?.role === "admin" ? user : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/** GET /api/admin/orders?status=awaiting_payment|paid|rejected|all */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return unauthorized();
  const requested = new URL(req.url).searchParams.get("status") ?? "awaiting_payment";
  const status = ["awaiting_payment", "paid", "rejected", "all"].includes(requested) ? requested : "awaiting_payment";
  const all = await getAllCourseOrders();
  const orders = (status === "all" ? all : all.filter((o) => o.status === status)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const counts = {
    awaiting_payment: all.filter((o) => o.status === "awaiting_payment").length,
    paid: all.filter((o) => o.status === "paid").length,
    rejected: all.filter((o) => o.status === "rejected").length,
  };
  return NextResponse.json({ ok: true, status, orders, counts }, withNoStore());
}

/** PATCH /api/admin/orders — { id, status: "paid" | "rejected", note? } */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const body = (await req.json().catch(() => null)) as { id?: string; status?: CourseOrderStatus; note?: string } | null;
  if (!body?.id || !["paid", "rejected"].includes(body.status ?? "")) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || undefined : undefined;

  try {
    const existing = (await getAllCourseOrders()).find((o) => o.id === body.id);
    if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));

    if (body.status === "paid") {
      // The enrolment is the access grant; record its id on the order so the two stay linked.
      const enrollment = await enroll(existing.userId, existing.itemId);
      const order = await setCourseOrderStatus(existing.id, "paid", { adminNote: note, enrollmentId: enrollment.id });
      return NextResponse.json({ ok: true, order, enrolled: true }, withNoStore());
    }

    const order = await setCourseOrderStatus(existing.id, "rejected", { adminNote: note });
    return NextResponse.json({ ok: true, order, enrolled: false }, withNoStore());
  } catch (e) {
    console.error("[admin/orders] storage write failed:", e);
    return NextResponse.json({ ok: false, error: "storage_write_failed" }, withNoStore({ status: 502 }));
  }
}
