"use client";

import { useState } from "react";
import { ChevronDown, Lock, PlayCircle } from "lucide-react";
import { LessonPlayer } from "@/components/academy/LessonPlayer";
import { dictionaries } from "@/lib/i18n/dictionary";
import { faNum, formatDuration, t } from "@/lib/utils";
import type { Chapter } from "@/lib/types";

/**
 * Curriculum accordion + lesson access.
 *
 * Client component because enrolment changes what is playable: the initial entitlement is read
 * from the session on the server and passed in, then kept in state so unlocking one lesson
 * unlocks the rest of the course without a reload.
 */
export function Curriculum({
  chapters,
  itemId,
  itemIsFree,
  initiallyEnrolled,
  locale,
}: {
  chapters: Chapter[];
  itemId: string;
  itemIsFree: boolean;
  initiallyEnrolled: boolean;
  locale: "fa" | "en";
}) {
  const d = dictionaries[locale];
  const [enrolled, setEnrolled] = useState(initiallyEnrolled);

  return (
    <div className="mt-8 max-w-3xl divide-y divide-border rounded-xl border border-border">
      {chapters.map((c, ci) => {
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
                {locale === "fa" ? faNum(c.lessons.length) : c.lessons.length} {d.common.lessons} ·{" "}
                {formatDuration(mins, locale, d.common)}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <ul className="mt-4 space-y-1.5 ps-10">
              {c.lessons.map((l) => (
                <li key={l.id} className="rounded-md px-3 py-2 text-sm hover:bg-background-secondary">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2.5">
                      {l.isFree ? <PlayCircle className="h-4 w-4 shrink-0 text-accent" /> : <Lock className="h-4 w-4 shrink-0 text-muted" />}
                      <span className="truncate">{t(l.title, locale)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-caption text-muted tabular">
                      {l.isFree && <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-accent">{d.common.preview}</span>}
                      {formatDuration(l.durationMin, locale, d.common)}
                    </span>
                  </div>
                  <div className="mt-2.5 ps-7">
                    <LessonPlayer
                      lesson={l}
                      itemId={itemId}
                      enrolled={enrolled}
                      isFree={itemIsFree}
                      locale={locale}
                      onEnrolled={() => setEnrolled(true)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
