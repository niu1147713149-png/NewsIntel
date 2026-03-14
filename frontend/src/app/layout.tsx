import type { Metadata } from "next";
import type { ReactNode } from "react";

import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { fetchCurrentUser } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

import "./globals.css";

export const metadata: Metadata = {
  title: "NewsIntel",
  description: "Global news intelligence platform"
};

const PRIMARY_NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/news", label: "情报流" },
  { href: "/market", label: "市场观察" },
  { href: "/notifications", label: "通知中心" },
  { href: "/watchlist", label: "自选股" },
  { href: "/alerts", label: "告警" },
  { href: "/profile", label: "个人中心" }
] as const;

interface RootLayoutProps {
  children: ReactNode;
}

async function fetchUnreadNotificationsCount(): Promise<number> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts/notifications");
    return response.data.filter((item) => !item.is_read).length;
  } catch {
    return 0;
  }
}

/**
 * Render root layout for all pages.
 * @param {RootLayoutProps} props Layout props containing page content.
 * @returns {JSX.Element} HTML shell with language and body container.
 */
export default async function RootLayout({ children }: RootLayoutProps): Promise<JSX.Element> {
  const currentUser = await fetchCurrentUser();
  const unreadNotificationsCount = currentUser ? await fetchUnreadNotificationsCount() : 0;

  return (
    <html lang="zh-CN">
      <body>
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/86 px-4 py-4 text-slate-900 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-slate-950 uppercase">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#2F6BFF,#0EA5E9)] text-base tracking-normal text-white shadow-[0_10px_24px_rgba(47,107,255,0.18)]">
                    NI
                  </span>
                  <span>NewsIntel</span>
                </Link>
                <p className="text-xs text-slate-500">Editorial intelligence for global news and market signals</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link href="/notifications" className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-950">
                  通知中心
                  {unreadNotificationsCount > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[11px] text-white">
                      {unreadNotificationsCount}
                    </span>
                  ) : null}
                </Link>
                {currentUser ? (
                  <>
                    <Link href="/profile" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-950">
                      {currentUser.name ?? currentUser.email}
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-950">
                      登录
                    </Link>
                    <Link href="/register" className="rounded-xl bg-[linear-gradient(135deg,#2F6BFF,#0EA5E9)] px-3 py-2 text-white shadow-[0_14px_30px_rgba(47,107,255,0.18)]">
                      注册
                    </Link>
                  </>
                )}
              </div>
            </div>

            <nav aria-label="Primary" className="flex flex-wrap gap-2 text-sm text-slate-500">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm hover:border-slate-300 hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
