"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart, LogOut, Package, Palette, Settings, ShieldCheck } from "lucide-react";
import { useAuth, useCart, useFavorites, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { faNum, formatPrice, href } from "@/lib/utils";
import type { Order } from "@/lib/data/orders";

export function AccountView() {
  const { user, logout } = useAuth();
  const { ids } = useFavorites();
  const { lines } = useCart();
  const { locale, dict } = useLocale();
  const router = useRouter();
  const fa = locale === "fa";

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const r = await fetch("/api/orders", { ...SESSION_FETCH });
      if (r.ok) {
        const d = (await r.json()) as { ok: boolean; orders?: Order[] };
        setOrders(d.orders ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setOrdersLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace(href(locale, "/login")), 50);
      return () => clearTimeout(t);
    }
    if (user) void loadOrders();
  }, [user, router, locale, loadOrders]);

  if (!user) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+4rem)] pb-20">
        <div className="skeleton h-40 rounded-lg" />
      </div>
    );
  }

  const orderStatusLabel = (status: Order["status"]) => {
    const map: Record<Order["status"], { fa: string; en: string }> = {
      pending: { fa: "در انتظار تأیید", en: "Pending" },
      confirmed: { fa: "تأیید شده", en: "Confirmed" },
      shipped: { fa: "ارسال شده", en: "Shipped" },
      delivered: { fa: "تحویل داده شده", en: "Delivered" },
      cancelled: { fa: "لغو شده", en: "Cancelled" },
    };
    return fa ? map[status].fa : map[status].en;
  };

  const orderStatusTone = (status: Order["status"]): "neutral" | "accent" | "success" | "error" | "outline" => {
    if (status === "delivered") return "success";
    if (status === "cancelled") return "error";
    if (status === "shipped" || status === "confirmed") return "accent";
    return "outline";
  };

  return (
    <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-20">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label text-accent">{dict.nav.account}</p>
          <h1 className="mt-2 font-display text-h1">
            {fa ? "سلام،" : "Hello,"} {user.name}
          </h1>
          <p className="mt-1 text-sm text-foreground-secondary" dir="ltr">
            {user.email}
          </p>
          {user.role === "artist" && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-caption font-medium text-accent">
              <Palette className="h-3 w-3" />
              {fa ? "هنرمند" : "Artist"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "admin" && (
            <Button href={href(locale, "/admin")} variant="outline">
              <ShieldCheck className="h-4 w-4" />
              {dict.nav.admin}
            </Button>
          )}
          {(user.role === "artist" || user.role === "admin") && (
            <Button href={href(locale, "/artist")} variant="outline">
              <Palette className="h-4 w-4" />
              {fa ? "داشبورد هنرمند" : "Artist Dashboard"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              router.push(href(locale, "/"));
            }}
          >
            <LogOut className="h-4 w-4" />
            {fa ? "خروج" : "Sign out"}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Link
          href={href(locale, "/favorites")}
          className="rounded-lg border border-border p-6 transition-shadow hover:shadow-medium"
        >
          <Heart className="h-5 w-5 text-accent" />
          <p className="mt-4 font-display text-h2 tabular">{fa ? faNum(ids.size) : ids.size}</p>
          <p className="text-caption text-foreground-secondary">{dict.common.favorite}</p>
        </Link>
        <Link
          href={href(locale, "/checkout")}
          className="rounded-lg border border-border p-6 transition-shadow hover:shadow-medium"
        >
          <Package className="h-5 w-5 text-accent" />
          <p className="mt-4 font-display text-h2 tabular">{fa ? faNum(lines.length) : lines.length}</p>
          <p className="text-caption text-foreground-secondary">{dict.nav.cart}</p>
        </Link>
        <div className="rounded-lg border border-border p-6">
          <Settings className="h-5 w-5 text-accent" />
          <p className="mt-4 font-medium">{fa ? "تنظیمات" : "Settings"}</p>
          <p className="text-caption text-foreground-secondary">
            {fa ? "زبان، حالت نمایش و اعلان‌ها" : "Language, theme and notifications"}
          </p>
        </div>
      </div>

      {/* Orders */}
      <div className="mt-10">
        <p className="text-label text-muted">{fa ? "سفارش‌های اخیر" : "Recent orders"}</p>
        <div className="mt-3">
          {!ordersLoaded ? (
            <div className="space-y-2">
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              title={fa ? "هنوز سفارشی ندارید." : "No orders yet."}
              action={
                <Button href={href(locale, "/shop")} size="sm" variant="outline">
                  {dict.common.continueShopping}
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold" dir="ltr">{order.id}</span>
                      <Badge tone={orderStatusTone(order.status)}>
                        {orderStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-caption text-foreground-secondary">
                      {new Date(order.createdAt).toLocaleDateString(fa ? "fa-IR" : "en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {" · "}
                      {order.lines.length}{" "}
                      {fa ? "قلم" : order.lines.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span className="font-semibold tabular">
                    {formatPrice(order.total, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
