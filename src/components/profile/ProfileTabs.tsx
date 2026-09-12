"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/States";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { EducationCard, type EducationCardData } from "@/components/cards/EducationCard";
import { PortfolioCard } from "@/components/cards/PortfolioCard";
import { StyleCard } from "@/components/cards/StyleCard";
import { href, t } from "@/lib/utils";
import type { ArtistReview, Collection } from "@/lib/types";
import type { EnrichedPortfolio } from "@/lib/data/queries";

interface Props {
  patterns: PatternCardData[];
  products: ProductCardData[];
  education: EducationCardData[];
  collections: Collection[];
  portfolios: EnrichedPortfolio[];
  reviews: ArtistReview[];
}

export function ProfileTabs({ patterns, products, education, collections, portfolios, reviews }: Props) {
  const { locale, dict } = useLocale();
  const tabs = [
    { id: "patterns", label: dict.nav.patterns, count: patterns.length },
    { id: "products", label: dict.common.products, count: products.length },
    { id: "projects", label: dict.nav.portfolio, count: portfolios.length },
    { id: "collections", label: dict.nav.collections, count: collections.length },
    { id: "education", label: dict.nav.education, count: education.length },
    { id: "reviews", label: dict.common.reviews, count: reviews.length },
  ];
  const [tab, setTab] = useState(patterns.length ? "patterns" : "products");

  return (
    <div className="container-x mt-12">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div key={tab} className="anim-fade-up py-10">
        {tab === "patterns" && (patterns.length ? <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">{patterns.map((p) => <PatternCard key={p.id} pattern={p} />)}</div> : <EmptyState />)}
        {tab === "products" && (products.length ? <div className="grid gap-5 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <EmptyState />)}
        {tab === "projects" && (portfolios.length ? <div className="grid gap-5 md:grid-cols-2">{portfolios.map((p) => <div key={p.id} className="aspect-[16/10]"><PortfolioCard item={p} /></div>)}</div> : <EmptyState />)}
        {tab === "collections" && (collections.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{collections.map((c) => <StyleCard key={c.id} href={href(locale, `/collections/${c.slug}`)} title={t(c.title, locale)} description={t(c.description, locale)} image={c.cover} className="aspect-[4/3]" />)}</div> : <EmptyState />)}
        {tab === "education" && (education.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{education.map((e) => <EducationCard key={e.id} item={e} />)}</div> : <EmptyState />)}
        {tab === "reviews" && (
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.author}</p>
                  <span className="inline-flex shrink-0 gap-0.5" aria-label={`${r.rating}/5`}>
                    {Array.from({ length: 5 }).map((_, k) => <Star key={k} className={`h-3.5 w-3.5 ${k < r.rating ? "fill-accent text-accent" : "text-border"}`} />)}
                  </span>
                </div>
                <p className="mt-2 text-body-sm text-foreground-secondary">{t(r.text, locale)}</p>
                <time className="mt-2 block text-caption text-muted tabular" dateTime={r.date}>
                  {new Date(r.date).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", { year: "numeric", month: "long" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
