"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { SESSION_FETCH } from "@/lib/http";
import { cn, t } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

/** Row shape returned by GET /api/admin/review. */
interface SubmissionRow {
  kind: "pattern" | "product" | "portfolio" | "education";
  id: string;
  title: Localized;
  subtitle?: Localized;
  artistId: string | null;
  artistName: Localized | null;
  status: ContentStatus;
  submittedAt?: string;
  reviewNote?: string;
}

type Filter = "pending" | "approved" | "rejected" | "all";

const KIND_LABEL: Record<SubmissionRow["kind"], string> = {
  pattern: "Pattern",
  product: "Product",
  portfolio: "Portfolio work",
  education: "Course / lesson",
};

/**
 * Review queue for content an artist submitted. Approval is the only thing that makes a submission
 * appear on the public site — until then `getSite()` hides it.
 */
export function ContentReview({ locale }: { locale: "fa" | "en" }) {
  const [rows, setRows] = useState<SubmissionRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch(`/api/admin/review?status=${filter}`, { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`admin/review → ${r.status}`);
      const d = (await r.json()) as { ok: boolean; submissions: SubmissionRow[]; counts: Record<string, number> };
      setRows(d.submissions);
      setCounts(d.counts);
    } catch {
      setError(true);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (row: SubmissionRow, status: ContentStatus) => {
    setBusyId(row.id);
    try {
      const r = await fetch("/api/admin/review", {
        ...SESSION_FETCH,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: row.kind, id: row.id, status, note: notes[row.id] ?? "" }),
      });
      const d = (await r.json()) as { ok: boolean; counts?: Record<string, number> };
      if (!r.ok || !d.ok) throw new Error("review_failed");
      setRows((list) => (list ?? []).map((x) => (x.id === row.id ? { ...x, status } : x)));
      if (d.counts) setCounts(d.counts);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const pendingTotal = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-border bg-background-secondary/40 p-5">
        <h2 className="font-display text-h3">Content review</h2>
        <p className="mt-1 text-body-sm text-foreground-secondary">
          Every pattern, product, portfolio work and course an artist submits waits here. Nothing they send is
          published until you approve it; editing an approved item sends it back to this queue.
        </p>
        {counts && (
          <p className="mt-3 flex flex-wrap gap-2 text-caption">
            {(["pattern", "product", "portfolio", "education"] as const).map((k) => (
              <span key={k} className="rounded-full border border-border px-2.5 py-1">
                {KIND_LABEL[k]}: <b className="tabular">{counts[k] ?? 0}</b>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
              filter === f ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:text-foreground",
            )}
          >
            {f}
            {f === "pending" && pendingTotal > 0 ? ` (${pendingTotal})` : ""}
          </button>
        ))}
      </div>

      {error && !rows ? (
        <ErrorState message="Could not load the review queue." onRetry={() => void load()} />
      ) : !rows ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-foreground-secondary">
          No {filter === "all" ? "submissions" : `${filter} submissions`} — nothing to review.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`} className="rounded-xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-caption text-muted">
                    <Badge tone="neutral">{KIND_LABEL[row.kind]}</Badge>
                    <Badge tone={row.status === "approved" ? "success" : row.status === "rejected" ? "error" : "warning"}>
                      {row.status}
                    </Badge>
                    {row.submittedAt && <span className="tabular">{row.submittedAt.slice(0, 10)}</span>}
                  </p>
                  <h3 className="mt-2 font-display text-h4">
                    {t(row.title, locale === "fa" ? "fa" : "en") || t(row.title, "fa") || row.id}
                  </h3>
                  {row.subtitle && (
                    <p className="mt-1 line-clamp-2 text-body-sm text-foreground-secondary">
                      {t(row.subtitle, locale === "fa" ? "fa" : "en") || t(row.subtitle, "fa")}
                    </p>
                  )}
                  <p className="mt-1 text-caption text-muted">
                    by {row.artistName ? t(row.artistName, locale === "fa" ? "fa" : "en") || row.artistId : row.artistId ?? "unknown"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === row.id || row.status === "approved"} onClick={() => void decide(row, "approved")}>
                    <Check className="h-4 w-4" />Approve
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === row.id || row.status === "rejected"} onClick={() => void decide(row, "rejected")}>
                    <X className="h-4 w-4" />Reject
                  </Button>
                </div>
              </div>

              <label className="mt-4 flex items-start gap-2 text-caption text-muted">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                <input
                  value={notes[row.id] ?? row.reviewNote ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                  placeholder="Note for the artist (optional) — sent with the decision"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
