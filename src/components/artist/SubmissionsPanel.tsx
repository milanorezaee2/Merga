"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Skeleton, SuccessState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import type { ContentStatus, EducationType, Difficulty } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Self-service for what an artist submits: portfolio works and academy items.
 *
 * Anything created here is `pending` — the list shows that state plus the admin's note, so an artist
 * always knows whether their work is live. Editing a record sends it back for review.
 */

type Kind = "portfolio" | "education";

interface Row {
  id: string;
  slug: string;
  title: Localized;
  subtitle?: Localized;
  excerpt?: Localized;
  cover?: string;
  image?: string;
  year?: number;
  type?: string;
  difficulty?: string;
  durationMin?: number;
  lessons?: number;
  price?: { fa: number; en: number } | null;
  status: ContentStatus;
  submittedAt?: string;
  reviewNote?: string;
}

const STATUS_TONE: Record<ContentStatus, "warning" | "success" | "error"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

export function SubmissionsPanel({ kind, fa }: { kind: Kind; fa: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: Localized }[]>([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch(`/api/artist/content?kind=${kind}`, { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`artist/content → ${r.status}`);
      const d = (await r.json()) as { ok: boolean; portfolios: Row[]; education: Row[]; categories: { id: string; name: Localized }[] };
      setRows(kind === "portfolio" ? d.portfolios : d.education);
      setCategories(d.categories ?? []);
    } catch {
      setError(true);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? "").trim();
    const num = (k: string, fallback: number) => {
      const n = Number(str(k));
      return Number.isFinite(n) ? n : fallback;
    };

    const payload: Record<string, unknown> =
      kind === "portfolio"
        ? {
            kind,
            title: { fa: str("title-fa"), en: str("title-en") },
            subtitle: { fa: str("subtitle-fa"), en: str("subtitle-en") },
            intro: { fa: str("intro-fa"), en: str("intro-en") },
            cover: str("cover"),
            client: { fa: str("client-fa"), en: str("client-en") },
            location: { fa: str("location-fa"), en: str("location-en") },
            scope: { fa: str("scope-fa"), en: str("scope-en") },
            year: num("year", new Date().getFullYear()),
            categoryId: str("categoryId"),
          }
        : {
            kind,
            type: (str("type") || "course") as EducationType,
            title: { fa: str("title-fa"), en: str("title-en") },
            excerpt: { fa: str("excerpt-fa"), en: str("excerpt-en") },
            body: { fa: str("body-fa"), en: str("body-en") },
            image: str("image"),
            difficulty: (str("difficulty") || "beginner") as Difficulty,
            durationMin: num("durationMin", 0),
            lessons: num("lessons", 0),
            categoryId: str("categoryId"),
            price: str("price-free") === "yes" ? null : { fa: num("price-fa", 0), en: num("price-en", 0) },
          };

    try {
      const r = await fetch("/api/artist/content", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("create_failed");
      setDone(true);
      setOpen(false);
      e.currentTarget.reset();
      await load();
      setTimeout(() => setDone(false), 4000);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/artist/content?id=${encodeURIComponent(id)}&kind=${kind}`, { ...SESSION_FETCH, method: "DELETE" });
      if (!r.ok) throw new Error("delete_failed");
      setRows((list) => (list ?? []).filter((x) => x.id !== id));
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  if (error && !rows) return <ErrorState message={fa ? "خطا در بارگذاری." : "Could not load your submissions."} onRetry={() => void load()} />;
  if (!rows) return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background-secondary/40 p-5">
        <h2 className="font-display text-h3">{kind === "portfolio" ? (fa ? "نمونه‌کارها" : "Portfolio works") : fa ? "دوره‌ها و آموزش‌ها" : "Courses & lessons"}</h2>
        <p className="mt-1 text-body-sm text-foreground-secondary">
          {fa
            ? "هر موردی که ثبت کنید در وضعیت «در انتظار بررسی» می‌ماند و پس از تأیید مدیر روی سایت نمایش داده می‌شود. ویرایش یک موردِ تأییدشده، آن را دوباره به صف بررسی برمی‌گرداند."
            : "Everything you submit stays pending until an admin approves it, and editing an approved item sends it back for review."}
        </p>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
            {open ? (fa ? "بستن فرم" : "Close form") : kind === "portfolio" ? (fa ? "افزودن نمونه‌کار" : "Add a work") : fa ? "افزودن دوره" : "Add a course"}
          </Button>
        </div>
      </div>

      {done && <SuccessState message={fa ? "ارسال شد — در انتظار بررسی مدیر" : "Submitted — waiting for review"} />}

      {open && (
        <form onSubmit={submit} className="space-y-5 rounded-xl border border-border p-5">
          {kind === "education" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={fa ? "نوع" : "Type"}>
                <Select name="type" defaultValue="course">
                  <option value="course">{fa ? "دوره" : "Course"}</option>
                  <option value="tutorial">{fa ? "آموزش" : "Tutorial"}</option>
                  <option value="article">{fa ? "مقاله" : "Article"}</option>
                  <option value="path">{fa ? "مسیر یادگیری" : "Learning path"}</option>
                </Select>
              </Field>
              <Field label={fa ? "سطح" : "Level"}>
                <Select name="difficulty" defaultValue="beginner">
                  <option value="beginner">{fa ? "مقدماتی" : "Beginner"}</option>
                  <option value="intermediate">{fa ? "متوسط" : "Intermediate"}</option>
                  <option value="advanced">{fa ? "پیشرفته" : "Advanced"}</option>
                </Select>
              </Field>
              <Field label={fa ? "دسته" : "Category"}>
                <Select name="categoryId" defaultValue={categories[0]?.id ?? ""}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.fa || c.name.en}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "عنوان (فارسی)" : "Title (Persian)"}>
              <Input name="title-fa" required />
            </Field>
            <Field label={fa ? "عنوان (انگلیسی)" : "Title (English)"}>
              <Input name="title-en" dir="ltr" />
            </Field>
          </div>

          {kind === "portfolio" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={fa ? "زیرعنوان (فارسی)" : "Subtitle (Persian)"}>
                  <Input name="subtitle-fa" />
                </Field>
                <Field label={fa ? "زیرعنوان (انگلیسی)" : "Subtitle (English)"}>
                  <Input name="subtitle-en" dir="ltr" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={fa ? "روایت پروژه (فارسی)" : "Project story (Persian)"}>
                  <Textarea name="intro-fa" rows={4} />
                </Field>
                <Field label={fa ? "روایت پروژه (انگلیسی)" : "Project story (English)"}>
                  <Textarea name="intro-en" rows={4} dir="ltr" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label={fa ? "کارفرما (فارسی)" : "Client (Persian)"}>
                  <Input name="client-fa" />
                </Field>
                <Field label={fa ? "کارفرما (انگلیسی)" : "Client (English)"}>
                  <Input name="client-en" dir="ltr" />
                </Field>
                <Field label={fa ? "مکان" : "Location"}>
                  <Input name="location-fa" />
                </Field>
                <Field label={fa ? "سال" : "Year"}>
                  <Input name="year" type="number" defaultValue={new Date().getFullYear()} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={fa ? "دامنه‌ی کار" : "Scope"}>
                  <Input name="scope-fa" />
                </Field>
                <Field label={fa ? "دسته" : "Category"}>
                  <Select name="categoryId" defaultValue={categories[0]?.id ?? ""}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name.fa || c.name.en}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={fa ? "تصویر کاور" : "Cover image"} hint={fa ? "از «بارگذاری فایل» یا یک آدرس تصویر" : "Use the upload endpoint or a URL"}>
                  <Input name="cover" dir="ltr" placeholder="/uploads/…" />
                </Field>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={fa ? "خلاصه (فارسی)" : "Excerpt (Persian)"}>
                  <Textarea name="excerpt-fa" rows={3} />
                </Field>
                <Field label={fa ? "خلاصه (انگلیسی)" : "Excerpt (English)"}>
                  <Textarea name="excerpt-en" rows={3} dir="ltr" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={fa ? "متن درس (فارسی)" : "Lesson text (Persian)"}>
                  <Textarea name="body-fa" rows={5} />
                </Field>
                <Field label={fa ? "متن درس (انگلیسی)" : "Lesson text (English)"}>
                  <Textarea name="body-en" rows={5} dir="ltr" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label={fa ? "مدت (دقیقه)" : "Duration (min)"}>
                  <Input name="durationMin" type="number" defaultValue={0} />
                </Field>
                <Field label={fa ? "تعداد درس" : "Lesson count"}>
                  <Input name="lessons" type="number" defaultValue={0} />
                </Field>
                <Field label={fa ? "قیمت (تومان)" : "Price (Toman)"}>
                  <Input name="price-fa" type="number" defaultValue={0} />
                </Field>
                <Field label={fa ? "قیمت (دلار)" : "Price (USD)"}>
                  <Input name="price-en" type="number" defaultValue={0} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                <input type="checkbox" name="price-free" value="yes" className="h-4 w-4" />
                {fa ? "رایگان است (قیمت نادیده گرفته می‌شود)" : "This is free (prices are ignored)"}
              </label>
              <Field label={fa ? "تصویر" : "Image"}>
                <Input name="image" dir="ltr" placeholder="/uploads/…" />
              </Field>
            </>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? (fa ? "در حال ارسال…" : "Submitting…") : fa ? "ارسال برای بررسی" : "Submit for review"}
            </Button>
            {error && (
              <span className="inline-flex items-center gap-1.5 text-sm text-error">
                <AlertCircle className="h-4 w-4" />
                {fa ? "ارسال نشد" : "Could not submit"}
              </span>
            )}
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={fa ? "هنوز موردی ثبت نکرده‌اید" : "Nothing submitted yet"}
          description={
            kind === "portfolio"
              ? fa ? "اولین نمونه‌کار خود را اضافه کنید تا پس از تأیید در پروفایل عمومی دیده شود." : "Add your first work — it appears on your public profile once approved."
              : fa ? "اولین دوره یا آموزش خود را اضافه کنید." : "Add your first course or lesson."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{fa ? r.title.fa || r.title.en : r.title.en || r.title.fa}</span>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </p>
                <p className="mt-0.5 text-caption text-muted">
                  {fa ? (r.subtitle?.fa || r.excerpt?.fa || r.slug) : (r.subtitle?.en || r.excerpt?.en || r.slug)}
                  {r.submittedAt ? ` · ${r.submittedAt.slice(0, 10)}` : ""}
                </p>
                {r.reviewNote && (
                  <p className="mt-1 text-caption text-foreground-secondary">
                    {fa ? "یادداشت مدیر: " : "Admin note: "}
                    {r.reviewNote}
                  </p>
                )}
              </div>
              <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void remove(r.id)}>
                {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {fa ? "حذف" : "Delete"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {rows.some((r) => r.status === "approved") && (
        <p className="flex items-center gap-2 text-caption text-muted">
          <Check className="h-4 w-4" />
          {fa ? "موارد تأییدشده روی سایت عمومی نمایش داده می‌شوند." : "Approved items are live on the public site."}
        </p>
      )}
    </div>
  );
}
