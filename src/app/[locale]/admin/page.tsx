import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.admin, robots: { index: false } };
}
export default function AdminPage() {
  return <AdminApp />;
}
