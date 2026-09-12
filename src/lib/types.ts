import type { Localized } from "./i18n/types";

export type ID = string;

export interface Category {
  id: ID;
  slug: string;
  name: Localized;
  description: Localized;
  image: string;
  featured: boolean;
  order: number;
}

export interface Space {
  id: ID;
  slug: string;
  name: Localized;
  image: string;
  order: number;
}

/** A review left about an artist's work. Optional: profiles without reviews show an empty state. */
export interface ArtistReview {
  id: ID;
  /** Display name of the reviewer (customer or studio). */
  author: string;
  text: Localized;
  rating: number;
  /** ISO date, e.g. "2026-06-14" — rendered as-is, never derived from the row index. */
  date: string;
}

/**
 * Moderation state of an artist profile.
 *  - "pending"  → self-registered, waiting for an admin decision; hidden from every public page
 *  - "approved" → live on the site
 *  - "rejected" → declined by an admin; hidden from every public page
 *
 * The field is optional on purpose: content saved before moderation existed has no `status`,
 * and `artistStatus()` treats a missing value as "approved" so legacy records keep working.
 */
export type ArtistStatus = "pending" | "approved" | "rejected";

export interface Artist {
  id: ID;
  slug: string;
  name: Localized;
  profession: Localized;
  bio: Localized;
  avatar: string;
  cover: string;
  location: Localized;
  social: { instagram?: string; behance?: string; website?: string };
  featured: boolean;
  followers: number;
  rating: number;
  reviewsCount: number;
  /** Real reviews. Optional — a profile without any renders an empty state instead of filler. */
  reviews?: ArtistReview[];
  /** Account that owns this profile — set when the artist registers themselves. */
  userId?: ID | null;
  /** Missing = legacy/seed record, treated as "approved" (see `artistStatus()`). */
  status?: ArtistStatus;
  /** Contact details captured at signup. Admin-only: never rendered on public pages. */
  email?: string;
  phone?: string;
  joinedAt?: string;
  /** Admin note about the moderation decision. Admin-only. */
  reviewNote?: string;
}

export interface PatternSpec {
  repeat: Localized;
  dpi: string;
  formats: string;
  colors: number;
  scale: Localized;
}

/**
 * A Spoonflower-style colourway: same design, different colour treatment.
 * Each colourway has its own preview image + brand hex for the swatch dot.
 */
export interface Colorway {
  id: ID;
  name: Localized;
  /** Swatch colour shown as a circle on cards */
  hex: string;
  /** Preview image for this colourway (pattern / wallpaper / fabric photo) */
  image: string;
  /** Optional extra gallery frames for this colourway */
  gallery?: string[];
  isDefault?: boolean;
}

export interface Pattern {
  id: ID;
  sku: string;
  slug: string;
  title: Localized;
  description: Localized;
  image: string;
  gallery: string[];
  categoryId: ID;
  spaceIds: ID[];
  artistId: ID | null; // null → site-owned pattern
  price: { fa: number; en: number };
  specs: PatternSpec;
  /** Accent colours inside the design (legacy / detail strip) */
  palette: string[];
  /**
   * Available colourways (Spoonflower-style). When present, cards show circular
   * swatches and the main image switches with the selected colourway.
   */
  colorways?: Colorway[];
  tags: string[];
  featured: boolean;
  trending: boolean;
  bestSeller: boolean;
  isNew: boolean;
  createdAt: string;
  likes: number;
}

export interface ColorOption {
  id: ID;
  name: Localized;
  hex: string;
  image: string;
  stock: number;
}

export interface ProductSpec {
  label: Localized;
  value: Localized;
}

export interface Product {
  id: ID;
  sku: string;
  slug: string;
  title: Localized;
  description: Localized;
  categoryId: ID;
  patternId: ID | null;
  artistId: ID | null; // null → site-owned
  price: { fa: number; en: number };
  compareAt?: { fa: number; en: number };
  colors: ColorOption[];
  sizes: Localized[];
  specs: ProductSpec[];
  materials: Localized;
  featured: boolean;
  bestSeller: boolean;
  isNew: boolean;
  order: number;
}

export interface PortfolioBlock {
  type: "text" | "image" | "quote" | "pair";
  text?: Localized;
  image?: string;
  images?: string[];
  caption?: Localized;
}

export interface Portfolio {
  id: ID;
  slug: string;
  title: Localized;
  subtitle: Localized;
  intro: Localized;
  story: PortfolioBlock[];
  cover: string;
  gallery: string[];
  artistId: ID | null;
  patternIds: ID[];
  productIds: ID[];
  client: Localized;
  location: Localized;
  year: number;
  scope: Localized;
  categoryId: ID;
  featured: boolean;
  isProject: boolean;
  size: "hero" | "tall" | "wide" | "square";
}

/** One lesson inside a chapter. `isFree` lessons are unlocked for everyone. */
export interface Lesson {
  id: ID;
  title: Localized;
  durationMin: number;
  isFree?: boolean;
  /** Media source for the player. Absent = no media attached yet (the player says so). */
  videoUrl?: string;
}

/** A curriculum chapter. Optional: items without one show no curriculum section. */
export interface Chapter {
  id: ID;
  title: Localized;
  lessons: Lesson[];
}

export type EducationType = "course" | "tutorial" | "article" | "path";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface EducationItem {
  id: ID;
  slug: string;
  type: EducationType;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  image: string;
  authorId: ID;
  difficulty: Difficulty;
  durationMin: number;
  lessons: number;
  categoryId: ID;
  patternIds: ID[];
  productIds: ID[];
  featured: boolean;
  popular: boolean;
  publishedAt: string;
  /**
   * Explicit price: `fa` in Toman, `en` in USD. `null` means free, and a missing field means
   * "no price set" — the UI then shows no price rather than inventing one.
   */
  price?: { fa: number; en: number } | null;
  /** Real curriculum. Optional — the detail page renders the section only when present. */
  chapters?: Chapter[];
}

export interface Story {
  id: ID;
  slug: string;
  artistId: ID;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  image: string;
  publishedAt: string;
}

export interface Collection {
  id: ID;
  slug: string;
  title: Localized;
  description: Localized;
  cover: string;
  patternIds: ID[];
  productIds: ID[];
}

export type HomeSectionKey =
  | "hero"
  | "discovery"
  | "trending"
  | "bestSellers"
  | "newPatterns"
  | "artists"
  | "portfolios"
  | "styles"
  | "spaces"
  | "exclusive"
  | "projects"
  | "education"
  | "b2b"
  | "custom"
  | "stories"
  | "newsletter";

export interface HomeSection {
  key: HomeSectionKey;
  enabled: boolean;
  order: number;
}

export interface Banner {
  id: ID;
  title: Localized;
  text: Localized;
  href: string;
  enabled: boolean;
  placement: "top" | "shop" | "academy";
}

export interface SeoMeta {
  path: string;
  title: Localized;
  description: Localized;
}

export interface HeroContent {
  eyebrow: Localized;
  titleA: Localized;
  titleB: Localized;
  description: Localized;
  image: string;
  images?: string[];
  video?: string;
  ctaHref: string;
  cta2Href: string;
  featuredPatternIds: ID[];
}

export interface SiteContent {
  categories: Category[];
  spaces: Space[];
  artists: Artist[];
  patterns: Pattern[];
  products: Product[];
  portfolios: Portfolio[];
  education: EducationItem[];
  stories: Story[];
  collections: Collection[];
  homeSections: HomeSection[];
  banners: Banner[];
  seo: SeoMeta[];
  hero: HeroContent;
}

export type CollectionKey = Exclude<keyof SiteContent, "hero">;
