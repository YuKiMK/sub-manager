"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, PieChart, Settings, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * ナビゲーションの項目定義。
 * 中央のFABを挟んで左右のグループに分けて配置する。
 */
const LEFT_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/analytics", label: "分析", icon: PieChart },
  { href: "/settings", label: "設定", icon: Settings },
];

/**
 * 画面下部に固定されるナビゲーションバー。
 * Galaxy等のスマホでの親指操作を意識したモバイルファースト設計。
 *
 * 左右のグループを等幅(flex-1)にし、その間に中央スペーサーを置くことで、
 * スペーサーの中心が画面中央=FABの中心と一致する。
 * これによりFAB(56px)がスペーサー(64px)に収まり、項目のラベルを覆わない。
 */
export default function BottomNav() {
  const pathname = usePathname();

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const isActive = pathname === href;

    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full transition-colors",
          isActive ? "text-primary" : "text-gray-500 hover:text-gray-300"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon size={22} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#1a1a1a] border-t border-gray-800 flex items-center z-40 max-w-md mx-auto safe-area-bottom">
      <div className="flex flex-1 h-full">{LEFT_ITEMS.map(renderItem)}</div>

      {/* 中央のFAB用の空間スペーサー */}
      <div className="w-16 shrink-0" />

      <div className="flex flex-1 h-full">{RIGHT_ITEMS.map(renderItem)}</div>
    </nav>
  );
}
