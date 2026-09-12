import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronDown, Clock, Layers, Lock, PlayCircle, Signal } from "lucide-react";
import { EducationCard } from "@/components/cards/EducationCard";
import { PatternCard } from "@/components/cards/PatternCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Reveal } from "@/components/ui/Reveal";
import { enrichEducation, enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { faNum, formatDuration, href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.education.map((item) => ({ locale, slug: item.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const e = site.education.find((x) => x.slug === slug);
  return e ? { title: t(e.title, locale), description: t(e.excerpt, locale) } : {};
}

export default async function EducationDetail({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const raw = site.education.find((x) => x.slug === slug);
  if (!raw) notFound();
  const d = dictionaries[locale];
  const e = enrichEducation(site, raw);
  const related = site.education.filter((x) => x.id !== e.id && (x.categoryId === e.categoryId || x.authorId === e.authorId)).slice(0, 3).map((x) => enrichEducation(site, x));
  const paragraphs = t(e.body, locale).split(/\n\n+/);

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.education, href: href(locale, "/academy") },
    { label: t(e.title, locale) },
  ];

  return (
    <article>
      <section className="relative isolate h-[70svh] min-h-[480px] overflow-hidden bg-[#0d1117] text-white">
        <Image src={e.image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/95 via-[#0a0d13]/40 to-[#0a0d13]/30" />
        <div className="container-x relative flex h-full flex-col justify-end pb-12 pt-[var(--header-h)]">
          <Breadcrumb items={breadcrumb} locale={locale} className="mb-6 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25" />
          <div className="anim-blur-in flex flex-wrap gap-2"><Badge tone="glass">{d.common[e.type]}</Badge>{e.category && <Badge tone="glass">{t(e.category.name, locale)}</Badge>}</div>
          <h1 className="anim-blur-in mt-4 max-w-4xl font-display text-h1 text-balance" style={{ animationDelay: "100ms" }}>{t(e.title, locale)}</h1>
          <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-caption text-white/75" style={{ animationDelay: "200ms" }}>
            {e.author && (
              <Link href={href(locale, `/artists/${e.author.slug}`)} className="inline-flex items-center gap-2 hover:text-white">
                <span className="relative h-8 w-8 overflow-hidden rounded-full"><Image src={e.author.avatar} alt="" fill sizes="32px" className="object-cover" /></span>
                {d.common.author}: {t(e.author.name, locale)}
              </Link>
            )}
            <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5" />{d.common[e.difficulty]}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(e.durationMin, locale, d.common)}</span>
            {e.lessons > 1 && <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{locale === "fa" ? faNum(e.lessons) : e.lessons} {d.common.lessons}</span>}
          </div>
        </div>
      </section>

      <section className="container-x section-y">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Reveal><p className="font-display text-h3 leading-relaxed text-foreground text-balance">{t(e.excerpt, locale)}</p></Reveal>
            <Reveal className="prose-ra mt-10" delay={80}>{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</Reveal>
          </div>
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-border p-5 lg:sticky lg:top-[calc(var(--header-h-compact)+1.5rem)]">
              {/**
                * Real facts only. This used to render a hardcoded "12% complete" bar for every
                * visitor and a list of invented lesson titles ("Lesson 1…6") — there is no progress
                * tracking and the data model has no per-lesson titles, so both are gone. A
                * curriculum belongs here once `chapters` exists on the record.
                */}
              <p className="text-label text-muted">{d.common.atAGlance}</p>
              <dl className="mt-3 space-y-2.5 text-sm">
                <Fact icon={<Signal className="h-3.5 w-3.5" />} k={d.common.difficulty} v={d.common[e.difficulty]} />
                <Fact icon={<Clock className="h-3.5 w-3.5" />} k={d.common.duration} v={formatDuration(e.durationMin, locale, d.common)} />
                {e.lessons > 1 && <Fact icon={<Layers className="h-3.5 w-3.5" />} k={d.common.lessons} v={String(e.lessons)} />}
                <Fact icon={<CalendarDays className="h-3.5 w-3.5" />} k={d.common.published} v={new Date(e.publishedAt).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", { year: "numeric", month: "long" })} />
              </dl>
              {e.author && (
                <Link href={href(locale, `/artists/${e.author.slug}`)} className="mt-6 flex items-center gap-3 border-t border-border pt-5 group">
                  <span className="relative h-12 w-12 overflow-hidden rounded-full"><Image src={e.author.avatar} alt="" fill sizes="48px" className="object-cover" /></span>
                  <span><span className="block font-medium group-hover:text-accent">{t(e.author.name, locale)}</span><span className="block text-caption text-foreground-secondary">{t(e.author.profession, locale)}</span></span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/**
        * Curriculum — rendered from real `chapters` data. Native <details> keeps it server-rendered
        * and keyboard-accessible without a client component.
        */}
      {e.chapters && e.chapters.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.education} title={d.common.curriculum} />
          <div className="mt-8 max-w-3xl divide-y divide-border rounded-xl border border-border">
            {e.chapters.map((c, ci) => {
              const mins = c.lessons.reduce((acc, l) => acc + l.durationMin, 0);
              return (
                <details key={c.id} className="group px-5 py-4" open={ci === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-secondary text-caption tabular">
                        {locale === "fa" ? faNum(ci + 1) : ci + 1}
                      </span>
                      <span className="font-medium">{t(c.title, locale)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-caption text-muted tabular">
                      {locale === "fa" ? faNum(c.lessons.length) : c.lessons.length} {d.common.lessons} · {formatDuration(mins, locale, d.common)}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="mt-4 space-y-1.5 ps-10">
                    {c.lessons.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm hover:bg-background-secondary">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {l.isFree ? <PlayCircle className="h-4 w-4 shrink-0 text-accent" /> : <Lock className="h-4 w-4 shrink-0 text-muted" />}
                          <span className="truncate">{t(l.title, locale)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-caption text-muted tabular">
                          {l.isFree && <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-accent">{d.common.preview}</span>}
                          {formatDuration(l.durationMin, locale, d.common)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {e.patterns.length > 0 && (
        <section className="bg-background-secondary"><div className="container-x section-y">
          <SectionHeader eyebrow={d.nav.patterns} title={d.common.relatedPatterns} href={href(locale, "/patterns")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">{e.patterns.map((p) => <PatternCard key={p.id} pattern={enrichPattern(site, p)} />)}</div>
        </div></section>
      )}
      {e.products.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.products} title={d.common.relatedProducts} href={href(locale, "/shop")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-5 xs:grid-cols-2 md:grid-cols-4">{e.products.map((p) => <ProductCard key={p.id} product={enrichProduct(site, p)} />)}</div>
        </section>
      )}
      {related.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.education} title={d.common.relatedTutorials} href={href(locale, "/academy")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-6 md:grid-cols-3">{related.map((x, i) => <Reveal key={x.id} delay={i * 70}><EducationCard item={x} /></Reveal>)}</div>
        </section>
      )}
    </article>
  );
}

/** One label/value row in the "at a glance" panel. */
function Fact({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0">
      <dt className="inline-flex items-center gap-1.5 text-caption text-muted">
        {icon}
        {k}
      </dt>
      <dd className="text-end font-medium tabular">{v}</dd>
    </div>
  );
}
