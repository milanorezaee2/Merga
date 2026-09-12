import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { artistStats, enrichEducation, enrichPattern, enrichPortfolio, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.artists.map((artist) => ({ locale, slug: artist.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const a = site.artists.find((x) => x.slug === slug);
  return a ? { title: t(a.name, locale), description: t(a.bio, locale) } : {};
}

export default async function ArtistPage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const artist = site.artists.find((x) => x.slug === slug);
  if (!artist) notFound();
  const d = dictionaries[locale];
  const s = artistStats(site, artist.id);
  const patternIds = new Set(s.patterns.map((p) => p.id));
  const collections = site.collections.filter((c) => c.patternIds.some((id) => patternIds.has(id)));
  /** Real reviews from the record — a profile with none renders an empty state. */
  const reviews = artist.reviews ?? [];

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.artists, href: href(locale, "/artists") },
    { label: t(artist.name, locale) },
  ];

  return (
    <article className="pt-[var(--header-h)]">
      <ProfileHeader artist={artist} counts={{ patterns: s.patterns.length, products: s.products.length, projects: s.portfolios.length }}>
        <Breadcrumb items={breadcrumb} locale={locale} className="mb-4 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25" />
      </ProfileHeader>
      <ProfileTabs
        patterns={s.patterns.map((p) => enrichPattern(site, p))}
        products={s.products.map((p) => enrichProduct(site, p))}
        education={s.education.map((e) => enrichEducation(site, e))}
        collections={collections}
        portfolios={s.portfolios.map((p) => enrichPortfolio(site, p))}
        reviews={reviews}
      />
    </article>
  );
}
