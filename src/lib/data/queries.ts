import "server-only";
import { getContent } from "./store";
import { filterLiveContent } from "./artists";
import type { SiteContent } from "../types";

export type {
  Enriched,
  EnrichedPattern,
  EnrichedProduct,
  EnrichedPortfolio,
  EnrichedEducation,
} from "./enrich";
export {
  artistOf,
  categoryOf,
  patternById,
  productById,
  portfolioById,
  enrichPattern,
  enrichProduct,
  enrichPortfolio,
  enrichEducation,
  artistStats,
} from "./enrich";
export { artistStatus, isArtistLive } from "./artists";

export async function getSite(): Promise<SiteContent> {
  /**
   * Public read path. Artists that are not approved (self-registered and waiting, or rejected) are
   * removed together with the content that points at them, so a pending profile never leaks into a
   * listing, the sitemap, the search index or a "related" rail. Admin endpoints call `getContent()`
   * directly and keep seeing everything.
   */
  return filterLiveContent(await getContent());
}
