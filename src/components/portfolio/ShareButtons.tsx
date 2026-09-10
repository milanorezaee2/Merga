"use client";

import { useState, useCallback } from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  locale: "fa" | "en";
}

/** Copy-link + social share buttons for portfolio detail. */
export function ShareButtons({ title, locale }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const shareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener");
  };

  const label = locale === "fa" ? "اشتراک‌گذاری" : "Share";
  const copyLabel = locale === "fa" ? (copied ? "کپی شد" : "کپی لینک") : (copied ? "Copied!" : "Copy link");

  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-muted">{label}:</span>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-all duration-200",
          copied ? "border-success text-success" : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
        {copyLabel}
      </button>
      <button type="button" onClick={shareTwitter} aria-label="Share on X / Twitter" className="flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
        𝕏
      </button>
      <button type="button" onClick={shareLinkedIn} aria-label="Share on LinkedIn" className="flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
        in
      </button>
    </div>
  );
}
