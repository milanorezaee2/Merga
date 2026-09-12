import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Course purchase orders — the manual-payment path for paid academy items.
 *
 * Kept apart from `./orders` (the shop's product orders) on purpose: a course order carries no
 * lines, no address and no shipping, and settling it grants *access* rather than a parcel.
 *
 * There is no payment gateway wired up (the gateway and the hosting are both undecided), so a paid
 * course is bought the way small studios actually do it: the learner registers an order, pays
 * out-of-band, and an admin marks it paid — which is the only thing that creates an enrolment.
 * Nothing here pretends a transfer happened.
 *
 * Same dual-backend shape as the user/enrolment stores: Upstash Redis when configured, otherwise
 * `data/course-orders.json` (git-ignored; read-only on serverless, so set Redis before deploying).
 */

export type CourseOrderStatus = "awaiting_payment" | "paid" | "rejected";

export interface CourseOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  /** EducationItem id. */
  itemId: string;
  itemTitle: { fa: string; en: string };
  /** The price as it was when the order was placed — the admin approves *this* amount. */
  amount: { fa: number; en: number };
  status: CourseOrderStatus;
  createdAt: string;
  reviewedAt?: string;
  /** Note from the learner (payment reference) or the admin (rejection reason). */
  note?: string;
  adminNote?: string;
  enrollmentId?: string;
}

const KEY = "rosie-atelier:course-orders";
const FILE_PATH = path.join(process.cwd(), "data", "course-orders.json");

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

export async function getAllCourseOrders(): Promise<CourseOrder[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", KEY]);
      return typeof result === "string" ? (JSON.parse(result) as CourseOrder[]) : [];
    }
    return JSON.parse(await fs.readFile(FILE_PATH, "utf8")) as CourseOrder[];
  } catch {
    return [];
  }
}

async function saveAll(rows: CourseOrder[]) {
  if (redisEnabled()) {
    await redisCmd(["SET", KEY, JSON.stringify(rows)]);
    return;
  }
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

export async function courseOrdersFor(userId: string): Promise<CourseOrder[]> {
  return (await getAllCourseOrders()).filter((o) => o.userId === userId);
}

/** The open order for this user + item, if any. */
export async function openCourseOrderFor(userId: string, itemId: string): Promise<CourseOrder | null> {
  return (await courseOrdersFor(userId)).find((o) => o.itemId === itemId && o.status === "awaiting_payment") ?? null;
}

/** Idempotent: a second order for the same open item returns the existing one. */
export async function createCourseOrder(input: Omit<CourseOrder, "id" | "status" | "createdAt">): Promise<CourseOrder> {
  const rows = await getAllCourseOrders();
  const existing = rows.find((o) => o.userId === input.userId && o.itemId === input.itemId && o.status === "awaiting_payment");
  if (existing) return existing;
  const row: CourseOrder = { ...input, id: `ord-${crypto.randomBytes(6).toString("hex")}`, status: "awaiting_payment", createdAt: new Date().toISOString() };
  await saveAll([...rows, row]);
  return row;
}

export async function setCourseOrderStatus(
  id: string,
  status: CourseOrderStatus,
  patch: Partial<CourseOrder> = {},
): Promise<CourseOrder | null> {
  const rows = await getAllCourseOrders();
  const idx = rows.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const next: CourseOrder = { ...rows[idx], ...patch, status, reviewedAt: new Date().toISOString() };
  await saveAll(rows.map((o, i) => (i === idx ? next : o)));
  return next;
}
