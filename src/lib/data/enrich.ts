import type { Artist, EducationItem, Pattern, Portfolio, Product, SiteContent } from "../types";

export type Enriched<T> = T & { artist: Artist | null };

export function artistOf(site: SiteContent, id: string | null): Artist | null {
  if (!id) return null;
  return site.artists.find((a) => a.id === id) ?? null;
}
export function categoryOf(site: SiteContent, id: string) {
  return site.categories.find((c) => c.id === id) ?? null;
}
export function patternById(site: SiteContent, id: string) {
  return site.patterns.find((p) => p.id === id) ?? null;
}
export function productById(site: SiteContent, id: string) {
  return site.products.find((p) => p.id === id) ?? null;
}
export function portfolioById(site: SiteContent, id: string) {
  return site.portfolios.find((p) => p.id === id) ?? null;
}

export function enrichPattern(site: SiteContent, p: Pattern) {
  return { ...p, artist: artistOf(site, p.artistId), category: categoryOf(site, p.categoryId) };
}
export function enrichProduct(site: SiteContent, p: Product) {
  return { ...p, artist: artistOf(site, p.artistId), category: categoryOf(site, p.categoryId), pattern: p.patternId ? patternById(site, p.patternId) : null };
}
export function enrichPortfolio(site: SiteContent, p: Portfolio) {
  return {
    ...p,
    artist: artistOf(site, p.artistId),
    category: categoryOf(site, p.categoryId),
    patterns: p.patternIds.map((id) => patternById(site, id)).filter(Boolean) as Pattern[],
    products: p.productIds.map((id) => productById(site, id)).filter(Boolean) as Product[],
  };
}
export function enrichEducation(site: SiteContent, e: EducationItem) {
  return {
    ...e,
    author: artistOf(site, e.authorId),
    category: categoryOf(site, e.categoryId),
    patterns: e.patternIds.map((id) => patternById(site, id)).filter(Boolean) as Pattern[],
    products: e.productIds.map((id) => productById(site, id)).filter(Boolean) as Product[],
  };
}

export function artistStats(site: SiteContent, artistId: string) {
  return {
    patterns: site.patterns.filter((p) => p.artistId === artistId),
    products: site.products.filter((p) => p.artistId === artistId),
    portfolios: site.portfolios.filter((p) => p.artistId === artistId),
    education: site.education.filter((e) => e.authorId === artistId),
  };
}

export type EnrichedPattern = ReturnType<typeof enrichPattern>;
export type EnrichedProduct = ReturnType<typeof enrichProduct>;
export type EnrichedPortfolio = ReturnType<typeof enrichPortfolio>;
export type EnrichedEducation = ReturnType<typeof enrichEducation>;
