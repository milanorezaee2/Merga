import { getContent, saveContent } from "@/lib/data/store";
import { withContentLock } from "@/lib/data/lock";
import type { ContentStatus, EducationItem, Pattern, Portfolio, Product, SiteContent } from "@/lib/types";

/**
 * Moderation of artist-submitted content.
 *
 * Everything an artist creates starts as `pending` and is invisible on the public site
 * (`filterLiveContent` drops it) until an admin approves it. Atelier-owned content — the seed data and
 * anything without an `artistId`/`authorId` — has no `status` at all, which reads as approved, so the
 * review queue only ever contains things a human actually submitted.
 */

export type SubmissionKind = "pattern" | "product" | "portfolio" | "education";

export interface Submission {
  kind: SubmissionKind;
  id: string;
  title: { fa: string; en: string };
  subtitle?: { fa: string; en: string };
  artistId: string | null;
  artistName: { fa: string; en: string } | null;
  status: ContentStatus;
  submittedAt?: string;
  reviewNote?: string;
}

export const CONTENT_STATUSES: ContentStatus[] = ["pending", "approved", "rejected"];

/** Absent `status` means approved: seed/atelier content predates the field. */
export function contentStatus(x: { status?: ContentStatus } | undefined | null): ContentStatus {
  return x?.status ?? "approved";
}

export function isContentLive(x: { status?: ContentStatus } | undefined | null): boolean {
  return contentStatus(x) === "approved";
}

const COLLECTIONS: Record<SubmissionKind, keyof SiteContent> = {
  pattern: "patterns",
  product: "products",
  portfolio: "portfolios",
  education: "education",
};

type Owned = { id: string; title: { fa: string; en: string }; artistId?: string | null; authorId?: string; status?: ContentStatus; submittedAt?: string; reviewNote?: string; subtitle?: { fa: string; en: string }; excerpt?: { fa: string; en: string } };

function ownerOf(item: Owned, kind: SubmissionKind): string | null {
  return (kind === "education" ? item.authorId : item.artistId) ?? null;
}

/** Every artist submission in the document, newest first. */
export async function listSubmissions(filter: ContentStatus | "all" = "pending"): Promise<Submission[]> {
  const content = await getContent();
  const out: Submission[] = [];
  for (const kind of Object.keys(COLLECTIONS) as SubmissionKind[]) {
    const items = (content[COLLECTIONS[kind]] as Owned[]) ?? [];
    for (const item of items) {
      // Items with no status were never submitted by anyone — they are atelier content.
      if (!item.status) continue;
      if (filter !== "all" && item.status !== filter) continue;
      const artistId = ownerOf(item, kind);
      const artist = artistId ? (content.artists.find((a) => a.id === artistId) ?? null) : null;
      out.push({
        kind,
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? item.excerpt,
        artistId,
        artistName: artist ? artist.name : null,
        status: item.status,
        submittedAt: item.submittedAt,
        reviewNote: item.reviewNote,
      });
    }
  }
  out.sort((a, b) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
  return out;
}

/** Approve or reject one submission. Returns the updated record, or null when it does not exist. */
export async function reviewSubmission(
  kind: SubmissionKind,
  id: string,
  status: ContentStatus,
  reviewNote?: string,
): Promise<Submission | null> {
  if (!CONTENT_STATUSES.includes(status)) return null;
  return withContentLock(async () => {
    const content = await getContent();
    const key = COLLECTIONS[kind];
    const items = content[key] as unknown as Owned[];
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const next: Owned = { ...items[idx], status, reviewNote: reviewNote ?? items[idx].reviewNote };
    const patched = items.map((i, n) => (n === idx ? next : i));
    await saveContent({ ...content, [key]: patched } as SiteContent);

    const artistId = ownerOf(next, kind);
    const artist = artistId ? (content.artists.find((a) => a.id === artistId) ?? null) : null;
    return {
      kind,
      id,
      title: next.title,
      artistId,
      artistName: artist ? artist.name : null,
      status,
      submittedAt: next.submittedAt,
      reviewNote: next.reviewNote,
    };
  });
}

/**
 * Count of pending submissions per kind, for the admin badge.
 */
export async function pendingCounts(): Promise<Record<SubmissionKind, number>> {
  const content = await getContent();
  const out = { pattern: 0, product: 0, portfolio: 0, education: 0 } as Record<SubmissionKind, number>;
  for (const kind of Object.keys(COLLECTIONS) as SubmissionKind[]) {
    const items = (content[COLLECTIONS[kind]] as Owned[]) ?? [];
    out[kind] = items.filter((i) => i.status === "pending").length;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Creating artist submissions                                         */
/* ------------------------------------------------------------------ */

export function submissionStamp() {
  return { status: "pending" as ContentStatus, submittedAt: new Date().toISOString() };
}

/** True when this session user owns the record (admins own everything). */
export function canEditSubmission(
  session: { role: string; artistId?: string | null },
  item: { artistId?: string | null; authorId?: string } | undefined,
  kind: SubmissionKind,
): boolean {
  if (!item) return false;
  if (session.role === "admin") return true;
  const owner = kind === "education" ? item.authorId : item.artistId;
  return Boolean(session.artistId) && owner === session.artistId;
}

export type { EducationItem, Pattern, Portfolio, Product };
