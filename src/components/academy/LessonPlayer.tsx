"use client";

import { useState } from "react";
import { Loader2, Lock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SESSION_FETCH } from "@/lib/http";
import type { Lesson } from "@/lib/types";

/**
 * Lesson access + player.
 *
 * A lesson is playable when it is a free preview or the viewer is enrolled. Enrolment is real:
 * it is read from the session server-side and written through /api/academy/enroll. Paid items
 * cannot be self-enrolled (the API answers 402), so the locked state explains that instead of
 * pretending. Lessons without a `videoUrl` say so rather than showing an empty player.
 */
export function LessonPlayer({
  lesson,
  itemId,
  enrolled,
  isFree,
  locale,
  onEnrolled,
}: {
  lesson: Lesson;
  itemId: string;
  enrolled: boolean;
  /** The whole item is free, so every lesson is open. */
  isFree: boolean;
  locale: "fa" | "en";
  onEnrolled: () => void;
}) {
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlocked = isFree || Boolean(lesson.isFree) || enrolled;

  const enrollNow = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/academy/enroll", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const d = (await r.json()) as { ok: boolean; error?: string };
      if (r.status === 401) setError(fa ? "برای دسترسی باید وارد شوی." : "Sign in to access this lesson.");
      else if (r.status === 402) setError(fa ? "این دوره رایگان نیست؛ پرداخت هنوز متصل نشده است." : "This course is not free; checkout is not wired up yet.");
      else if (!r.ok || !d.ok) setError(fa ? "ثبت‌نام ناموفق بود." : "Enrolment failed.");
      else onEnrolled();
    } catch {
      setError(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4 text-muted" />
          {fa ? "این درس قفل است" : "This lesson is locked"}
        </p>
        <p className="mt-1 text-caption text-foreground-secondary">
          {fa ? "با ثبت‌نام در این دوره باز می‌شود." : "Unlocks when you enrol in this course."}
        </p>
        <Button size="sm" className="mt-3" onClick={() => void enrollNow()} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {fa ? "ثبت‌نام در دوره" : "Enrol in this course"}
        </Button>
        {error && <p className="mt-2 text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (!lesson.videoUrl) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-caption text-muted">
        {fa ? "هنوز رسانه‌ای به این درس attached نشده است." : "No media attached to this lesson yet."}
      </p>
    );
  }

  return open ? (
    <video src={lesson.videoUrl} controls playsInline className="w-full rounded-lg bg-black" />
  ) : (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <PlayCircle className="h-4 w-4" />
      {fa ? "پخش درس" : "Play lesson"}
    </Button>
  );
}
