"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SubscriptionView } from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import { getBillingDatesInMonth, getToday, parseDateKey, toDateKey } from "@/lib/billing";
import ServiceIcon from "@/components/ui/ServiceIcon";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

interface BillingCalendarProps {
  subscriptions: SubscriptionView[];
  /** today を props で受けてサーバー/クライアントの日付ズレを防ぐ */
  todayKey: string;
}

/** カレンダーの1マス */
interface DayCell {
  /** 当月の日 (前後の月の余白は null) */
  dateKey: string | null;
  day: number | null;
}

/**
 * 請求日を月間カレンダーで俯瞰する画面。
 *
 * 日付をタップするとその日の内訳が下に出る。
 * 「いつ・いくら引き落とされるか」を一目で掴めるようにするのが目的。
 */
export default function BillingCalendar({ subscriptions, todayKey }: BillingCalendarProps) {
  const today = parseDateKey(todayKey);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);

  /** 日付ごとの請求一覧 (YYYY-MM-DD → サブスク配列) */
  const billingsByDate = useMemo(() => {
    const map = new Map<string, SubscriptionView[]>();

    for (const sub of subscriptions) {
      for (const dateKey of getBillingDatesInMonth(sub, year, monthIndex)) {
        const list = map.get(dateKey) ?? [];
        list.push(sub);
        map.set(dateKey, list);
      }
    }

    return map;
  }, [subscriptions, year, monthIndex]);

  /** 日曜始まりで前後に空白を足したマスの配列 */
  const cells = useMemo<DayCell[]>(() => {
    const firstDay = new Date(Date.UTC(year, monthIndex, 1));
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const leadingBlanks = firstDay.getUTCDay();

    const result: DayCell[] = Array.from({ length: leadingBlanks }, () => ({
      dateKey: null,
      day: null,
    }));

    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ dateKey: toDateKey(new Date(Date.UTC(year, monthIndex, day))), day });
    }

    // 行の途中で終わらないよう末尾を埋める
    while (result.length % 7 !== 0) result.push({ dateKey: null, day: null });

    return result;
  }, [year, monthIndex]);

  const monthTotal = useMemo(
    () =>
      Array.from(billingsByDate.values())
        .flat()
        .reduce((total, sub) => total + sub.price, 0),
    [billingsByDate]
  );

  const moveMonth = (delta: number) => {
    const moved = new Date(Date.UTC(year, monthIndex + delta, 1));
    setYear(moved.getUTCFullYear());
    setMonthIndex(moved.getUTCMonth());
    setSelectedDate(null);
  };

  const goToThisMonth = () => {
    setYear(today.getUTCFullYear());
    setMonthIndex(today.getUTCMonth());
    setSelectedDate(todayKey);
  };

  const isCurrentMonth =
    year === today.getUTCFullYear() && monthIndex === today.getUTCMonth();
  const selectedBillings = selectedDate ? (billingsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* 月の切り替え */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="p-2.5 rounded-full bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white hover:bg-[#252525] active:scale-95 transition-all"
          aria-label="前の月"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={goToThisMonth}
          className="flex flex-col items-center active:scale-95 transition-transform"
        >
          <span className="text-lg font-bold text-white tracking-tight">
            {year}年 {monthIndex + 1}月
          </span>
          {!isCurrentMonth && <span className="text-[10px] text-primary mt-0.5">今月へ戻る</span>}
        </button>

        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="p-2.5 rounded-full bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white hover:bg-[#252525] active:scale-95 transition-all"
          aria-label="次の月"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* カレンダー本体 */}
      <div className="bg-[#1a1a1a] rounded-2xl p-3 border border-gray-800/60">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={cn(
                "text-center text-[10px] font-medium py-1.5",
                index === 0 ? "text-red-400/70" : index === 6 ? "text-sky-400/70" : "text-gray-500"
              )}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell.dateKey) return <div key={`blank-${index}`} className="aspect-square" />;

            const billings = billingsByDate.get(cell.dateKey) ?? [];
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDate;
            const dayTotal = billings.reduce((sum, sub) => sum + sub.price, 0);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 border",
                  isSelected
                    ? "border-primary bg-primary/15"
                    : isToday
                      ? "border-gray-600 bg-[#252525]"
                      : "border-transparent hover:bg-[#252525]"
                )}
                aria-label={`${cell.day}日${billings.length > 0 ? ` 請求${billings.length}件` : ""}`}
              >
                <span
                  className={cn(
                    "text-xs font-medium leading-none",
                    isToday ? "text-primary font-bold" : billings.length > 0 ? "text-white" : "text-gray-500"
                  )}
                >
                  {cell.day}
                </span>

                {/* 請求があるサービスの色を点で示す (最大3件 + 残数) */}
                {billings.length > 0 && (
                  <>
                    <span className="flex items-center space-x-0.5 mt-1">
                      {billings.slice(0, 3).map((sub) => (
                        <span
                          key={sub.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: sub.color || "#888" }}
                        />
                      ))}
                    </span>
                    <span className="text-[8px] text-gray-500 mt-0.5 leading-none tabular-nums">
                      {dayTotal >= 10000
                        ? `${Math.round(dayTotal / 1000)}k`
                        : dayTotal.toLocaleString("ja-JP")}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 月合計 */}
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sm text-gray-400 font-medium">
          {monthIndex + 1}月の請求予定
        </span>
        <span className="text-lg font-bold text-white tabular-nums">{formatJPY(monthTotal)}</span>
      </div>

      {/* 選択した日の内訳 */}
      {selectedDate && (
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60">
          <p className="text-sm font-bold text-white mb-3">
            {parseDateKey(selectedDate).getUTCMonth() + 1}月
            {parseDateKey(selectedDate).getUTCDate()}日の請求
          </p>

          {selectedBillings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">この日の請求はありません</p>
          ) : (
            <ul className="space-y-3">
              {selectedBillings.map((sub) => (
                <li key={sub.id} className="flex items-center">
                  <ServiceIcon
                    name={sub.name}
                    color={sub.color}
                    iconUrl={sub.iconUrl}
                    size="sm"
                    className="mr-3"
                  />
                  <span className="flex-1 min-w-0 text-sm text-white truncate pr-2">
                    {sub.name}
                  </span>
                  <span className="text-sm font-bold text-white tabular-nums shrink-0">
                    {formatJPY(sub.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
