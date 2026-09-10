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
