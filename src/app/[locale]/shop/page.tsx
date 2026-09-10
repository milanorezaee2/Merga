import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Truck } from "lucide-react";
import { ShopFiltered } from "@/components/product/ShopFiltered";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/shop");
  return { title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.products, description: m ? t(m.description, locale) : undefined };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const exclusive = site.collections.find((c) => c.slug === "atelier-exclusive");
  const heroProduct = site.products.find((p) => !p.artistId && p.featured) ?? site.products[0];
  const banner = site.banners.find((b) => b.enabled && b.placement === "shop");
  const usedCats = site.categories.filter((c) => site.products.some((p) => p.categoryId === c.id));

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.products },
  ];

  return (
    <>
      {/* Boutique hero */}
      <section className="container-x pt-[calc(var(--header-h)+1.5rem)]">
        <Breadcrumb items={breadcrumb} locale={locale} className="mb-5" />
        <div className="grid gap-6 overflow-hidden rounded-xl bg-background-secondary lg:grid-cols-12">
          <div className="flex flex-col justify-center p-8 md:p-12 lg:col-span-6">
            <p className="anim-blur-in text-label text-accent">{d.common.siteExclusive}</p>
            <h1 className="anim-blur-in mt-4 font-display text-h1 text-balance" style={{ animationDelay: "80ms" }}>{exclusive ? t(exclusive.title, locale) : d.nav.products}</h1>
            <p className="anim-blur-in mt-4 max-w-md text-body-lg text-foreground-secondary" style={{ animationDelay: "160ms" }}>{exclusive ? t(exclusive.description, locale) : d.home.exclusiveDesc}</p>
            <div className="anim-fade-up mt-8 flex flex-wrap gap-2" style={{ animationDelay: "240ms" }}>
              <Link href={href(locale, "/shop?owner=site")} className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">{d.common.siteExclusive}</Link>
              <Link href={href(locale, "/shop?owner=artist")} className="rounded-full border border-border px-4 py-2 text-sm hover:border-foreground">{d.common.artistProduct}</Link>
            </div>
            {banner && (
              <p className="anim-fade-up mt-8 inline-flex items-center gap-2 text-caption text-foreground-secondary" style={{ animationDelay: "320ms" }}>
                <Truck className="h-4 w-4 text-accent" />
                <strong className="font-medium text-foreground">{t(banner.title, locale)}</strong> · {t(banner.text, locale)}
              </p>
            )}
          </div>
          {heroProduct && (
            <Link href={href(locale, `/shop/${heroProduct.slug}`)} className="group relative min-h-[320px] overflow-hidden lg:col-span-6 lg:min-h-[480px]">
              <Image src={heroProduct.colors[0].image} alt={t(heroProduct.title, locale)} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="img-zoom object-cover" />
              <div className="absolute inset-0 vignette opacity-80" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white">
                <div>
                  <Badge tone="glass" className="text-accent">{d.common.featured}</Badge>
                  <p className="mt-2 font-display text-h3">{t(heroProduct.title, locale)}</p>
                  <p className="text-caption text-white/70" dir="ltr">{heroProduct.sku}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"><ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" /></span>
              </div>
            </Link>
          )}
        </div>
      </section>

      <div className="container-x pb-20 pt-10">
        <ShopFiltered
          site={site}
          locale={locale}
          title={locale === "fa" ? "فروشگاه سطح و دکور" : "Surface & décor shop"}
          categories={usedCats
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => ({
              id: c.slug,
              label: t(c.name, locale),
              count: site.products.filter((p) => p.categoryId === c.id).length,
            }))}
          sorts={[
            { id: "new", label: d.common.new },
            { id: "best", label: d.common.bestSeller },
            { id: "price-asc", label: locale === "fa" ? "ارزان‌ترین" : "Price: low to high" },
            { id: "price-desc", label: locale === "fa" ? "گران‌ترین" : "Price: high to low" },
          ]}
          extra={[
            {
              key: "owner",
              label: d.common.creator,
              options: [
                { id: "site", label: d.brand, count: site.products.filter((p) => !p.artistId).length },
                { id: "artist", label: d.nav.artists, count: site.products.filter((p) => !!p.artistId).length },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
