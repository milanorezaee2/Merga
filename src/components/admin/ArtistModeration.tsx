"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { SESSION_FETCH } from "@/lib/http";
import { cn, href } from "@/lib/utils";
import type { ArtistStatus } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

/** Row shape returned by GET /api/admin/artists. */
interface ArtistRow {
  id: string;
  slug: string;
  name: Localized;
  profession: Localized;
  avatar: string;
  email?: string;
  phone?: string;
  joinedAt?: string;
  status?: ArtistStatus;
  account: { id: string; email: string; createdAt: string } | null;
  counts: { patterns: number; products: number; portfolios: number; education: number };
}

type Filter = "pending" | "approved" | "rejected" | "all";

/**
 * Moderation queue for self-registered artists. Approval is what makes a profile (and everything
 * that points at it) appear on the public site.
 */
export function ArtistModeration({ locale }: { locale: "fa" | "en" }) {
  const [rows, setRows] = useState<ArtistRow[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch("/api/admin/artists", { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`admin/artists → ${r.status}`);
      const d = (await r.json()) as { ok: boolean; artists: ArtistRow[] };
      setRows(d.artists);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/artists", {
        ...SESSION_FETCH,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) throw new Error(`admin/artists PATCH → ${r.status}`);
      setRows((prev) => (prev ? prev.map((a) => (a.id === id ? { ...a, status } : a)) : prev));
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message="Could not reach the moderation API." onRetry={() => void load()} />;
  if (!rows) return <div className="space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

  const counts = {
    pending: rows.filter((r) => (r.status ?? "approved") === "pending").length,
    approved: rows.filter((r) => (r.status ?? "approved") === "approved").length,
    rejected: rows.filter((r) => (r.status ?? "approved") === "rejected").length,
  };
  const visible = filter === "all" ? rows : rows.filter((r) => (r.status ?? "approved") === filter);

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "pending", label: "Pending", n: counts.pending },
    { id: "approved", label: "Approved", n: counts.approved },
    { id: "rejected", label: "Rejected", n: counts.rejected },
    { id: "all", label: "All", n: rows.length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-h3">Artist requests</h2>
        <p className="mt-1 text-caption text-muted">
          A pending profile is hidden from the whole public site — listing, sitemap, search and
          related items — until it is approved here.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-caption transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
            )}
          >
            {f.label} <span className="tabular">{f.n}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
          Nothing in this list.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => {
            const status = a.status ?? "approved";
            return (
              <li key={a.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-background-secondary">
                    <Image src={a.avatar} alt="" fill sizes="56px" className="object-cover" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.name.en || a.name.fa}</p>
                      {a.name.fa && a.name.en ? <span className="text-caption text-muted">· {a.name.fa}</span> : null}
                      <Badge tone={status === "approved" ? "success" : status === "pending" ? "warning" : "error"}>
                        {status}
                      </Badge>
                    </div>
                    <p className="text-caption text-muted">
                      /{a.slug}
                      {a.profession.en || a.profession.fa ? ` · ${a.profession.en || a.profession.fa}` : ""}
                      {a.joinedAt ? ` · joined ${new Date(a.joinedAt).toLocaleDateString()}` : ""}
                    </p>
                    <p className="mt-1 text-caption text-foreground-secondary" dir="ltr">
                      {a.account?.email ?? a.email ?? "no linked account"}
                      {a.phone ? ` · ${a.phone}` : ""}
                    </p>
                    <p className="mt-1 text-caption tabular text-muted">
                      {a.counts.patterns} patterns · {a.counts.products} products ·{" "}
                      {a.counts.portfolios} projects · {a.counts.education} lessons
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {status !== "approved" && (
                      <Button size="sm" onClick={() => void decide(a.id, "approved")} disabled={busyId === a.id}>
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                    {status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void decide(a.id, "rejected")}
                        disabled={busyId === a.id}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    )}
                    {status === "approved" && (
                      <Link
                        href={href(locale, `/artists/${a.slug}`)}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground"
                        aria-label="View public profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
