import "server-only";
import crypto from "crypto";
import { getContent, saveContent } from "./store";
import { getAllUsers, type StoredUser } from "./users";
import { slugify } from "../utils";
import type { Artist, ArtistStatus, SiteContent } from "../types";

/**
 * Artist profiles with admin moderation.
 *
 * A self-registered artist gets a `status: "pending"` record. Everything the public site reads goes
 * through `getSite()`, which drops non-approved artists *and* the content that points at them, so a
 * pending profile is invisible everywhere (listing, sitemap, search index, related items) until an
 * admin approves it. Admin screens read `getContent()` directly and therefore see every record.
 */

/** Legacy records have no `status` — they predate moderation and are treated as approved. */
export function artistStatus(a: Artist): ArtistStatus {
  return a.status ?? "approved";
}

export function isArtistLive(a: Artist): boolean {
  return artistStatus(a) === "approved";
}

/** Placeholder shown until the artist uploads their own portrait. */
export const PLACEHOLDER_ARTIST_IMAGE = "/images/collections/s01.jpg";

/** Fields an artist may change on their own profile. Everything else is admin-only. */
export const SELF_EDITABLE_FIELDS = [
  "name",
  "profession",
  "bio",
  "location",
  "social",
  "avatar",
  "cover",
  "email",
  "phone",
] as const;

export type ArtistProfilePatch = Partial<Pick<Artist, (typeof SELF_EDITABLE_FIELDS)[number]>>;

/** Artist row plus the account that owns it — what the moderation queue renders. */
export interface ArtistWithAccount extends Artist {
  account: Pick<StoredUser, "id" | "email" | "createdAt"> | null;
  counts: { patterns: number; products: number; portfolios: number; education: number };
}

/* ------------------------------------------------------------------ */
/* In-process write serialisation                                      */
/* ------------------------------------------------------------------ */

/**
 * The content store is a single JSON document, so two concurrent read-modify-write cycles would
 * otherwise clobber each other (last write wins). Chaining the writes through one promise keeps
 * them ordered inside a single Node process. This is *not* a cross-instance lock: with several
 * serverless instances, or once more than one person writes at a time, move the store to a real
 * database (or add optimistic versioning) — see README → Storage.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export function withContentLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

/* ------------------------------------------------------------------ */
/* Public-site filtering                                               */
/* ------------------------------------------------------------------ */

/**
 * Strip everything that belongs to a non-approved artist. Used by `getSite()` only —
 * admin endpoints keep seeing the full document.
 *
 * Content with no owner (`artistId == null`) is the atelier's own and is always kept.
 */
export function filterLiveContent(content: SiteContent): SiteContent {
  if (content.artists.every(isArtistLive)) return content;

  const artists = content.artists.filter(isArtistLive);
  const live = new Set(artists.map((a) => a.id));
  const owned = (ownerId: string | null | undefined) => !ownerId || live.has(ownerId);

  return {
    ...content,
    artists,
    patterns: content.patterns.filter((p) => owned(p.artistId)),
    products: content.products.filter((p) => owned(p.artistId)),
    portfolios: content.portfolios.filter((p) => owned(p.artistId)),
    stories: content.stories.filter((s) => owned(s.artistId)),
    education: content.education.filter((e) => owned(e.authorId)),
  };
}

/* ------------------------------------------------------------------ */
/* Slug                                                                */
/* ------------------------------------------------------------------ */

/**
 * URL-safe slug from a person's name. Persian names produce Persian characters through
 * `slugify()`, which works but percent-encodes badly in shared links — so prefer the Latin
 * name, then any ASCII in the Persian one, then a random suffix. Uniqueness is enforced
 * against the existing artist list.
 */
export function artistSlugFrom(name: { fa?: string; en?: string }, taken: Set<string>): string {
  const asciiOnly = (s: string) => s.replace(/[^\p{Script=Latin}\p{N}]+/gu, " ");
  const base =
    slugify(asciiOnly(name.en ?? "")).slice(0, 48) ||
    slugify(asciiOnly(name.fa ?? "")).slice(0, 48) ||
    "artist";

  let slug = base;
  for (let i = 2; taken.has(slug); i += 1) slug = `${base}-${i}`;
  if (slug === base && taken.has(slug)) slug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
  return slug;
}

/* ------------------------------------------------------------------ */
/* Create / update                                                     */
/* ------------------------------------------------------------------ */

export interface NewArtistInput {
  name: string;
  email?: string;
  phone?: string;
  profession?: string;
  location?: string;
  userId?: string | null;
}

/**
 * Create a pending profile for a self-registered artist. Returns the record so the caller can
 * link it to the new account (`StoredUser.artistId`).
 */
export async function createArtistDraft(input: NewArtistInput): Promise<Artist> {
  return withContentLock(async () => {
    const content = await getContent();
    const taken = new Set(content.artists.map((a) => a.slug));
    const nameEn = input.name.trim();
    const artist: Artist = {
      id: `artist-${crypto.randomBytes(6).toString("hex")}`,
      slug: artistSlugFrom({ en: nameEn }, taken),
      name: { fa: nameEn, en: nameEn },
      profession: { fa: input.profession?.trim() || "", en: input.profession?.trim() || "" },
      bio: { fa: "", en: "" },
      avatar: PLACEHOLDER_ARTIST_IMAGE,
      cover: PLACEHOLDER_ARTIST_IMAGE,
      location: { fa: input.location?.trim() || "", en: input.location?.trim() || "" },
      social: {},
      featured: false,
      followers: 0,
      rating: 0,
      reviewsCount: 0,
      status: "pending",
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      joinedAt: new Date().toISOString(),
    };
    await saveContent({ ...content, artists: [...content.artists, artist] });
    return artist;
  });
}

/** Trim + length-cap a free-text value coming from a form. */
function clean(value: unknown, max = 4000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanLocalized(value: unknown): { fa: string; en: string } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { fa?: unknown; en?: unknown };
  return { fa: clean(v.fa), en: clean(v.en) };
}

/** An avatar/cover must be a site-relative path we produced (or a shipped asset). */
export function isAllowedImagePath(value: unknown): value is string {
  return typeof value === "string" && /^\/(uploads|images)\//.test(value) && !value.includes("..");
}

/**
 * Apply a self-service profile patch. Only `SELF_EDITABLE_FIELDS` are read; anything else in the
 * body (id, slug, status, featured, followers, rating…) is ignored, so an artist cannot promote
 * their own record by sending extra keys.
 */
export async function patchArtistProfile(
  artistId: string,
  patch: Record<string, unknown>,
): Promise<Artist | null> {
  return withContentLock(async () => {
    const content = await getContent();
    const idx = content.artists.findIndex((a) => a.id === artistId);
    if (idx === -1) return null;
    const current = content.artists[idx];
    const next: Artist = { ...current };

    const name = cleanLocalized(patch.name);
    if (name && (name.fa || name.en)) next.name = { fa: name.fa || name.en, en: name.en || name.fa };

    const profession = cleanLocalized(patch.profession);
    if (profession) next.profession = profession;

    const bio = cleanLocalized(patch.bio);
    if (bio) next.bio = bio;

    const location = cleanLocalized(patch.location);
    if (location) next.location = location;

    if (isAllowedImagePath(patch.avatar)) next.avatar = patch.avatar;
    if (isAllowedImagePath(patch.cover)) next.cover = patch.cover;

    if (typeof patch.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.email)) {
      next.email = patch.email.trim().slice(0, 160);
    }
    if (typeof patch.phone === "string") next.phone = clean(patch.phone, 32);

    if (patch.social && typeof patch.social === "object") {
      const s = patch.social as { instagram?: unknown; behance?: unknown; website?: unknown };
      next.social = {
        ...(clean(s.instagram, 80) ? { instagram: clean(s.instagram, 80) } : {}),
        ...(clean(s.behance, 80) ? { behance: clean(s.behance, 80) } : {}),
        ...(clean(s.website, 120) ? { website: clean(s.website, 120) } : {}),
      };
    }

    const artists = content.artists.map((a, i) => (i === idx ? next : a));
    await saveContent({ ...content, artists });
    return next;
  });
}

/**
 * Attach the owning account to a profile. Called by the sign-up route right after the user row is
 * created (the user id only exists then). Not part of `SELF_EDITABLE_FIELDS` — an artist can never
 * re-point their profile at another account.
 */
export async function linkArtistAccount(artistId: string, userId: string): Promise<Artist | null> {
  return withContentLock(async () => {
    const content = await getContent();
    const idx = content.artists.findIndex((a) => a.id === artistId);
    if (idx === -1) return null;
    const next: Artist = { ...content.artists[idx], userId };
    const artists = content.artists.map((a, i) => (i === idx ? next : a));
    await saveContent({ ...content, artists });
    return next;
  });
}

/** Admin decision. Only "approved" and "rejected" are accepted here. */export async function setArtistStatus(
  artistId: string,
  status: Exclude<ArtistStatus, "pending">,
  reviewNote?: string,
): Promise<Artist | null> {
  if (status !== "approved" && status !== "rejected") return null;
  return withContentLock(async () => {
    const content = await getContent();
    const idx = content.artists.findIndex((a) => a.id === artistId);
    if (idx === -1) return null;
    const next: Artist = { ...content.artists[idx], status, ...(reviewNote !== undefined ? { reviewNote: clean(reviewNote, 500) } : {}) };
    const artists = content.artists.map((a, i) => (i === idx ? next : a));
    await saveContent({ ...content, artists });
    return next;
  });
}

/** Full list for the moderation queue: profile + owning account + content counts. */
export async function listArtistsWithAccounts(): Promise<ArtistWithAccount[]> {
  const [content, users] = await Promise.all([getContent(), getAllUsers()]);
  return content.artists.map((a) => {
    const owner = users.find((u) => u.artistId === a.id || (a.userId != null && u.id === a.userId));
    return {
      ...a,
      account: owner ? { id: owner.id, email: owner.email, createdAt: owner.createdAt } : null,
      counts: {
        patterns: content.patterns.filter((p) => p.artistId === a.id).length,
        products: content.products.filter((p) => p.artistId === a.id).length,
        portfolios: content.portfolios.filter((p) => p.artistId === a.id).length,
        education: content.education.filter((e) => e.authorId === a.id).length,
      },
    };
  });
}
