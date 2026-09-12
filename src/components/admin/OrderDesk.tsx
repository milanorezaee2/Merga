"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { SESSION_FETCH } from "@/lib/http";
import { cn, t } from "@/lib/utils";
import type { Localized } from "@/lib/i18n/types";

interface OrderRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemTitle: Localized;
  amount: { fa: number; en: number };
  status: "awaiting_payment" | "paid" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  note?: string;
  adminNote?: string;
  enrollmentId?: string;
}

type Filter = "awaiting_payment" | "paid" | "rejected" | "all";

const TONE = { awaiting_payment: "warning", paid: "success", rejected: "error" } as const;

/**
 * Manual-payment order desk.
 *
 * There is no payment gateway in this app, so an order is settled by a person: the learner pays
 * out-of-band, the admin confirms the money arrived and marks it paid — which is what enrols them.
 * Nothing on this screen fakes a transaction.
 */
export function OrderDesk({ locale }: { locale: "fa" | "en" }) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("awaiting_payment");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch(`/api/admin/orders?status=${filter}`, { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`admin/orders → ${r.status}`);
      const d = (await r.json()) as { ok: boolean; orders: OrderRow[]; counts: Record<string, number> };
      setRows(d.orders);
      setCounts(d.counts);
    } catch {
      setError(true);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (row: OrderRow, status: "paid" | "rejected") => {
    setBusyId(row.id);
    try {
      const r = await fetch("/api/admin/orders", {
        ...SESSION_FETCH,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id, status, note: notes[row.id] ?? "" }),
      });
      const d = (await r.json()) as { ok: boolean; order?: OrderRow };
      if (!r.ok || !d.ok) throw new Error("order_failed");
      setRows((list) => (list ?? []).map((x) => (x.id === row.id ? (d.order ?? { ...x, status }) : x)));
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5" dir="ltr">
      <div className="rounded-xl border border-border bg-background-secondary/40 p-5">
        <h2 className="font-display text-h3">Orders</h2>
        <p className="mt-1 text-body-sm text-foreground-secondary">
          Paid courses are bought out-of-band: the learner registers an order and transfers the money,
          then you confirm it here. Marking an order <b>paid</b> is what enrols them — there is no
          payment gateway in this app, so nothing is settled automatically.
        </p>
        {counts && (
          <p className="mt-3 flex flex-wrap gap-2 text-caption">
            {(["awaiting_payment", "paid", "rejected"] as const).map((k) => (
              <span key={k} className="rounded-full border border-border px-2.5 py-1">
                {k}: <b className="tabular">{counts[k] ?? 0}</b>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["awaiting_payment", "paid", "rejected", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === f ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:text-foreground",
            )}
          >
            {f.replace("_", " ")}
            {f === "awaiting_payment" && (counts?.awaiting_payment ?? 0) > 0 ? ` (${counts?.awaiting_payment})` : ""}
          </button>
        ))}
      </div>

      {error && !rows ? (
        <ErrorState message="Could not load the orders." onRetry={() => void load()} />
      ) : !rows ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-foreground-secondary">
          No {filter === "all" ? "orders" : filter.replace("_", " ") + " orders"}.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-caption text-muted">
                    <Badge tone={TONE[row.status]}>{row.status.replace("_", " ")}</Badge>
                    <span className="tabular">{row.createdAt.slice(0, 10)}</span>
                    <span dir="ltr">{row.id}</span>
                  </p>
                  <h3 className="mt-2 font-display text-h4">
                    {t(row.itemTitle, locale === "fa" ? "fa" : "en") || t(row.itemTitle, "fa")}
                  </h3>
                  <p className="mt-1 text-body-sm text-foreground-secondary">
                    {row.userName || row.userEmail} · <span dir="ltr">{row.userEmail}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    <b className="tabular">{row.amount.fa.toLocaleString("en-US")}</b> Toman ·{" "}
                    <b className="tabular">${row.amount.en}</b>
                  </p>
                  {row.note && (
                    <p className="mt-2 rounded-md bg-background-secondary/60 px-3 py-2 text-caption text-foreground-secondary">
                      Learner note: {row.note}
                    </p>
                  )}
                  {row.adminNote && (
                    <p className="mt-2 text-caption text-muted">Your note: {row.adminNote}</p>
                  )}
                  {row.enrollmentId && (
                    <p className="mt-1 text-caption text-muted" dir="ltr">enrolment: {row.enrollmentId}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === row.id || row.status === "paid"} onClick={() => void decide(row, "paid")}>
                    <Check className="h-4 w-4" />Mark paid
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === row.id || row.status === "rejected"} onClick={() => void decide(row, "rejected")}>
                    <X className="h-4 w-4" />Reject
                  </Button>
                </div>
              </div>

              {row.status === "awaiting_payment" && (
                <input
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                  placeholder="Note for the learner (payment reference or reason)"
                  className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
