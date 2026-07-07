"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CreditCard,
  History,
  Home,
  ListChecks,
  Megaphone,
  Menu,
  Palette,
  PlusCircle,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { OnboardingModal } from "@/components/OnboardingModal";
import { initializeAccountStorage } from "@/lib/accountStorage";
import { getCampaigns } from "@/lib/campaignStorage";
import { getContentSchedules } from "@/lib/calendarStorage";
import { getCreditAccount } from "@/lib/creditStorage";
import { syncNotifications } from "@/lib/notificationStorage";
import { cleanupExpiredMockUploads } from "@/lib/privacyStorage";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  notice?: boolean;
};

const diagnosticsEnabled = process.env.NEXT_PUBLIC_ENABLE_DIAGNOSTICS === "true";

const diagnosticsNavItem: NavItem = { href: "/diagnostics", label: "진단", icon: ListChecks };

const desktopNavItems: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/create", label: "만들기", icon: PlusCircle },
  { href: "/studio", label: "Studio", icon: Palette },
  { href: "/video-studio", label: "Video", icon: Video },
  { href: "/calendar", label: "캘린더", icon: CalendarDays, notice: true },
  { href: "/campaigns", label: "캠페인", icon: Megaphone },
  { href: "/history", label: "히스토리", icon: History },
  { href: "/export", label: "내보내기", icon: Share2 },
  { href: "/pricing", label: "플랜", icon: CreditCard },
  { href: "/account", label: "계정", icon: UserRound },
  ...(diagnosticsEnabled ? [diagnosticsNavItem] : []),
  { href: "/settings", label: "브랜드 설정", icon: Settings },
  { href: "/privacy", label: "개인정보", icon: ShieldCheck }
];

const mobileNavItems: NavItem[] = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/create", label: "만들기", icon: PlusCircle },
  { href: "/results", label: "결과", icon: Sparkles },
  { href: "/studio", label: "Studio", icon: Palette },
  { href: "/export", label: "내보내기", icon: Share2 }
];

const moreItems: NavItem[] = [
  { href: "/video-studio", label: "Video", icon: Video },
  { href: "/history", label: "히스토리", icon: History },
  { href: "/calendar", label: "캘린더", icon: CalendarDays, notice: true },
  { href: "/campaigns", label: "캠페인", icon: Megaphone },
  { href: "/pricing", label: "플랜", icon: CreditCard },
  { href: "/account", label: "계정", icon: UserRound },
  ...(diagnosticsEnabled ? [diagnosticsNavItem] : []),
  { href: "/settings", label: "브랜드 설정", icon: Settings },
  { href: "/privacy", label: "개인정보", icon: ShieldCheck }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeAccountStorage();
    getCreditAccount();
    cleanupExpiredMockUploads();
    const notifications = syncNotifications(getContentSchedules(), getCampaigns());
    setUnreadNotifications(notifications.filter((notification) => !notification.read).length);
    setMounted(true);
  }, []);

  const moreActive = moreItems.some((item) => pathname === item.href);

  return (
    <div className="min-h-screen bg-wash text-ink">
      <aside className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-2 pt-2 backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-64 lg:border-r lg:border-t-0 lg:px-4 lg:py-6">
        <Link className="mb-8 hidden items-center gap-3 px-2 lg:flex" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral text-white shadow-lift">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-black">PostKit</span>
            <span className="block text-xs text-muted">SNS 업로드 패키지</span>
          </span>
        </Link>

        <nav className="hidden lg:grid lg:grid-cols-1 lg:gap-2" aria-label="데스크톱 앱 내비게이션">
          {desktopNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={clsx(
                  "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition lg:min-h-11 lg:flex-row lg:justify-start lg:px-3 lg:text-sm",
                  active ? "bg-blush text-coral" : "text-muted hover:bg-blush/50 hover:text-ink"
                )}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {item.notice && unreadNotifications > 0 ? (
                  <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                    <Bell size={10} aria-hidden="true" />
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {moreOpen ? (
          <div className="absolute inset-x-2 bottom-[4.75rem] max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-soft lg:hidden">
            <div className="grid gap-1" role="menu" aria-label="더보기 메뉴">
              {moreItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    className={clsx(
                      "relative flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition",
                      active ? "bg-blush text-coral" : "text-muted hover:bg-blush/50 hover:text-ink"
                    )}
                    href={item.href}
                    key={`${item.href}-${item.label}`}
                    onClick={() => setMoreOpen(false)}
                    role="menuitem"
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.notice && unreadNotifications > 0 ? (
                      <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <nav className="grid grid-cols-6 gap-1 lg:hidden" aria-label="모바일 앱 내비게이션">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={clsx(
                  "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold leading-tight transition",
                  active ? "bg-blush text-coral" : "text-muted hover:bg-blush/50 hover:text-ink"
                )}
                href={item.href}
                key={item.href}
                onClick={() => setMoreOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="max-w-full break-keep text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            aria-expanded={moreOpen}
            className={clsx(
              "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold leading-tight transition",
              moreActive || moreOpen ? "bg-blush text-coral" : "text-muted hover:bg-blush/50 hover:text-ink"
            )}
            onClick={() => setMoreOpen((current) => !current)}
            type="button"
          >
            <Menu size={18} aria-hidden="true" />
            <span className="max-w-full break-keep text-center">더보기</span>
            {unreadNotifications > 0 ? (
              <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                {unreadNotifications}
              </span>
            ) : null}
          </button>
        </nav>
      </aside>

      <main className="min-w-0 pb-40 lg:ml-64 lg:pb-0">
        <div className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      {mounted ? <OnboardingModal /> : null}
    </div>
  );
}
