import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  ArrowUpRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  Infinity,
  Users,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { enrichEducation, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, href, t } from "@/lib/utils";
import { AcademyClient } from "./AcademyClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/academy");
  return {
    title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.education,
    description: m ? t(m.description, locale) : undefined,
  };
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const isFA = locale === "fa";

  const all = site.education.map((e) => enrichEducation(site, e));
  const featured = all.find((e) => e.featured && e.type === "course") ?? all[0];
  const courses = all.filter((e) => e.type === "course");
  const n = (v: number) => (isFA ? faNum(v) : String(v));
  const cats = site.categories.filter((c) =>
    site.education.some((e) => e.categoryId === c.id)
  );

  const perks = [
    {
      icon: Play,
      label: isFA ? "دسترسی آنلاین" : "Online access",
      desc: isFA ? "تماشا در هر جا، هر زمان" : "Watch anywhere, anytime",
    },
    {
      icon: Infinity,
      label: isFA ? "دسترسی مادام‌العمر" : "Lifetime access",
      desc: isFA ? "یک بار بخر، همیشه داشته باش" : "Buy once, keep forever",
    },
    {
      icon: ShieldCheck,
      label: isFA ? "گواهینامه رسمی" : "Official certificate",
      desc: isFA ? "گواهی معتبر پس از اتمام" : "Verified certificate on completion",
    },
    {
      icon: Users,
      label: isFA ? "جامعه اختصاصی" : "Private community",
      desc: isFA ? "دسترسی به گروه دانشجویان" : "Access to student community",
    },
  ];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0c1018] text-white">
        {/* Background pattern grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1018]" />

        <div className="container-x relative z-10 pt-[calc(var(--header-h)+3rem)] pb-16 md:pb-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left: copy */}
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-caption text-white/70 mb-6 backdrop-blur-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                {d.nav.education}
              </span>
              <h1 className="anim-blur-in font-display text-h1 text-white text-balance leading-tight">
                {isFA ? (
                  <>
                    آکادمی رزی<br />
                    <span className="text-accent">یاد بگیر، بساز، بفروش.</span>
                  </>
                ) : (
                  <>
                    Rosie Academy<br />
                    <span className="text-accent">Learn, Build, Publish.</span>
                  </>
                )}
              </h1>
              <p
                className="anim-blur-in mt-5 text-body-lg text-white/70 max-w-md"
                style={{ animationDelay: "80ms" }}
              >
                {isFA
                  ? "دوره‌های تخصصی طراحی الگو، ورکشاپ‌های زنده و وبینارهای حرفه‌ای — از مبانی تا عرضه بین‌المللی."
                  : "Specialist pattern design courses, live workshops and professional webinars — from foundations to international publishing."}
              </p>

              {/* Stats row */}
              <div
                className="anim-fade-up mt-8 flex flex-wrap gap-8 text-caption text-white/60 tabular"
                style={{ animationDelay: "160ms" }}
              >
                <span>
                  <strong className="block font-display text-h3 text-white">{n(courses.length)}+</strong>
                  {isFA ? "دوره" : "Courses"}
                </span>
                <span>
                  <strong className="block font-display text-h3 text-white">
                    {isFA ? "۲,۴۰۰+" : "2,400+"}
                  </strong>
                  {isFA ? "دانشجو" : "Students"}
                </span>
                <span>
                  <strong className="block font-display text-h3 text-white">
                    {isFA ? "۴.۸" : "4.8"}⭐
                  </strong>
                  {isFA ? "امتیاز" : "Rating"}
                </span>
              </div>

              {/* Perks */}
              <ul className="mt-8 grid grid-cols-2 gap-3">
                {perks.map(({ icon: Icon, label, desc }) => (
                  <li key={label} className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">{label}</span>
                      <span className="block text-caption text-white/50">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: featured course card */}
            {featured && (
              <div className="lg:col-span-7">
                <Reveal>
                  <Link
                    href={href(locale, `/academy/${featured.slug}`)}
                    className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-elevated"
                  >
                    <Image
                      src={featured.image}
                      alt={t(featured.title, locale)}
                      fill
                      priority
                      sizes="(max-width:1024px) 100vw, 55vw"
                      className="object-cover brightness-75 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1018]/95 via-[#0c1018]/30 to-transparent" />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                        <Play className="h-7 w-7 fill-white text-white ms-1" />
                      </div>
                    </div>

                    {/* Bottom content */}
                    <div className="relative mt-auto p-7">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-caption font-medium text-white backdrop-blur-sm">
                          {isFA ? "منتخب" : "Featured"} · {d.common[featured.type]}
                        </span>
                        {featured.category && (
                          <span className="rounded-full border border-white/20 px-3 py-1 text-caption text-white/70 backdrop-blur-sm">
                            {t(featured.category.name, locale)}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-h2 text-white text-balance">
                        {t(featured.title, locale)}
                      </h2>
                      <p className="mt-2 text-body-sm text-white/70 max-w-lg line-clamp-2">
                        {t(featured.excerpt, locale)}
                      </p>
                      {featured.author && (
                        <div className="mt-4 flex items-center gap-2">
                          <span className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20">
                            <Image
                              src={featured.author.avatar}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </span>
                          <span className="text-caption text-white/60">
                            {d.common.author}: {t(featured.author.name, locale)}
                          </span>
                        </div>
                      )}
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium border-b border-white/40 pb-0.5 group-hover:border-white transition-colors">
                        {isFA ? "مشاهده دوره" : "View course"}
                        <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories strip ──────────────────────────────────── */}
      {cats.length > 0 && (
        <div className="border-b border-border bg-background-secondary">
          <div className="container-x">
            <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar">
              <span className="shrink-0 text-caption text-muted me-1">
                {d.nav.categories}:
              </span>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={href(locale, `/academy?category=${c.slug}`)}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-caption text-foreground-secondary transition-all hover:border-accent hover:text-accent"
                >
                  {t(c.name, locale)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── What you get trust bar ────────────────────────────── */}
      <div className="bg-accent text-white">
        <div className="container-x">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-4 text-sm">
            {[
              isFA ? "✓ پرداخت امن" : "✓ Secure payment",
              isFA ? "✓ دسترسی فوری" : "✓ Instant access",
              isFA ? "✓ ضمانت بازگشت وجه ۷ روزه" : "✓ 7-day money-back guarantee",
              isFA ? "✓ گواهینامه معتبر" : "✓ Verified certificate",
            ].map((item) => (
              <span key={item} className="font-medium">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What you'll learn (3-col feature cards) ───────────── */}
      <section className="container-x py-16">
        <SectionHeader
          eyebrow={isFA ? "چرا آکادمی رزی" : "Why Rosie Academy"}
          title={isFA ? "هر آنچه نیاز داری در یک جا" : "Everything you need in one place"}
          description={
            isFA
              ? "از آموزش‌های کوتاه ویدیویی تا دوره‌های جامع حرفه‌ای و رویدادهای زنده — ما هر سطحی را پوشش می‌دهیم."
              : "From short video tutorials to comprehensive professional courses and live events — we cover every level."
          }
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              emoji: "🎓",
              title: isFA ? "دوره‌های جامع" : "Comprehensive Courses",
              desc: isFA
                ? "دوره‌های ساختارمند با درس‌های مرحله‌به‌مرحله، تمرین‌های عملی و گواهینامه پایان دوره."
                : "Structured courses with step-by-step lessons, practical exercises and completion certificates.",
            },
            {
              emoji: "🎥",
              title: isFA ? "ورکشاپ‌های زنده" : "Live Workshops",
              desc: isFA
                ? "جلسات تعاملی آنلاین با مدرس، امکان پرسش و پاسخ مستقیم و تمرین در لحظه."
                : "Interactive online sessions with the instructor, live Q&A and real-time exercises.",
            },
            {
              emoji: "📡",
              title: isFA ? "وبینارهای تخصصی" : "Expert Webinars",
              desc: isFA
                ? "وبینارهای کوتاه با متخصصان صنعت — برای به‌روز ماندن با آخرین ترندها و تکنیک‌ها."
                : "Short webinars with industry experts — stay updated with the latest trends and techniques.",
            },
            {
              emoji: "📹",
              title: isFA ? "آموزش‌های ویدیویی" : "Video Tutorials",
              desc: isFA
                ? "آموزش‌های کوتاه و تمرکز‌دار که یک مهارت خاص را عمیق آموزش می‌دهند."
                : "Short, focused tutorials that teach one specific skill in depth.",
            },
            {
              emoji: "🗺️",
              title: isFA ? "مسیر یادگیری" : "Learning Paths",
              desc: isFA
                ? "برنامه‌ریزی شده از صفر تا حرفه‌ای — مجموعه‌ای از دوره‌ها در کنار هم."
                : "Planned from zero to professional — a curated set of courses together.",
            },
            {
              emoji: "🏆",
              title: isFA ? "پروژه‌های عملی" : "Real Projects",
              desc: isFA
                ? "هر دوره با یک پروژه واقعی پایان می‌یابد که می‌توانی در پورتفولیوی خود استفاده کنی."
                : "Every course ends with a real project you can add to your portfolio.",
            },
          ].map(({ emoji, title, desc }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 h-full">
                <span className="text-3xl">{emoji}</span>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-body-sm text-foreground-secondary flex-1">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Process steps ─────────────────────────────────────── */}
      <section className="bg-background-secondary">
        <div className="container-x py-16">
          <SectionHeader
            eyebrow={isFA ? "چطور کار می‌کند" : "How it works"}
            title={isFA ? "شروع تنها ۳ قدم فاصله دارد" : "Just 3 steps away from learning"}
          />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: isFA ? "۱" : "1",
                title: isFA ? "دوره را انتخاب کن" : "Choose a course",
                desc: isFA
                  ? "از بین دوره‌ها، ورکشاپ‌ها و وبینارها آنچه به نیازت می‌خورد را پیدا کن."
                  : "Find what fits your needs from courses, workshops and webinars.",
              },
              {
                step: isFA ? "۲" : "2",
                title: isFA ? "ثبت‌نام یا خرید کن" : "Enroll or buy",
                desc: isFA
                  ? "پرداخت امن آنلاین — فوری دسترسی پیدا می‌کنی."
                  : "Secure online payment — get instant access.",
              },
              {
                step: isFA ? "۳" : "3",
                title: isFA ? "یاد بگیر و گواهینامه بگیر" : "Learn & get certified",
                desc: isFA
                  ? "دوره را کامل کن، گواهینامه معتبر دریافت کن و کارت را در پورتفولیو بگذار."
                  : "Complete the course, receive a verified certificate, and add it to your portfolio.",
              },
            ].map(({ step, title, desc }, i) => (
              <Reveal key={step} delay={i * 100}>
                <div className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display text-h3">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-body-sm text-foreground-secondary">{desc}</p>
                    {i < 2 && (
                      <span className="mt-2 flex items-center gap-1 text-caption text-muted">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        {isFA ? "کامل شد" : "Done"}
                      </span>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive catalog (client component) ────────────── */}
      <AcademyClient items={all} categories={cats} />
    </>
  );
}
