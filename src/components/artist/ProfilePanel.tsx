"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, Skeleton, SuccessState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { href } from "@/lib/utils";
import type { Artist, ArtistStatus } from "@/lib/types";

/**
 * Self-service profile editor.
 *
 * Only the fields the API allows are sent (`SELF_EDITABLE_FIELDS`); status and featuring stay with
 * the admin. A pending artist can complete everything here while waiting for the decision.
 */
export function ProfilePanel({ fa, locale }: { fa: boolean; locale: "fa" | "en" }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch("/api/artist/profile", { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`artist/profile → ${r.status}`);
      const d = (await r.json()) as { ok: boolean; artist: Artist };
      setArtist(d.artist);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (field: "avatar" | "cover", file: File | undefined) => {
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { ...SESSION_FETCH, method: "POST", body: fd });
      const d = (await r.json()) as { ok: boolean; url?: string; error?: string };
      if (!r.ok || !d.ok || !d.url) throw new Error(d.error ?? "upload_failed");
      setArtist((a) => (a ? { ...a, [field]: d.url } : a));
    } catch {
      setError(true);
    } finally {
      setUploading(null);
    }
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!artist) return;
    setSaving("saving");
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? "").trim();
    try {
      const r = await fetch("/api/artist/profile", {
        ...SESSION_FETCH,
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: { fa: str("name-fa"), en: str("name-en") },
          profession: { fa: str("profession-fa"), en: str("profession-en") },
          bio: { fa: str("bio-fa"), en: str("bio-en") },
          location: { fa: str("location-fa"), en: str("location-en") },
          email: str("email"),
          phone: str("phone"),
          social: { instagram: str("instagram"), behance: str("behance"), website: str("website") },
        }),
      });
      const d = (await r.json()) as { ok: boolean; artist?: Artist };
      if (!r.ok || !d.ok) throw new Error("save_failed");
      if (d.artist) setArtist(d.artist);
      setSaving("ok");
      setTimeout(() => setSaving("idle"), 2500);
    } catch {
      setSaving("error");
    }
  };

  if (error && !artist) return <ErrorState message={fa ? "خطا در بارگذاری پروفایل." : "Could not load your profile."} onRetry={() => void load()} />;
  if (!artist) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>;

  const status: ArtistStatus = artist.status ?? "approved";

  return (
    <div className="space-y-8">
      {/* Moderation state */}
      {status !== "approved" && (
        <div
          className={
            status === "pending"
              ? "rounded-xl border border-warning/40 bg-warning/5 p-5"
              : "rounded-xl border border-error/40 bg-error/5 p-5"
          }
        >
          <p className="flex items-center gap-2 font-medium">
            <Badge tone={status === "pending" ? "warning" : "error"}>{status}</Badge>
            {status === "pending"
              ? fa
                ? "پروفایل شما در انتظار تأیید است"
                : "Your profile is waiting for approval"
              : fa
                ? "پروفایل شما رد شده است"
                : "Your profile was not approved"}
          </p>
          <p className="mt-2 text-body-sm text-foreground-secondary">
            {status === "pending"
              ? fa
                ? "می‌توانید همین حالا همه‌ی اطلاعات را کامل کنید؛ به محض تأیید مدیر، پروفایل و کارهای شما در سایت نمایش داده می‌شود."
                : "You can complete everything now — as soon as an admin approves it, your profile and work appear on the site."
              : fa
                ? "برای اطلاع از دلیل، با تیم رزی آتلیه تماس بگیرید."
                : "Contact the Rosie Atelier team to find out why."}
          </p>
        </div>
      )}

      {status === "approved" && (
        <p className="flex flex-wrap items-center gap-3 text-caption text-muted">
          <Badge tone="success">{fa ? "تأییدشده" : "approved"}</Badge>
          <Link href={href(locale, `/artists/${artist.slug}`)} className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline">
            {fa ? "دیدن پروفایل عمومی" : "View public profile"}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span dir="ltr">/{artist.slug}</span>
        </p>
      )}

      <form onSubmit={save} className="space-y-8">
        {/* Images */}
        <section className="grid gap-5 sm:grid-cols-2">
          {(["avatar", "cover"] as const).map((field) => (
            <div key={field} className="rounded-xl border border-border p-4">
              <p className="text-label text-muted">{field === "avatar" ? (fa ? "تصویر پروفایل" : "Portrait") : fa ? "تصویر کاور" : "Cover image"}</p>
              <div
                className={
                  field === "avatar"
                    ? "relative mt-3 h-24 w-24 overflow-hidden rounded-full bg-background-secondary"
                    : "relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-lg bg-background-secondary"
                }
              >
                <Image src={artist[field]} alt="" fill sizes="240px" className="object-cover" />
              </div>
              <input
                ref={field === "avatar" ? avatarInput : coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void upload(field, e.target.files?.[0])}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={uploading === field}
                onClick={() => (field === "avatar" ? avatarInput : coverInput).current?.click()}
              >
                {uploading === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploading === field ? (fa ? "در حال بارگذاری…" : "Uploading…") : fa ? "بارگذاری تصویر" : "Upload image"}
              </Button>
              <p className="mt-2 text-caption text-muted">JPEG · PNG · WebP</p>
            </div>
          ))}
        </section>

        {/* Identity */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={fa ? "نام (فارسی)" : "Name (Persian)"}>
            <Input name="name-fa" defaultValue={artist.name.fa} required />
          </Field>
          <Field label={fa ? "نام (انگلیسی)" : "Name (English)"}>
            <Input name="name-en" defaultValue={artist.name.en} dir="ltr" required />
          </Field>
          <Field label={fa ? "تخصص (فارسی)" : "Specialty (Persian)"}>
            <Input name="profession-fa" defaultValue={artist.profession.fa} />
          </Field>
          <Field label={fa ? "تخصص (انگلیسی)" : "Specialty (English)"}>
            <Input name="profession-en" defaultValue={artist.profession.en} dir="ltr" />
          </Field>
          <Field label={fa ? "شهر (فارسی)" : "City (Persian)"}>
            <Input name="location-fa" defaultValue={artist.location.fa} />
          </Field>
          <Field label={fa ? "شهر (انگلیسی)" : "City (English)"}>
            <Input name="location-en" defaultValue={artist.location.en} dir="ltr" />
          </Field>
          <Field label={fa ? "ایمیل تماس" : "Contact e-mail"} hint={fa ? "فقط مدیر سایت آن را می‌بیند" : "Visible to admins only"}>
            <Input name="email" type="email" dir="ltr" defaultValue={artist.email ?? ""} />
          </Field>
          <Field label={fa ? "شماره تماس" : "Phone"} hint={fa ? "فقط مدیر سایت آن را می‌بیند" : "Visible to admins only"}>
            <Input name="phone" type="tel" dir="ltr" defaultValue={artist.phone ?? ""} />
          </Field>
        </section>

        {/* Bio */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={fa ? "درباره‌ی شما (فارسی)" : "About you (Persian)"}>
            <Textarea name="bio-fa" rows={6} defaultValue={artist.bio.fa} />
          </Field>
          <Field label={fa ? "درباره‌ی شما (انگلیسی)" : "About you (English)"}>
            <Textarea name="bio-en" rows={6} dir="ltr" defaultValue={artist.bio.en} />
          </Field>
        </section>

        {/* Social */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Field label="Instagram">
            <Input name="instagram" dir="ltr" defaultValue={artist.social.instagram ?? ""} placeholder="username" />
          </Field>
          <Field label="Behance">
            <Input name="behance" dir="ltr" defaultValue={artist.social.behance ?? ""} placeholder="username" />
          </Field>
          <Field label={fa ? "وب‌سایت" : "Website"}>
            <Input name="website" dir="ltr" defaultValue={artist.social.website ?? ""} placeholder="studio.com" />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving === "saving"}>
            {saving === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving === "saving" ? (fa ? "در حال ذخیره…" : "Saving…") : fa ? "ذخیره‌ی پروفایل" : "Save profile"}
          </Button>
          {saving === "ok" && <SuccessState message={fa ? "ذخیره شد" : "Saved"} />}
          {saving === "error" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-error">
              <AlertCircle className="h-4 w-4" />
              {fa ? "ذخیره نشد" : "Save failed"}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
