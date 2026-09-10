"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  ExternalLink,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { href, formatPrice } from "@/lib/utils";
import type { Colorway, Pattern, Product } from "@/lib/types";

type Tab = "patterns" | "products" | "stats";

interface ArtistData {
  patterns: Pattern[];
  products: Product[];
}

type FormMode = "idle" | "new-pattern" | "new-product" | "edit-pattern" | "edit-product";

/* ------------------------------------------------------------------ */
/* Main Dashboard                                                        */
/* ------------------------------------------------------------------ */
export function ArtistDashboard() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const fa = locale === "fa";

  const [data, setData] = useState<ArtistData | null>(null);
  const [tab, setTab] = useState<Tab>("patterns");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editTarget, setEditTarget] = useState<Pattern | Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/artist/patterns", { ...SESSION_FETCH });
      if (!r.ok) throw new Error();
      const d = await r.json() as ArtistData & { ok: boolean };
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const deleteItem = async (id: string, type: "pattern" | "product") => {
    if (!confirm(fa ? "حذف شود؟" : "Delete this item?")) return;
    await fetch(`/api/artist/patterns?id=${id}&type=${type}`, { ...SESSION_FETCH, method: "DELETE" });
    void load();
  };

  const handleFormSaved = () => {
    setFormMode("idle");
    setEditTarget(null);
    void load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={fa ? "خطا در بارگذاری اطلاعات." : "Could not load your data."} onRetry={load} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "patterns", label: fa ? `الگوها (${data?.patterns.length ?? 0})` : `Patterns (${data?.patterns.length ?? 0})`, icon: <BarChart3 className="h-4 w-4" /> },
    { id: "products", label: fa ? `محصولات (${data?.products.length ?? 0})` : `Products (${data?.products.length ?? 0})`, icon: <PackagePlus className="h-4 w-4" /> },
    { id: "stats", label: fa ? "آمار" : "Stats", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label text-accent">{fa ? "داشبورد هنرمند" : "Artist Dashboard"}</p>
          <h1 className="mt-2 font-display text-h1">{fa ? `سلام، ${user?.name}` : `Hello, ${user?.name}`}</h1>
          <p className="mt-1 text-sm text-foreground-secondary" dir="ltr">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setEditTarget(null); setFormMode("new-pattern"); }}
          >
            <Plus className="h-4 w-4" />
            {fa ? "الگوی جدید" : "New pattern"}
          </Button>
          <Button
            onClick={() => { setEditTarget(null); setFormMode("new-product"); }}
          >
            <Plus className="h-4 w-4" />
            {fa ? "محصول جدید" : "New product"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground-secondary hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "patterns" && (
          <ItemGrid
            items={data?.patterns ?? []}
            type="pattern"
            fa={fa}
            locale={locale}
            onEdit={(item) => { setEditTarget(item); setFormMode("edit-pattern"); }}
            onDelete={(id) => deleteItem(id, "pattern")}
          />
        )}
        {tab === "products" && (
          <ItemGrid
            items={data?.products ?? []}
            type="product"
            fa={fa}
            locale={locale}
            onEdit={(item) => { setEditTarget(item); setFormMode("edit-product"); }}
            onDelete={(id) => deleteItem(id, "product")}
          />
        )}
        {tab === "stats" && <StatsPanel data={data} fa={fa} locale={locale} />}
      </div>

      {/* Slide-in Form Panel */}
      {formMode !== "idle" && (
        <FormPanel
          mode={formMode}
          initial={editTarget}
          fa={fa}
          onSaved={handleFormSaved}
          onClose={() => { setFormMode("idle"); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item Grid                                                             */
/* ------------------------------------------------------------------ */
function ItemGrid({
  items,
  type,
  fa,
  locale,
  onEdit,
  onDelete,
}: {
  items: (Pattern | Product)[];
  type: "pattern" | "product";
  fa: boolean;
  locale: string;
  onEdit: (item: Pattern | Product) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={fa ? `هنوز ${type === "pattern" ? "الگویی" : "محصولی"} ندارید.` : `No ${type}s yet.`}
        description={fa ? "اولین آیتم خود را اضافه کنید." : "Add your first item."}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const image = "image" in item ? item.image : (("colors" in item && item.colors[0]?.image) || "/images/collections/s01.jpg");
        const title = typeof item.title === "object" ? (locale === "fa" ? item.title.fa : item.title.en) : item.title;
        const slug = item.slug;
        const viewPath = type === "pattern" ? `/patterns/${slug}` : `/shop/${slug}`;

        return (
          <li key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface">
            <div className="relative aspect-square overflow-hidden">
              <Image src={image} alt="" fill sizes="280px" className="object-cover transition-transform group-hover:scale-105" />
              {item.isNew && (
                <span className="absolute left-2 top-2">
                  <Badge tone="accent">{fa ? "جدید" : "New"}</Badge>
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-caption text-foreground-secondary" dir="ltr">{item.sku}</p>
              {(() => {
                const dots =
                  type === "pattern" && "colorways" in item && item.colorways?.length
                    ? item.colorways
                    : type === "product" && "colors" in item && item.colors?.length
                      ? item.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, image: c.image }))
                      : [];
                if (!dots.length) return null;
                return (
                  <div className="mt-2 flex items-center gap-1.5">
                    {dots.slice(0, 6).map((d) => (
                      <span key={d.id} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: d.hex }} title={typeof d.name === "object" ? d.name.en : ""} />
                    ))}
                    {dots.length > 6 && <span className="text-[10px] text-muted">+{dots.length - 6}</span>}
                  </div>
                );
              })()}
              <p className="mt-1 text-sm font-semibold tabular">
                {formatPrice(item.price, locale as "fa" | "en")}
              </p>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {fa ? "ویرایش" : "Edit"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  href={href(locale as "fa" | "en", viewPath)}
                  external
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Stats Panel                                                           */
/* ------------------------------------------------------------------ */
function StatsPanel({ data, fa, locale }: { data: ArtistData | null; fa: boolean; locale: string }) {
  const totalPatterns = data?.patterns.length ?? 0;
  const totalProducts = data?.products.length ?? 0;
  const totalLikes = data?.patterns.reduce((n, p) => n + (p.likes ?? 0), 0) ?? 0;
  const avgPrice =
    totalPatterns > 0
      ? (data?.patterns.reduce((n, p) => n + p.price[locale === "fa" ? "fa" : "en"], 0) ?? 0) / totalPatterns
      : 0;

  const stats = [
    { label: fa ? "تعداد الگوها" : "Total patterns", value: totalPatterns },
    { label: fa ? "تعداد محصولات" : "Total products", value: totalProducts },
    { label: fa ? "مجموع لایک‌ها" : "Total likes", value: totalLikes },
    {
      label: fa ? "میانگین قیمت الگو" : "Avg pattern price",
      value: locale === "fa" ? `${avgPrice.toLocaleString("fa-IR")} ت` : `$${avgPrice.toFixed(0)}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-surface p-5">
          <p className="text-caption text-foreground-secondary">{s.label}</p>
          <p className="mt-2 font-display text-h2 tabular">{s.value}</p>
        </div>
      ))}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Colourway editor (Spoonflower-style multi-colour upload)            */
/* ------------------------------------------------------------------ */
function ColorwayEditor({
  fa,
  initial,
}: {
  fa: boolean;
  initial?: Colorway[] | { id: string; name: { fa: string; en: string }; hex: string; image: string; stock?: number }[];
}) {
  type Row = { nameFa: string; nameEn: string; hex: string; image: string; stock: string };
  const seed: Row[] =
    initial && initial.length
      ? initial.map((c) => ({
          nameFa: c.name?.fa ?? "",
          nameEn: c.name?.en ?? "",
          hex: c.hex ?? "#888888",
          image: ("image" in c ? c.image : "") || "",
          stock: String(("stock" in c ? (c as { stock?: number }).stock : 12) ?? 12),
        }))
      : [{ nameFa: fa ? "اصلی" : "Default", nameEn: "Default", hex: "#8fa08e", image: "", stock: "12" }];

  const [rows, setRows] = useState<Row[]>(seed);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const add = () =>
    setRows((r) => [...r, { nameFa: "", nameEn: "", hex: "#c99a92", image: "", stock: "12" }]);

  const remove = (i: number) => setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));

  return (
    <div className="rounded-lg border border-border bg-background-secondary/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fa ? "رنگ‌بندی‌ها (Colorways)" : "Colourways"}</p>
          <p className="mt-0.5 text-caption text-foreground-secondary">
            {fa
              ? "مثل Spoonflower: هر رنگ یک پیش‌نمایش جدا دارد و روی کارت به‌صورت دایره نمایش داده می‌شود."
              : "Spoonflower-style: each colour has its own preview and shows as a circle on cards."}
          </p>
        </div>
        <button type="button" onClick={add} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-caption font-medium hover:border-foreground">
          <Plus className="h-3.5 w-3.5" />
          {fa ? "افزودن رنگ" : "Add colour"}
        </button>
      </div>
      <input type="hidden" name="colorway_count" value={rows.length} />
      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-md border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: row.hex || "#ccc" }} />
                <span className="text-caption text-muted">{fa ? `رنگ ${i + 1}` : `Colour ${i + 1}`}{i === 0 ? (fa ? " · پیش‌فرض" : " · default") : ""}</span>
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="text-caption text-error hover:underline">
                  {fa ? "حذف" : "Remove"}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name={`cw_name_fa_${i}`} dir="rtl" placeholder={fa ? "نام فارسی" : "Name (fa)"} value={row.nameFa} onChange={(e) => update(i, { nameFa: e.target.value })} />
              <Input name={`cw_name_en_${i}`} dir="ltr" placeholder="Name (en)" value={row.nameEn} onChange={(e) => update(i, { nameEn: e.target.value })} />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="hex"
                  value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#888888"}
                  onChange={(e) => update(i, { hex: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input name={`cw_hex_${i}`} dir="ltr" placeholder="#8fa08e" value={row.hex} onChange={(e) => update(i, { hex: e.target.value })} className="flex-1" />
              </div>
              <Input name={`cw_image_${i}`} dir="ltr" placeholder="/images/..." value={row.image} onChange={(e) => update(i, { image: e.target.value })} />
              <Input name={`cw_stock_${i}`} type="number" min={0} dir="ltr" placeholder="Stock" value={row.stock} onChange={(e) => update(i, { stock: e.target.value })} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form Panel (slide-in overlay)                                         */
/* ------------------------------------------------------------------ */
function FormPanel({
  mode,
  initial,
  fa,
  onSaved,
  onClose,
}: {
  mode: FormMode;
  initial: Pattern | Product | null;
  fa: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isProduct = mode === "new-product" || mode === "edit-product";
  const isEdit = mode === "edit-pattern" || mode === "edit-product";

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);

    const priceFa = Number(fd.get("price_fa")) || 0;
    const priceEn = Number(fd.get("price_en")) || 0;

    // Parse colourways from dynamic form rows (Spoonflower-style)
    const colorways: Colorway[] = [];
    if (!isProduct) {
      const count = Number(fd.get("colorway_count") || 0);
      for (let i = 0; i < count; i++) {
        const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
        const img = String(fd.get(`cw_image_${i}`) || "").trim();
        const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
        const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
        if (!hex && !img) continue;
        colorways.push({
          id: `cw-${i}-${Date.now().toString(36)}`,
          name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` },
          hex: hex || "#888888",
          image: img || String(fd.get("image") || "/images/collections/s01.jpg"),
          isDefault: i === 0,
        });
      }
    }

    const payload: Record<string, unknown> = {
      _type: isProduct ? "product" : "pattern",
      ...(isEdit && initial ? { id: initial.id } : {}),
      title: { fa: String(fd.get("title_fa") || ""), en: String(fd.get("title_en") || "") },
      description: { fa: String(fd.get("desc_fa") || ""), en: String(fd.get("desc_en") || "") },
      price: { fa: priceFa, en: priceEn },
      slug: String(fd.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
      sku: String(fd.get("sku") || ""),
      image: isProduct ? undefined : (colorways[0]?.image || String(fd.get("image") || "/images/collections/s01.jpg")),
      ...( !isProduct ? {
        colorways,
        palette: colorways.map((c) => c.hex),
        specs: {
          repeat: { fa: String(fd.get("repeat_fa") || "تکرار کامل"), en: String(fd.get("repeat_en") || "Full repeat") },
          dpi: String(fd.get("dpi") || "300 DPI"),
          formats: String(fd.get("formats") || "AI · PDF · TIFF"),
          colors: colorways.length || Number(fd.get("color_count") || 1),
          scale: { fa: String(fd.get("scale_fa") || "متوسط"), en: String(fd.get("scale_en") || "Medium") },
        },
      } : {}),
      ...( isProduct ? {
        colors: (() => {
          const count = Number(fd.get("colorway_count") || 0);
          const cols = [];
          for (let i = 0; i < count; i++) {
            const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
            const img = String(fd.get(`cw_image_${i}`) || "").trim();
            const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
            const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
            if (!hex && !img) continue;
            cols.push({
              id: `col-${i}`,
              name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` },
              hex: hex || "#888888",
              image: img || "/images/collections/s01.jpg",
              stock: Number(fd.get(`cw_stock_${i}`) || 12),
            });
          }
          return cols;
        })(),
      } : {}),
    };

    try {
      const r = await fetch("/api/artist/patterns", {
        ...SESSION_FETCH,
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      onSaved();
    } catch {
      setErr(fa ? "خطایی رخ داد. دوباره تلاش کنید." : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pat = !isProduct && initial ? (initial as Pattern) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="ltr">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-background shadow-xl" dir={fa ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold">
            {isEdit
              ? (fa ? `ویرایش ${isProduct ? "محصول" : "الگو"}` : `Edit ${isProduct ? "product" : "pattern"}`)
              : (fa ? `افزودن ${isProduct ? "محصول" : "الگو"}ی جدید` : `Add new ${isProduct ? "product" : "pattern"}`)}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-background-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "عنوان (فارسی)" : "Title (fa)"}>
              <Input name="title_fa" required dir="rtl" defaultValue={initial?.title?.fa ?? ""} />
            </Field>
            <Field label={fa ? "عنوان (انگلیسی)" : "Title (en)"}>
              <Input name="title_en" required defaultValue={initial?.title?.en ?? ""} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug">
              <Input name="slug" required dir="ltr" defaultValue={initial?.slug ?? ""} placeholder="my-pattern-name" />
            </Field>
            <Field label="SKU">
              <Input name="sku" required dir="ltr" defaultValue={initial?.sku ?? ""} placeholder="PAT-001" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "قیمت (تومان)" : "Price (IRT)"}>
              <Input name="price_fa" type="number" min={0} required dir="ltr" defaultValue={initial?.price?.fa ?? 0} />
            </Field>
            <Field label={fa ? "قیمت (دلار)" : "Price (USD)"}>
              <Input name="price_en" type="number" min={0} step="0.01" required dir="ltr" defaultValue={initial?.price?.en ?? 0} />
            </Field>
          </div>

          {!isProduct && (
            <Field label={fa ? "مسیر تصویر" : "Image path"}>
              <Input name="image" dir="ltr" defaultValue={pat?.image ?? "/images/collections/s01.jpg"} placeholder="/images/..." />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "توضیحات (فارسی)" : "Description (fa)"}>
              <Textarea name="desc_fa" dir="rtl" rows={3} defaultValue={initial?.description?.fa ?? ""} />
            </Field>
            <Field label={fa ? "توضیحات (انگلیسی)" : "Description (en)"}>
              <Textarea name="desc_en" rows={3} defaultValue={initial?.description?.en ?? ""} />
            </Field>
          </div>

          <ColorwayEditor
            fa={fa}
            initial={
              isProduct
                ? ((initial as Product | null)?.colors?.map((c) => ({
                    id: c.id,
                    name: c.name,
                    hex: c.hex,
                    image: c.image,
                    stock: c.stock,
                  })) as Colorway[] | undefined)
                : ((initial as Pattern | null)?.colorways ?? undefined)
            }
          />

          {err && <p className="text-sm text-error">{err}</p>}

          <div className="mt-auto flex gap-2 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? (fa ? "ذخیره تغییرات" : "Save changes") : (fa ? "ایجاد" : "Create")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>{fa ? "لغو" : "Cancel"}</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
