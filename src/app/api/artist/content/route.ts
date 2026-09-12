import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { getContent, saveContent } from "@/lib/data/store";
import { withContentLock } from "@/lib/data/lock";
import { canEditSubmission, contentStatus, submissionStamp, type SubmissionKind } from "@/lib/data/moderation";
import { withNoStore } from "@/lib/http";
import { slugify } from "@/lib/utils";
import type { EducationItem, EducationType, Difficulty, Portfolio, SiteContent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Self-service for the content an artist submits: portfolio works and education items.
 *
 * Rules that hold on every write here:
 *  - a record is always created *pending*, so it cannot reach the public site before an admin sees it;
 *  - editing your own record sends it back to pending (an approved item cannot be quietly swapped);
 *  - ownership is derived from the session, never from the request body — `artistId`/`authorId`,
 *    `status`, `featured`, `popular` and `id` are not writable by the submitter.
 */

const KINDS: SubmissionKind[] = ["portfolio", "education"];

async function requireArtist() {
  const s = await getSession();
  if (!s || (s.role !== "artist" && s.role !== "admin")) return null;
  return s;
}

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, withNoStore({ status }));
}

const unauthorized = () => bad(401, "unauthorized");

type Loc = { fa?: string; en?: string };

/** Localized text from loose input; always returns both keys. */
function loc(v: unknown): { fa: string; en: string } {
  const o = (v ?? {}) as Loc;
  return { fa: String(o.fa ?? "").trim(), en: String(o.en ?? "").trim() };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function uniqueSlug(base: string, taken: Set<string>): string {
  const clean = slugify(base).slice(0, 64) || `item-${crypto.randomBytes(3).toString("hex")}`;
  let slug = clean;
  for (let i = 2; taken.has(slug); i += 1) slug = `${clean}-${i}`;
  return slug;
}

/** GET /api/artist/content?kind=portfolio|education — my submissions, with their moderation state. */
export async function GET(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const kind = new URL(req.url).searchParams.get("kind") as SubmissionKind | null;
  const content = await getContent();
  const mine = session.role === "admin";

  const portfolios = content.portfolios
    .filter((p) => mine || p.artistId === session.artistId)
    .map((p) => ({ id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle, cover: p.cover, year: p.year, isProject: p.isProject, status: contentStatus(p), submittedAt: p.submittedAt, reviewNote: p.reviewNote }));

  const education = content.education
    .filter((e) => mine || e.authorId === session.artistId)
    .map((e) => ({ id: e.id, slug: e.slug, type: e.type, title: e.title, excerpt: e.excerpt, image: e.image, price: e.price, difficulty: e.difficulty, durationMin: e.durationMin, lessons: e.lessons, status: contentStatus(e), submittedAt: e.submittedAt, reviewNote: e.reviewNote }));

  // The taxonomy is public information; the form needs it to file a submission correctly.
  const categories = content.categories.map((c) => ({ id: c.id, name: c.name }));
  return NextResponse.json({ ok: true, kind, portfolios, education, categories }, withNoStore());
}

/** POST /api/artist/content — submit a new work or course. Always lands as `pending`. */
export async function POST(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();
  if (!session.artistId && session.role !== "admin") return bad(404, "no_profile");

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !KINDS.includes(body.kind as SubmissionKind)) return bad(400, "invalid_kind");

  const owner = session.role === "admin" ? ((body.artistId as string) ?? session.artistId ?? null) : (session.artistId as string);
  const title = loc(body.title);
  if (!title.fa && !title.en) return bad(400, "title_required");

  return withContentLock(async () => {
    const content = await getContent();
    const stamp = submissionStamp();

    if (body.kind === "education") {
      const type = (body.type as EducationType) ?? "course";
      if (!["course", "tutorial", "article", "path"].includes(type)) return bad(400, "invalid_type");
      const difficulty = (body.difficulty as Difficulty) ?? "beginner";
      if (!["beginner", "intermediate", "advanced"].includes(difficulty)) return bad(400, "invalid_difficulty");
      const slug = uniqueSlug(title.en || title.fa, new Set(content.education.map((e) => e.slug)));
      const item: EducationItem = {
        id: `edu-${crypto.randomBytes(6).toString("hex")}`,
        slug,
        type,
        title,
        excerpt: loc(body.excerpt),
        body: loc(body.body),
        image: String(body.image ?? "").trim() || "/images/collections/s01.jpg",
        authorId: owner,
        difficulty,
        durationMin: Math.max(0, num(body.durationMin, 0)),
        lessons: Math.max(0, num(body.lessons, 0)),
        categoryId: String(body.categoryId ?? content.categories[0]?.id ?? ""),
        patternIds: [],
        productIds: [],
        featured: false,
        popular: false,
        publishedAt: stamp.submittedAt.slice(0, 10),
        price: body.price === null || body.price === undefined ? null : { fa: num((body.price as { fa?: number })?.fa, 0), en: num((body.price as { en?: number })?.en, 0) },
        ...stamp,
      };
      const education = [...content.education, item];
      await saveContent({ ...content, education } as SiteContent);
      return NextResponse.json({ ok: true, kind: "education", item }, withNoStore());
    }

    const slug = uniqueSlug(title.en || title.fa, new Set(content.portfolios.map((p) => p.slug)));
    const intro = loc(body.intro);
    const work: Portfolio = {
      id: `pf-${crypto.randomBytes(6).toString("hex")}`,
      slug,
      title,
      subtitle: loc(body.subtitle),
      intro,
      story: intro.fa || intro.en ? [{ type: "text", text: intro }] : [],
      cover: String(body.cover ?? "").trim() || "/images/collections/s01.jpg",
      gallery: Array.isArray(body.gallery) ? (body.gallery as string[]).filter((g) => typeof g === "string" && g) : [],
      artistId: owner,
      patternIds: [],
      productIds: [],
      client: loc(body.client),
      location: loc(body.location),
      year: num(body.year, new Date().getFullYear()),
      scope: loc(body.scope),
      categoryId: String(body.categoryId ?? content.categories[0]?.id ?? ""),
      featured: false,
      isProject: body.isProject !== false,
      size: (body.size as Portfolio["size"]) ?? "square",
      ...stamp,
    };
    const portfolios = [...content.portfolios, work];
    await saveContent({ ...content, portfolios } as SiteContent);
    return NextResponse.json({ ok: true, kind: "portfolio", item: work }, withNoStore());
  });
}

/** PUT /api/artist/content — edit your own submission; it goes back to `pending`. */
export async function PUT(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.id || !KINDS.includes(body.kind as SubmissionKind)) return bad(400, "invalid_payload");

  const kind = body.kind as SubmissionKind;
  const id = String(body.id);

  return withContentLock(async () => {
    const content = await getContent();
    const stamp = submissionStamp();

    if (kind === "education") {
      const idx = content.education.findIndex((e) => e.id === id);
      const existing = content.education[idx];
      if (!existing) return bad(404, "not_found");
      if (!canEditSubmission(session, existing, kind)) return unauthorized();
      const merged: EducationItem = {
        ...existing,
        title: body.title ? loc(body.title) : existing.title,
        excerpt: body.excerpt ? loc(body.excerpt) : existing.excerpt,
        body: body.body ? loc(body.body) : existing.body,
        image: body.image !== undefined ? String(body.image).trim() || existing.image : existing.image,
        difficulty: (body.difficulty as Difficulty) ?? existing.difficulty,
        durationMin: body.durationMin !== undefined ? Math.max(0, num(body.durationMin, 0)) : existing.durationMin,
        lessons: body.lessons !== undefined ? Math.max(0, num(body.lessons, 0)) : existing.lessons,
        price: body.price === null || body.price === undefined ? existing.price : { fa: num((body.price as { fa?: number })?.fa, 0), en: num((body.price as { en?: number })?.en, 0) },
        // Ownership and promotion flags stay with the admin; edits need a fresh review.
        authorId: existing.authorId,
        featured: existing.featured,
        popular: existing.popular,
        id: existing.id,
        slug: existing.slug,
        ...stamp,
        reviewNote: undefined,
      };
      const education = content.education.map((e, i) => (i === idx ? merged : e));
      await saveContent({ ...content, education } as SiteContent);
      return NextResponse.json({ ok: true, kind, item: merged }, withNoStore());
    }

    const idx = content.portfolios.findIndex((p) => p.id === id);
    const existing = content.portfolios[idx];
    if (!existing) return bad(404, "not_found");
    if (!canEditSubmission(session, existing, kind)) return unauthorized();
    const merged: Portfolio = {
      ...existing,
      title: body.title ? loc(body.title) : existing.title,
      subtitle: body.subtitle ? loc(body.subtitle) : existing.subtitle,
      intro: body.intro ? loc(body.intro) : existing.intro,
      cover: body.cover !== undefined ? String(body.cover).trim() || existing.cover : existing.cover,
      gallery: Array.isArray(body.gallery) ? (body.gallery as string[]).filter((g) => typeof g === "string" && g) : existing.gallery,
      client: body.client ? loc(body.client) : existing.client,
      location: body.location ? loc(body.location) : existing.location,
      year: body.year !== undefined ? num(body.year, existing.year) : existing.year,
      scope: body.scope ? loc(body.scope) : existing.scope,
      artistId: existing.artistId,
      featured: existing.featured,
      id: existing.id,
      slug: existing.slug,
      ...stamp,
      reviewNote: undefined,
    };
    const portfolios = content.portfolios.map((p, i) => (i === idx ? merged : p));
    await saveContent({ ...content, portfolios } as SiteContent);
    return NextResponse.json({ ok: true, kind, item: merged }, withNoStore());
  });
}

/** DELETE /api/artist/content?id=…&kind=… — withdraw your own submission. */
export async function DELETE(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const kind = (searchParams.get("kind") ?? "portfolio") as SubmissionKind;
  if (!id || !KINDS.includes(kind)) return bad(400, "invalid_payload");

  return withContentLock(async () => {
    const content = await getContent();
    if (kind === "education") {
      const existing = content.education.find((e) => e.id === id);
      if (!existing) return bad(404, "not_found");
      if (!canEditSubmission(session, existing, kind)) return unauthorized();
      await saveContent({ ...content, education: content.education.filter((e) => e.id !== id) } as SiteContent);
      return NextResponse.json({ ok: true }, withNoStore());
    }
    const existing = content.portfolios.find((p) => p.id === id);
    if (!existing) return bad(404, "not_found");
    if (!canEditSubmission(session, existing, kind)) return unauthorized();
    await saveContent({ ...content, portfolios: content.portfolios.filter((p) => p.id !== id) } as SiteContent);
    return NextResponse.json({ ok: true }, withNoStore());
  });
}
