"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  BookOpen,
  Play,
  Users,
  Calendar,
  Clock,
  Signal,
  Star,
  ChevronDown,
  CheckCircle2,
  Video,
  Layers,
  Award,
  Filter,
  X,
  ShoppingCart,
  Zap,
  Globe,
  Wifi,
} from "lucide-react";
import { cn, faNum, formatDuration, href, t } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/providers/AppProviders";
import type { EducationCardData } from "@/components/cards/EducationCard";
import type { Category } from "@/lib/types";

/* ─── Types ─────────────────────────────────────────────────── */
type Tab = "all" | "course" | "workshop" | "webinar" | "tutorial";
type SortKey = "popular" | "newest" | "price_asc" | "price_desc";

interface Props {
  items: EducationCardData[];
  categories: Category[];
}

/* ─── Deterministic price simulation (no type changes needed) ── */
function getPrice(item: EducationCardData, locale: "fa" | "en"): { value: number; isFree: boolean } {
  // Free if it's a very short tutorial (< 30 min) or article
  if (item.type === "article" || item.durationMin < 30) return { value: 0, isFree: true };
  // Deterministic price based on item id hash
  const hash = item.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  if (locale === "fa") {
    const base = [490_000, 690_000, 980_000, 1_200_000, 1_490_000];
    return { value: base[hash % base.length], isFree: false };
  } else {
    const base = [29, 49, 69, 89, 119];
    return { value: base[hash % base.length], isFree: false };
  }
}

function formatItemPrice(item: EducationCardData, locale: "fa" | "en"): string {
  const { value, isFree } = getPrice(item, locale);
  if (isFree) return locale === "fa" ? "رایگان" : "Free";
  if (locale === "fa") return `${faNum(value.toLocaleString("en-US"))} تومان`;
  return `$${value}`;
}

/* ─── Enroll / Buy Modal ─────────────────────────────────────── */
function EnrollModal({ item, onClose }: { item: EducationCardData; onClose: () => void }) {
  const { locale, dict } = useLocale();
  const [step, setStep] = useState<"details" | "form" | "success">("details");
  const [, startTransition] = useTransition();
  const isFA = locale === "fa";
  const { value: priceValue, isFree } = getPrice(item, locale);
  const currency = isFA ? "تومان" : "USD";
  const priceStr = isFree ? (isFA ? "رایگان" : "Free") : (isFA ? `${faNum(priceValue.toLocaleString("en-US"))}` : `$${priceValue}`);

  const typeLabel = isFA
    ? item.type === "course" ? "دوره آموزشی"
    : item.type === "tutorial" ? "آموزش ویدیویی"
    : item.type === "path" ? "مسیر یادگیری"
    : "مقاله / وبینار"
    : item.type === "course" ? "Course"
    : item.type === "tutorial" ? "Tutorial"
    : item.type === "path" ? "Learning Path"
    : "Article / Webinar";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => setStep("success"));
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0a0d13]/75 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div className="relative h-40 overflow-hidden bg-[#0f141c]">
          <Image src={item.image} alt="" fill sizes="600px" className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f141c]/80 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-caption text-white/70">{typeLabel}</p>
            <h3 className="font-semibold text-white text-balance line-clamp-2">{t(item.title, locale)}</h3>
          </div>
        </div>

        <div className="p-6">
          {step === "details" && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
                  <Clock className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary">{formatDuration(item.durationMin, locale, dict.common)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
                  <Signal className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary">{dict.common[item.difficulty]}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
                  <Layers className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary">
                    {isFA ? faNum(item.lessons) : item.lessons} {dict.common.lessons}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
                  <Award className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary">{isFA ? "گواهینامه" : "Certificate"}</span>
                </div>
              </div>

              {/* What you'll learn */}
              <div className="mb-5 rounded-lg border border-border p-4">
                <p className="text-caption font-semibold text-foreground mb-3">{isFA ? "در این دوره یاد می‌گیرید:" : "What you'll learn:"}</p>
                <ul className="space-y-2">
                  {[
                    isFA ? "مفاهیم پایه‌ای طراحی" : "Core design concepts",
                    isFA ? "تکنیک‌های حرفه‌ای" : "Professional techniques",
                    isFA ? "پروژه عملی نهایی" : "Hands-on final project",
                  ].map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-5">
                <div>
                  {isFree ? (
                    <p className="font-display text-h3 text-success">{dict.common.free}</p>
                  ) : (
                    <p className="font-display text-h3 text-foreground tabular">
                      {priceStr}
                      {!isFree && <span className="ms-1 text-caption font-normal text-foreground-secondary">{currency}</span>}
                    </p>
                  )}
                </div>
                <Button onClick={() => setStep("form")} size="lg" variant="accent">
                  <ShoppingCart className="h-4 w-4" />
                  {isFree ? (isFA ? "ثبت‌نام رایگان" : "Enroll Free") : (isFA ? "خرید و ثبت‌نام" : "Buy & Enroll")}
                </Button>
              </div>
            </>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h4 className="font-semibold text-foreground">{isFA ? "اطلاعات ثبت‌نام" : "Enrollment details"}</h4>
              <div>
                <label className="mb-1.5 block text-caption text-foreground-secondary">{dict.common.name}</label>
                <input
                  required
                  type="text"
                  placeholder={isFA ? "نام و نام خانوادگی" : "Full name"}
                  className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-caption text-foreground-secondary">{dict.common.email}</label>
                <input
                  required
                  type="email"
                  placeholder={isFA ? "ایمیل شما" : "Your email"}
                  className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              {!isFree && (
                <div>
                  <label className="mb-1.5 block text-caption text-foreground-secondary">{dict.common.phone}</label>
                  <input
                    type="tel"
                    placeholder={isFA ? "شماره تماس" : "Phone number"}
                    className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("details")}>
                  {isFA ? "بازگشت" : "Back"}
                </Button>
                <Button type="submit" variant="accent" className="flex-1">
                  {isFree ? (isFA ? "ثبت‌نام" : "Enroll") : (isFA ? "پرداخت" : "Pay now")}
                </Button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-success" />
              <h4 className="font-display text-h3 text-foreground">{isFA ? "ثبت‌نام موفق!" : "You're enrolled!"}</h4>
              <p className="mt-2 text-body-sm text-foreground-secondary">
                {isFA ? "لینک دسترسی به ایمیل شما ارسال شد." : "Access link has been sent to your email."}
              </p>
              <Button className="mt-6" onClick={onClose}>{isFA ? "بازگشت به آکادمی" : "Back to Academy"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-5 text-center">
      <Icon className="h-5 w-5 text-accent" />
      <span className="font-display text-h2 text-foreground tabular">{value}</span>
      <span className="text-caption text-foreground-secondary">{label}</span>
    </div>
  );
}

/* ─── Course Card (grid) ─────────────────────────────────────── */
function CourseCard({ item, onEnroll }: { item: EducationCardData; onEnroll: (item: EducationCardData) => void }) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const { isFree } = getPrice(item, locale);
  const priceStr = formatItemPrice(item, locale);
  const url = href(locale, `/academy/${item.slug}`);

  const typeColors: Record<string, string> = {
    course: "bg-blue/10 text-blue",
    tutorial: "bg-accent-soft text-accent",
    path: "bg-[#7c3aed]/10 text-[#7c3aed]",
    article: "bg-success/10 text-success",
  };
  const typeLabels: Record<string, string> = {
    course: isFA ? "دوره" : "Course",
    tutorial: isFA ? "آموزش" : "Tutorial",
    path: isFA ? "مسیر" : "Path",
    article: isFA ? "مقاله" : "Article",
  };

  // Deterministic star rating
  const ratingHash = item.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratingDecimal = (ratingHash % 9) + 1;
  const ratingStr = `4.${ratingDecimal}`;
  const reviewCount = 20 + (ratingHash % 80);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-medium">
      {/* Thumbnail */}
      <Link href={url} className="relative block aspect-[16/9] overflow-hidden bg-background-secondary">
        <Image
          src={item.image}
          alt={t(item.title, locale)}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="img-zoom object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* Type badge */}
        <div className="absolute left-3 top-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium backdrop-blur-sm", typeColors[item.type] ?? typeColors.course)}>
            {typeLabels[item.type] ?? dict.common[item.type]}
          </span>
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-5 w-5 fill-white text-white ms-0.5" />
          </div>
        </div>
        {/* Popular badge */}
        {item.popular && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/90 px-2.5 py-0.5 text-caption font-medium text-white backdrop-blur-sm">
              <Zap className="h-3 w-3 fill-current" />
              {isFA ? "محبوب" : "Popular"}
            </span>
          </div>
        )}
        {/* Featured ribbon */}
        {item.featured && !item.popular && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-0.5 text-caption font-medium text-white backdrop-blur-sm">
              {isFA ? "منتخب" : "Featured"}
            </span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {item.category && (
          <p className="text-caption text-accent mb-1.5">{t(item.category.name, locale)}</p>
        )}
        <Link href={url} className="block font-semibold text-foreground hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
          {t(item.title, locale)}
        </Link>
        <p className="text-body-sm text-foreground-secondary line-clamp-2 mb-4">{t(item.excerpt, locale)}</p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-foreground-secondary mb-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(item.durationMin, locale, dict.common)}
          </span>
          {item.lessons > 1 && (
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {isFA ? faNum(item.lessons) : item.lessons} {dict.common.lessons}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" />
            {dict.common[item.difficulty]}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1 text-caption mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={cn("h-3.5 w-3.5", s <= 4 ? "fill-warning text-warning" : "fill-muted/30 text-muted")} />
          ))}
          <span className="text-foreground-secondary ms-1.5 tabular">{isFA ? faNum(ratingStr) : ratingStr}</span>
          <span className="text-muted ms-0.5">({isFA ? faNum(reviewCount) : reviewCount})</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          {/* Instructor */}
          {item.author ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <Image src={item.author.avatar} alt="" fill sizes="28px" className="object-cover" />
              </span>
              <span className="truncate text-caption text-foreground-secondary">{t(item.author.name, locale)}</span>
            </div>
          ) : (
            <span />
          )}
          {/* Price */}
          <div className="shrink-0">
            {isFree ? (
              <span className="font-semibold text-success">{dict.common.free}</span>
            ) : (
              <span className="font-display text-h4 text-foreground tabular">{priceStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onEnroll(item)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[0.98]"
        >
          {isFree
            ? (isFA ? "ثبت‌نام رایگان" : "Enroll Free")
            : (isFA ? "خرید دوره" : "Buy Course")}
        </button>
      </div>
    </article>
  );
}

/* ─── Event / Workshop Row ───────────────────────────────────── */
function EventRow({ item, onEnroll }: { item: EducationCardData; onEnroll: (item: EducationCardData) => void }) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const { isFree } = getPrice(item, locale);
  const priceStr = formatItemPrice(item, locale);
  const url = href(locale, `/academy/${item.slug}`);

  return (
    <Reveal>
      <div className="group flex flex-col gap-5 overflow-hidden rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-medium sm:flex-row sm:items-center">
        <Link href={url} className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-background-secondary sm:h-24 sm:w-36">
          <Image src={item.image} alt="" fill sizes="144px" className="img-zoom object-cover" />
        </Link>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium",
              item.type === "path" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "bg-success/10 text-success"
            )}>
              {item.type === "path"
                ? <><Layers className="h-3 w-3" />{isFA ? "مسیر یادگیری" : "Learning Path"}</>
                : <><Wifi className="h-3 w-3" />{isFA ? "وبینار / ورکشاپ" : "Webinar / Workshop"}</>}
            </span>
            {item.popular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-caption font-medium text-warning">
                <Zap className="h-3 w-3 fill-current" />
                {isFA ? "محبوب" : "Popular"}
              </span>
            )}
          </div>
          <Link href={url} className="font-semibold text-foreground hover:text-accent transition-colors line-clamp-1">
            {t(item.title, locale)}
          </Link>
          <p className="text-body-sm text-foreground-secondary line-clamp-1">{t(item.excerpt, locale)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-foreground-secondary mt-0.5">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(item.durationMin, locale, dict.common)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{isFA ? "ظرفیت محدود" : "Limited seats"}</span>
            <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{isFA ? "آنلاین" : "Online"}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3 sm:items-end">
          {isFree ? (
            <span className="font-semibold text-success">{dict.common.free}</span>
          ) : (
            <span className="font-display text-h4 text-foreground tabular whitespace-nowrap">{priceStr}</span>
          )}
          <button
            onClick={() => onEnroll(item)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent active:scale-[0.98]"
          >
            {isFA ? "ثبت‌نام" : "Register"}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Instructor Card ────────────────────────────────────────── */
function InstructorCard({ item }: { item: EducationCardData }) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  if (!item.author) return null;
  const count = 1; // placeholder

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <Image src={item.author.avatar} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground truncate">{t(item.author.name, locale)}</p>
        <p className="text-body-sm text-foreground-secondary truncate">{t(item.author.profession, locale)}</p>
        <p className="text-caption text-muted mt-0.5">
          {isFA ? `${faNum(count)} دوره` : `${count} course`}
        </p>
      </div>
      <Link href={href(locale, `/artists/${item.author.slug}`)} className="shrink-0 text-caption text-accent hover:underline">
        {dict.nav.explore}
      </Link>
    </div>
  );
}

/* ─── Main Client Component ──────────────────────────────────── */
export function AcademyClient({ items, categories }: Props) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const [enrollItem, setEnrollItem] = useState<EducationCardData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "all", label: isFA ? "همه" : "All", icon: BookOpen },
    { key: "course", label: isFA ? "دوره‌ها" : "Courses", icon: Video },
    { key: "tutorial", label: isFA ? "آموزش‌ها" : "Tutorials", icon: Play },
    { key: "workshop", label: isFA ? "ورکشاپ" : "Workshops", icon: Calendar },
    { key: "webinar", label: isFA ? "وبینار" : "Webinars", icon: Globe },
  ];

  // Tab → type mapping
  const typeForTab = (tab: Tab): string | null => {
    if (tab === "all") return null;
    if (tab === "workshop") return "path";
    if (tab === "webinar") return "article";
    return tab; // course | tutorial
  };

  const filtered = items.filter((item) => {
    const type = typeForTab(activeTab);
    const tabMatch = !type || item.type === type;
    const catMatch = activeCategory === "all" || item.categoryId === activeCategory;
    return tabMatch && catMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "popular") return (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (sortKey === "newest") return b.publishedAt.localeCompare(a.publishedAt);
    const pa = getPrice(a, locale).value;
    const pb = getPrice(b, locale).value;
    if (sortKey === "price_asc") return pa - pb;
    if (sortKey === "price_desc") return pb - pa;
    return 0;
  });

  // Split by layout
  const gridItems = sorted.filter((i) => i.type === "course" || i.type === "tutorial");
  const eventItems = sorted.filter((i) => i.type === "path" || i.type === "article");

  // Stats
  const totalCourses = items.filter((i) => i.type === "course").length;
  const totalStudents = items.reduce((acc, i) => acc + i.lessons * 12, 0);
  const totalInstructors = new Set(items.map((i) => i.authorId)).size;
  const n = (v: number) => (isFA ? faNum(v) : String(v));

  // Featured instructors (unique authors from all items)
  const uniqueInstructorItems = items.reduce<EducationCardData[]>((acc, item) => {
    if (item.author && !acc.some((x) => x.authorId === item.authorId)) acc.push(item);
    return acc;
  }, []);

  return (
    <>
      {/* ── Sticky filter bar ────────────────────────────────── */}
      <div className="sticky top-[var(--header-h-compact)] z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-x">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            {/* Tabs */}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-background-secondary text-foreground-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}

            <div className="flex-1" />

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                showFilters ? "border-accent text-accent bg-accent-soft" : "border-border text-foreground-secondary hover:text-foreground"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {isFA ? "فیلتر" : "Filter"}
              {activeCategory !== "all" && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-9 appearance-none rounded-full border border-border bg-background ps-4 pe-8 text-sm text-foreground cursor-pointer focus:border-accent focus:outline-none"
              >
                <option value="popular">{isFA ? "محبوب‌ترین" : "Most popular"}</option>
                <option value="newest">{isFA ? "جدیدترین" : "Newest"}</option>
                <option value="price_asc">{isFA ? "ارزان‌ترین" : "Price: Low to High"}</option>
                <option value="price_desc">{isFA ? "گران‌ترین" : "Price: High to Low"}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {/* Category filter panel */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border py-3 pb-3.5">
              <span className="text-caption text-muted me-1">{dict.nav.categories}:</span>
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-medium transition-all",
                  activeCategory === "all"
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-foreground-secondary hover:border-accent hover:text-accent"
                )}
              >
                {dict.common.all}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-caption font-medium transition-all",
                    activeCategory === c.id
                      ? "bg-accent text-accent-foreground"
                      : "border border-border text-foreground-secondary hover:border-accent hover:text-accent"
                  )}
                >
                  {t(c.name, locale)}
                </button>
              ))}
              {activeCategory !== "all" && (
                <button
                  onClick={() => setActiveCategory("all")}
                  className="inline-flex items-center gap-1 text-caption text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  {dict.common.clear}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="container-x py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={BookOpen} value={n(totalCourses)} label={isFA ? "دوره آموزشی" : "Courses"} />
          <StatCard icon={Users} value={`${n(totalStudents)}+`} label={isFA ? "دانشجو" : "Students"} />
          <StatCard icon={Award} value={n(totalInstructors)} label={isFA ? "مدرس حرفه‌ای" : "Instructors"} />
          <StatCard icon={Star} value={isFA ? "۴.۸" : "4.8"} label={isFA ? "میانگین امتیاز" : "Avg. rating"} />
        </div>
      </div>

      {/* ── Courses / Tutorials grid ───────────────────────────── */}
      {(activeTab === "all" || activeTab === "course" || activeTab === "tutorial") && gridItems.length > 0 && (
        <section className="container-x pb-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-h3 text-foreground">
              {activeTab === "tutorial"
                ? (isFA ? "آموزش‌های ویدیویی" : "Video Tutorials")
                : (isFA ? "دوره‌های آموزشی" : "Courses & Tutorials")}
            </h2>
            <span className="text-caption text-muted tabular">
              {n(gridItems.length)} {isFA ? "مورد" : "items"}
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {gridItems.map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <CourseCard item={item} onEnroll={setEnrollItem} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Events / Workshops / Webinars ─────────────────────── */}
      {(activeTab === "all" || activeTab === "workshop" || activeTab === "webinar") && eventItems.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x py-14">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-h3 text-foreground">
                {isFA ? "ورکشاپ‌ها، وبینارها و مسیرهای یادگیری" : "Workshops, Webinars & Learning Paths"}
              </h2>
              <span className="text-caption text-muted tabular">
                {n(eventItems.length)} {isFA ? "رویداد" : "events"}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {eventItems.map((item) => (
                <EventRow key={item.id} item={item} onEnroll={setEnrollItem} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {sorted.length === 0 && (
        <div className="container-x py-24 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="font-semibold text-foreground">{dict.common.empty}</p>
          <p className="mt-1 text-body-sm text-foreground-secondary">{dict.common.emptyDesc}</p>
          <button
            onClick={() => {
              setActiveTab("all");
              setActiveCategory("all");
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            {dict.common.clear}
          </button>
        </div>
      )}

      {/* ── Featured Instructors ──────────────────────────────── */}
      {activeTab === "all" && uniqueInstructorItems.length > 0 && (
        <section className="container-x py-14">
          <div className="mb-6">
            <p className="text-label text-accent mb-2">{isFA ? "مدرسین" : "Instructors"}</p>
            <h2 className="font-display text-h3 text-foreground">{isFA ? "آموزش از بهترین‌ها" : "Learn from the best"}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueInstructorItems.slice(0, 6).map((item) => (
              <InstructorCard key={item.authorId} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ────────────────────────────────────────── */}
      {activeTab === "all" && (
        <section className="bg-[#0f141c]">
          <div className="container-x py-16 text-center text-white">
            <p className="text-label text-white/60 mb-3">{isFA ? "همین حالا شروع کن" : "Start today"}</p>
            <h2 className="font-display text-h1 text-white text-balance mb-4">
              {isFA ? "به آکادمی رزی بپیوند." : "Join Rosie Academy."}
            </h2>
            <p className="text-body-lg text-white/70 max-w-lg mx-auto mb-8">
              {isFA
                ? "از مبانی طراحی الگو تا انتشار حرفه‌ای — با مدرسان تجربی یاد بگیر."
                : "From pattern design fundamentals to professional publishing — learn with experienced instructors."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="accent" size="lg" href={href(locale, "/signup")}>
                {isFA ? "ثبت‌نام رایگان" : "Sign up free"}
              </Button>
              <Button variant="glass" size="lg" href={href(locale, "/about")}>
                {isFA ? "درباره آکادمی" : "About Academy"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Enroll Modal ──────────────────────────────────────── */}
      {enrollItem && <EnrollModal item={enrollItem} onClose={() => setEnrollItem(null)} />}
    </>
  );
}
