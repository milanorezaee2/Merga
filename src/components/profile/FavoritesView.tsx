"use client";

import { useFavorites, useLocale } from "@/components/providers/AppProviders";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { EducationCard, type EducationCardData } from "@/components/cards/EducationCard";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { href } from "@/lib/utils";

/**
 * Saved items. Patterns, products and courses all write to the same localStorage-backed
 * favourites set, so everything a visitor bookmarks shows up here.
 */
export function FavoritesView({
  patterns,
  products,
  education,
}: {
  patterns: PatternCardData[];
  products: ProductCardData[];
  education: EducationCardData[];
}) {
  const { ids } = useFavorites();
  const { locale, dict } = useLocale();
  const ps = patterns.filter((p) => ids.has(p.id));
  const prs = products.filter((p) => ids.has(p.id));
  const es = education.filter((e) => ids.has(e.id));

  if (!ps.length && !prs.length && !es.length) {
    return <EmptyState action={<Button href={href(locale, "/patterns")} size="sm" variant="outline">{dict.nav.startExploring}</Button>} />;
  }

  return (
    <div className="space-y-12">
      {(ps.length > 0 || prs.length > 0) && (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {ps.map((p) => <PatternCard key={p.id} pattern={p} />)}
          {prs.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
      {es.length > 0 && (
        <section>
          <h2 className="mb-5 font-display text-h3">{dict.nav.education}</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {es.map((e) => <EducationCard key={e.id} item={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
