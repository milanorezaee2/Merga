"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, Skeleton, SuccessState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { ArtistModeration } from "@/components/admin/ArtistModeration";
import { SESSION_FETCH } from "@/lib/http";
import { cn, href, slugify, t } from "@/lib/utils";
import type { Artist, ArtistReview, Banner, Category, EducationItem, HeroContent, HomeSectionKey, SeoMeta, SiteContent } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

type Section = "home" | "hero" | "categories" | "patterns" | "products" | "artists" | "requests" | "portfolios" | "education" | "banners" | "seo";

const SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "Hero", discovery: "Pattern Discovery", trending: "Trending Patterns", bestSellers: "Best Sellers", newPatterns: "New Patterns", artists: "Featured Artists", portfolios: "Featured Portfolios", styles: "Browse by Style", spaces: "Browse by Space", exclusive: "Exclusive Collection", projects: "Featured Projects", education: "Academy", b2b: "B2B", custom: "Custom Production", stories: "Artist Stories", newsletter: "Newsletter",
};

/** Grace period before an unauthenticated admin is sent to /login (ms). */
const REDIRECT_GRACE_MS = 300;

/** The API answered 401 — the session is gone. Surfaced as a message, never as a redirect. */
class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Session-aware call to the admin API: cookies attached, nothing cached, 401 made explicit. */
async function adminFetch<T>(init?: RequestInit): Promise<T> {
  const r = await fetch("/api/admin/content", { ...SESSION_FETCH, ...init });
  if (r.status === 401) throw new UnauthorizedError();
  if (!r.ok) throw new Error(`admin/content → ${r.status}`);
  return (await r.json()) as T;
}

export function AdminApp() {
  const { user, ready } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const [data, setData] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<Section>("home");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  /** why the content is missing: a rejected session vs. a transport/5xx failure */
  const [loadError, setLoadError] = useState<"unauthorized" | "error" | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      setData(await adminFetch<SiteContent>({ signal }));
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof UnauthorizedError ? "unauthorized" : "error");
    }
  }, []);

  // Send a logged-out admin to /login only once the session check has settled (`ready`) and only
  // after a grace period, so a late /api/auth/me answer can never flash-redirect a signed-in admin.
  useEffect(() => {
    if (!ready || user !== null || loadError === "unauthorized") return;
    const id = window.setTimeout(() => router.replace(href(locale, "/login")), REDIRECT_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [ready, user, loadError, router, locale]);

  useEffect(() => {
    if (!ready || user?.role !== "admin") return;
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [ready, user, load]);

  const update = useCallback((patch: Partial<SiteContent>) => {
    setData((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }, []);

  const save = async () => {
    if (!data) return;
    setStatus("saving");
    try {
      await adminFetch<{ ok: true }>({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      setStatus("ok");
      setDirty(false);
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setStatus("idle");
        setLoadError("unauthorized");
      } else {
        setStatus("error");
      }
    }
  };
  const reset = async () => {
    if (!confirm("Reset all admin overrides to the seed content?")) return;
    try {
      await adminFetch<{ ok: true }>({ method: "DELETE" });
      setData(await adminFetch<SiteContent>());
      setDirty(false);
      setLoadError(null);
      router.refresh();
    } catch (e) {
      if (e instanceof UnauthorizedError) setLoadError("unauthorized");
      else setStatus("error");
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div className="container-x pt-[calc(var(--header-h)+4rem)] pb-20 max-w-xl">
        <ErrorState message="This account does not have admin access. Sign in with admin@… to manage content." />
      </div>
    );
  }

  const nav: { id: Section; label: string }[] = [
    { id: "home", label: "Homepage Sections" }, { id: "hero", label: "Hero" }, { id: "categories", label: "Categories / Styles" }, { id: "patterns", label: "Patterns" }, { id: "products", label: "Site Products" }, { id: "artists", label: "Artists" }, { id: "requests", label: "Artist Requests" }, { id: "portfolios", label: "Portfolios" }, { id: "education", label: "Education" }, { id: "banners", label: "Banners" }, { id: "seo", label: "SEO Metadata" },
  ];

  return (
    <div className="container-x pt-[calc(var(--header-h)+2rem)] pb-20" dir="ltr">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-label text-accent">Rosie Atelier</p>
          <h1 className="mt-1 font-display text-h1">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          {status === "ok" && <SuccessState message="Saved" />}
          {status === "error" && <span className="text-sm text-error">Save failed</span>}
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button size="sm" onClick={save} disabled={!dirty || status === "saving"}><Save className="h-4 w-4" />{status === "saving" ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <nav className="lg:col-span-3">
          <ul className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {nav.map((n) => (
              <li key={n.id}><button onClick={() => setSection(n.id)} className={cn("w-full whitespace-nowrap rounded-md px-3 py-2 text-start text-sm transition-colors", section === n.id ? "bg-foreground text-background" : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground")}>{n.label}</button></li>
            ))}
          </ul>
          <p className="mt-6 hidden text-caption text-muted lg:block">Changes are stored in <code>data/content.json</code> (git-ignored) and override the seed. Replace the store module with your database when ready.</p>
        </nav>

        <div className="lg:col-span-9">
          {loadError === "unauthorized" ? (
            <div className="space-y-3">
              {/* 401 = the session was rejected: tell the admin, never hard-redirect them here. */}
              <ErrorState
                message="The server answered 401 — your admin session is no longer valid, so nothing was loaded or saved. Sign in again and retry."
                onRetry={() => void load()}
              />
              <p className="text-center text-caption text-muted">
                <Link href={href(locale, "/login")} className="font-medium text-foreground underline-offset-4 hover:underline">
                  Go to sign in
                </Link>
              </p>
            </div>
          ) : loadError === "error" ? (
            <ErrorState message="Could not reach the admin API. Check your connection and retry." onRetry={() => void load()} />
          ) : !data ? (
            <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
          ) : (
            <div key={section} className="anim-fade-up">
              {section === "home" && <HomeSections data={data} update={update} />}
              {section === "hero" && <HeroEditor hero={data.hero} patterns={data.patterns} onChange={(hero) => update({ hero })} />}
              {section === "categories" && <CategoriesEditor data={data} update={update} />}
              {section === "patterns" && <FlagList title="Patterns" items={data.patterns} label={(p) => `${p.sku} · ${t(p.title, "en")}`} flags={["featured", "trending", "bestSeller", "isNew"]} onChange={(patterns) => update({ patterns })} viewHref={(p) => href(locale, `/patterns/${p.slug}`)} />}
              {section === "products" && <FlagList title="Products" items={data.products} label={(p) => `${p.sku} · ${t(p.title, "en")}${!p.artistId ? " · SITE" : ""}`} flags={["featured", "bestSeller", "isNew"]} onChange={(products) => update({ products })} viewHref={(p) => href(locale, `/shop/${p.slug}`)} orderable />}
              {section === "artists" && (
                <div className="space-y-6">
                  <FlagList title="Artists" items={data.artists} label={(a) => `${t(a.name, "en")} · ${t(a.profession, "en")}`} flags={["featured"]} onChange={(artists) => update({ artists })} viewHref={(a) => href(locale, `/artists/${a.slug}`)} />
                  <ArtistReviewsEditor artists={data.artists} onChange={(artists) => update({ artists })} />
                </div>
              )}
              {section === "requests" && <ArtistModeration locale={locale} />}
              {section === "portfolios" && <FlagList title="Portfolios" items={data.portfolios} label={(p) => `${t(p.title, "en")} · ${p.year}`} flags={["featured", "isProject"]} onChange={(portfolios) => update({ portfolios })} viewHref={(p) => href(locale, `/portfolio/${p.slug}`)} />}
              {section === "education" && (
                <div className="space-y-6">
                  <FlagList title="Education" items={data.education} label={(e) => `${e.type.toUpperCase()} · ${t(e.title, "en")}`} flags={["featured", "popular"]} onChange={(education) => update({ education })} viewHref={(e) => href(locale, `/academy/${e.slug}`)} />
                  <EducationPriceEditor items={data.education} onChange={(education) => update({ education })} />
                </div>
              )}
              {section === "banners" && <BannersEditor banners={data.banners} onChange={(banners) => update({ banners })} />}
              {section === "seo" && <SeoEditor seo={data.seo} onChange={(seo) => update({ seo })} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Homepage sections ---------------- */
function HomeSections({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const list = useMemo(() => data.homeSections.slice().sort((a, b) => a.order - b.order), [data.homeSections]);
  const move = (i: number, dir: -1 | 1) => {
    const next = list.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ homeSections: next.map((s, k) => ({ ...s, order: k + 1 })) });
  };
  return (
    <Card title="Homepage sections" desc="Toggle visibility and reorder the storytelling flow.">
      <ul className="divide-y divide-border">
        {list.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-3"><span className="w-6 text-caption text-muted tabular">{i + 1}</span><span className={cn("text-sm", !s.enabled && "text-muted line-through")}>{SECTION_LABELS[s.key]}</span></div>
            <div className="flex items-center gap-1">
              <IconBtn label="up" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="down" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="toggle" onClick={() => update({ homeSections: list.map((x) => (x.key === s.key ? { ...x, enabled: !x.enabled } : x)) })}>{s.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Hero ---------------- */
function HeroEditor({ hero, patterns, onChange }: { hero: HeroContent; patterns: SiteContent["patterns"]; onChange: (h: HeroContent) => void }) {
  const set = <K extends keyof HeroContent>(k: K, v: HeroContent[K]) => onChange({ ...hero, [k]: v });
  return (
    <div className="space-y-6">
      <Card title="Hero copy">
        <LocalizedField label="Eyebrow" value={hero.eyebrow} onChange={(v) => set("eyebrow", v)} />
        <LocalizedField label="Title line 1" value={hero.titleA} onChange={(v) => set("titleA", v)} />
        <LocalizedField label="Title line 2" value={hero.titleB} onChange={(v) => set("titleB", v)} />
        <LocalizedField label="Description" value={hero.description} onChange={(v) => set("description", v)} textarea />
      </Card>
      <Card title="Hero media & links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Image path"><Input value={hero.image} onChange={(e) => set("image", e.target.value)} /></Field>
          <Field label="Video path (optional)"><Input value={hero.video ?? ""} onChange={(e) => set("video", e.target.value || undefined)} placeholder="/videos/hero.mp4" /></Field>
          <Field label="Primary CTA href"><Input value={hero.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
          <Field label="Secondary CTA href"><Input value={hero.cta2Href} onChange={(e) => set("cta2Href", e.target.value)} /></Field>
        </div>
        <p className="mt-6 text-caption font-medium text-foreground-secondary">Featured patterns in hero preview</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {patterns.map((p) => {
            const on = hero.featuredPatternIds.includes(p.id);
            return <button key={p.id} onClick={() => set("featuredPatternIds", on ? hero.featuredPatternIds.filter((x) => x !== p.id) : [...hero.featuredPatternIds, p.id])} className={cn("rounded-full border px-3 py-1.5 text-caption", on ? "border-foreground bg-foreground text-background" : "border-border")}>{t(p.title, "en")}</button>;
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function CategoriesEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const cats = data.categories.slice().sort((a, b) => a.order - b.order);
  const setCat = (id: string, patch: Partial<Category>) => update({ categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const add = () => {
    const id = `c-${Date.now().toString(36)}`;
    update({ categories: [...data.categories, { id, slug: `new-${id}`, name: { fa: "دسته جدید", en: "New category" }, description: { fa: "", en: "" }, image: "/images/collections/s01.jpg", featured: false, order: data.categories.length + 1 }] });
  };
  const remove = (id: string) => {
    if (data.patterns.some((p) => p.categoryId === id)) return alert("Category is in use by patterns.");
    update({ categories: data.categories.filter((c) => c.id !== id) });
  };
  return (
    <Card title="Categories / Styles" desc="Manage the style taxonomy used by patterns, products and the Styles section." action={<Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" />Add</Button>}>
      <ul className="space-y-4">
        {cats.map((c) => (
          <li key={c.id} className="rounded-md border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Name (fa)"><Input dir="rtl" value={c.name.fa} onChange={(e) => setCat(c.id, { name: { ...c.name, fa: e.target.value } })} /></Field>
              <Field label="Name (en)"><Input value={c.name.en} onChange={(e) => setCat(c.id, { name: { ...c.name, en: e.target.value }, slug: c.slug.startsWith("new-") ? slugify(e.target.value) : c.slug })} /></Field>
              <Field label="Slug"><Input value={c.slug} onChange={(e) => setCat(c.id, { slug: e.target.value })} /></Field>
              <Field label="Image"><Input value={c.image} onChange={(e) => setCat(c.id, { image: e.target.value })} /></Field>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.featured} onChange={(e) => setCat(c.id, { featured: e.target.checked })} />Featured on homepage</label>
              <div className="flex items-center gap-2"><Badge tone="outline">{data.patterns.filter((p) => p.categoryId === c.id).length} patterns</Badge><IconBtn label="remove" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn></div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Generic flag list ---------------- */
function FlagList<T extends { id: string; order?: number }>({ title, items, label, flags, onChange, viewHref, orderable }: { title: string; items: T[]; label: (i: T) => string; flags: (keyof T & string)[]; onChange: (items: T[]) => void; viewHref: (i: T) => string; orderable?: boolean }) {
  const sorted = orderable ? items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : items;
  const move = (i: number, dir: -1 | 1) => {
    const next = sorted.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.map((x, k) => ({ ...x, order: k + 1 })));
  };
  return (
    <Card title={title} desc="Toggle the flags that drive homepage curation and badges.">
      <ul className="divide-y divide-border">
        {sorted.map((it, i) => (
          <li key={it.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {orderable && <div className="flex flex-col"><IconBtn label="up" onClick={() => move(i, -1)}><ArrowUp className="h-3 w-3" /></IconBtn><IconBtn label="down" onClick={() => move(i, 1)}><ArrowDown className="h-3 w-3" /></IconBtn></div>}
              <Link href={viewHref(it)} target="_blank" className="truncate text-sm hover:text-accent">{label(it)}</Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f) => {
                const on = Boolean(it[f]);
                return <button key={f} onClick={() => onChange(items.map((x) => (x.id === it.id ? { ...x, [f]: !on } : x)))} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary")}>{f}</button>;
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Banners ---------------- */
function BannersEditor({ banners, onChange }: { banners: Banner[]; onChange: (b: Banner[]) => void }) {
  const set = (id: string, patch: Partial<Banner>) => onChange(banners.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  return (
    <Card title="Banners" action={<Button size="sm" variant="outline" onClick={() => onChange([...banners, { id: `b-${Date.now().toString(36)}`, title: { fa: "", en: "" }, text: { fa: "", en: "" }, href: "/shop", enabled: true, placement: "shop" }])}><Plus className="h-4 w-4" />Add</Button>}>
      <ul className="space-y-4">
        {banners.map((b) => (
          <li key={b.id} className="rounded-md border border-border p-4">
            <LocalizedField label="Title" value={b.title} onChange={(v) => set(b.id, { title: v })} />
            <LocalizedField label="Text" value={b.text} onChange={(v) => set(b.id, { text: v })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Href"><Input value={b.href} onChange={(e) => set(b.id, { href: e.target.value })} /></Field>
              <Field label="Placement"><Select value={b.placement} onChange={(e) => set(b.id, { placement: e.target.value as Banner["placement"] })}><option value="top">top</option><option value="shop">shop</option><option value="academy">academy</option></Select></Field>
              <div className="flex items-end justify-between gap-2"><label className="flex items-center gap-2 text-sm pb-3"><input type="checkbox" checked={b.enabled} onChange={(e) => set(b.id, { enabled: e.target.checked })} />Enabled</label><IconBtn label="remove" onClick={() => onChange(banners.filter((x) => x.id !== b.id))}><Trash2 className="h-3.5 w-3.5" /></IconBtn></div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- SEO ---------------- */
function SeoEditor({ seo, onChange }: { seo: SeoMeta[]; onChange: (s: SeoMeta[]) => void }) {
  const set = (path: string, patch: Partial<SeoMeta>) => onChange(seo.map((s) => (s.path === path ? { ...s, ...patch } : s)));
  return (
    <Card title="SEO metadata" desc="Per-route titles and descriptions in both languages.">
      <ul className="space-y-4">
        {seo.map((s) => (
          <li key={s.path} className="rounded-md border border-border p-4">
            <p className="mb-3 font-mono text-caption text-muted">{s.path}</p>
            <LocalizedField label="Title" value={s.title} onChange={(v) => set(s.path, { title: v })} />
            <LocalizedField label="Description" value={s.description} onChange={(v) => set(s.path, { description: v })} textarea />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- primitives ---------------- */
function Card({ title, desc, action, children }: { title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">{title}</h2>{desc && <p className="mt-1 text-caption text-foreground-secondary">{desc}</p>}</div>{action}</div>
      {children}
    </section>
  );
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-secondary hover:text-foreground">{children}</button>;
}
function LocalizedField({ label, value, onChange, textarea }: { label: string; value: Localized; onChange: (v: Localized) => void; textarea?: boolean }) {
  const C = textarea ? Textarea : Input;
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (fa)`}><C dir="rtl" value={value.fa} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, fa: e.target.value })} /></Field>
      <Field label={`${label} (en)`}><C value={value.en} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, en: e.target.value })} /></Field>
    </div>
  );
}

/* ---------------- Artist reviews ---------------- */
/**
 * Testimonials shown on an artist profile. Stored on the Artist record, so a profile with no
 * reviews renders an empty state instead of filler text.
 */
function ArtistReviewsEditor({ artists, onChange }: { artists: Artist[]; onChange: (a: Artist[]) => void }) {
  const [selected, setSelected] = useState(artists[0]?.id ?? "");
  const artist = artists.find((a) => a.id === selected) ?? artists[0];
  const reviews = artist?.reviews ?? [];

  const setReviews = (next: ArtistReview[]) =>
    onChange(artists.map((a) => (a.id === artist?.id ? { ...a, reviews: next } : a)));

  if (!artist) return null;

  const patch = (id: string, p: Partial<ArtistReview>) =>
    setReviews(reviews.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <Card
      title="Artist reviews"
      desc="Shown on the public profile. Leave an artist empty and the tab shows an empty state."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setReviews([
              ...reviews,
              { id: `rev-${Date.now().toString(36)}`, author: "", text: { fa: "", en: "" }, rating: 5, date: new Date().toISOString().slice(0, 10) },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add review
        </Button>
      }
    >
      <div className="mb-4">
        <Select value={artist.id} onChange={(e) => setSelected(e.target.value)} aria-label="Artist">
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {t(a.name, "en")} ({(a.reviews ?? []).length})
            </option>
          ))}
        </Select>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          No reviews yet for this artist.
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Reviewer">
                  <Input value={r.author} onChange={(e) => patch(r.id, { author: e.target.value })} />
                </Field>
                <Field label="Rating (1-5)">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={r.rating}
                    onChange={(e) => patch(r.id, { rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })}
                  />
                </Field>
                <Field label="Date">
                  <Input type="date" value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Text (fa)">
                  <Textarea rows={2} value={r.text.fa} onChange={(e) => patch(r.id, { text: { ...r.text, fa: e.target.value } })} />
                </Field>
                <Field label="Text (en)">
                  <Textarea rows={2} dir="ltr" value={r.text.en} onChange={(e) => patch(r.id, { text: { ...r.text, en: e.target.value } })} />
                </Field>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => setReviews(reviews.filter((x) => x.id !== r.id))}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Education price ---------------- */
/**
 * Price editor. `null` means free, an absent field means "not set" — the storefront renders
 * nothing in that case rather than inventing a number.
 */
function EducationPriceEditor({ items, onChange }: { items: EducationItem[]; onChange: (e: EducationItem[]) => void }) {
  const set = (id: string, patch: Partial<EducationItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <Card title="Course prices" desc="Toman for the Persian storefront, USD for English. 'Free' stores an explicit null.">
      <ul className="divide-y divide-border">
        {items.map((it) => {
          const isFree = it.price === null;
          const unset = it.price === undefined;
          const fa = it.price?.fa ?? 0;
          const en = it.price?.en ?? 0;
          return (
            <li key={it.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t(it.title, "en")}</p>
                <p className="text-caption text-muted">{it.type}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-2 pb-2 text-caption">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => set(it.id, { price: e.target.checked ? null : { fa: fa || 0, en: en || 0 } })}
                  />
                  Free
                </label>
                <Field label="Toman">
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    disabled={isFree}
                    value={isFree ? "" : fa}
                    placeholder={unset ? "not set" : undefined}
                    onChange={(e) => set(it.id, { price: { fa: Number(e.target.value) || 0, en } })}
                  />
                </Field>
                <Field label="USD">
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    disabled={isFree}
                    value={isFree ? "" : en}
                    placeholder={unset ? "not set" : undefined}
                    onChange={(e) => set(it.id, { price: { fa, en: Number(e.target.value) || 0 } })}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
