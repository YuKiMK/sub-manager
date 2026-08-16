"use client";

import { useMemo, useState } from "react";
import { MonthlySpending, SubscriptionView } from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import { getBillingDatesInMonth } from "@/lib/billing";
import { CYCLE_META } from "@/constants/cycles";
import ServiceIcon from "@/components/ui/ServiceIcon";

/** 棒の描画領域の高さ (px) */
const PLOT_HEIGHT = 132;

interface MonthlySpendingChartProps {
  months: MonthlySpending[];
  subscriptions: SubscriptionView[];
  /** 均した月額 (実質月額合計)。年払いの山と比べるための基準線に使う */
  averageMonthly: number;
}

/**
 * 月ごとの請求予定額を並べた縦棒グラフ。
 *
 * 系列は「請求予定額」ひとつだけなので棒は全て同色にし、
 * 選択中の月だけをテーマカラーで強調する（大小は棒の高さが既に表している）。
 * 棒をタップするとその月の内訳が下に開くため、値は色に頼らず必ず文字で読める。
 */
export default function MonthlySpendingChart({
  months,
  subscriptions,
  averageMonthly,
}: MonthlySpendingChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  /** 目盛りに使うきりの良い上限値 */
  const axisMax = useMemo(() => {
    const steps = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
    return steps.find((step) => step >= maxTotal) ?? Math.ceil(maxTotal / 100000) * 100000;
  }, [maxTotal]);

  /** 基準線を引くか (0円や目盛りの上限を超える場合は引かない) */
  const showAverageLine = averageMonthly > 0 && averageMonthly <= axisMax;

  const selected = months[selectedIndex];
  const peakIndex = months.reduce(
    (best, month, index) => (month.total > months[best].total ? index : best),
    0
  );

  /** 選択中の月に請求されるサービスの内訳 */
  const breakdown = useMemo(() => {
    if (!selected) return [];

    return subscriptions
      .filter(
        (sub) => getBillingDatesInMonth(sub, selected.year, selected.monthIndex).length > 0
      )
      .sort((a, b) => b.price - a.price);
  }, [selected, subscriptions]);

  if (!selected) return null;

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60">
      {/* 選択中の月の値。棒に頼らず必ず数字で読めるようにする */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-medium">
            {selected.year}年{selected.monthIndex + 1}月
            {selected.isCurrentMonth && <span className="text-primary ml-1.5">今月</span>}
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">{formatJPY(selected.total)}</p>
        </div>
        <p className="text-[11px] text-gray-500 tabular-nums">{selected.count}件</p>
      </div>

      {/* グラフ本体 */}
      <div className="relative" style={{ height: PLOT_HEIGHT }}>
        {/* 目盛り (背景から一段だけ持ち上げた実線のヘアライン) */}
        <div className="absolute inset-x-0 top-0 border-t border-gray-800" />
        <div className="absolute inset-x-0 top-1/2 border-t border-gray-800/60" />
        <div className="absolute inset-x-0 bottom-0 border-t border-gray-700" />
        {/* 目盛りの値は棒に重ならないよう、描画領域の外(上)へ出す */}
        <span className="absolute right-0 bottom-full mb-0.5 text-[9px] text-gray-600 tabular-nums">
          {axisMax.toLocaleString("ja-JP")}
        </span>

        {/* 棒 (タップ領域は列全体にとり、指で押しやすくする) */}
        <div className="absolute inset-0 flex items-end">
          {months.map((month, index) => {
            const isSelected = index === selectedIndex;
            const heightRatio = month.total / axisMax;

            return (
              <button
                key={`${month.year}-${month.monthIndex}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="flex-1 h-full flex items-end justify-center group"
                aria-label={`${month.year}年${month.monthIndex + 1}月 ${month.total}円`}
                aria-pressed={isSelected}
              >
                <span
                  className={cn(
                    "w-[60%] max-w-[18px] rounded-t transition-all",
                    isSelected
                      ? "bg-primary"
                      : "bg-gray-700 group-hover:bg-gray-600"
                  )}
                  style={{
                    height: month.total > 0 ? `${Math.max(heightRatio * 100, 2)}%` : "2px",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/*
          均した月額の基準線。年払いの山が「ならすといくらか」を同じ図の中で示す。
          どの月が平均を超えるか読めるよう棒の上に重ねるが、
          金額は棒を隠してしまうためグラフの外(下の凡例)に出す。
        */}
        {showAverageLine && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-primary/70 pointer-events-none"
            style={{ bottom: `${(averageMonthly / axisMax) * 100}%` }}
          />
        )}
      </div>

      {/* 月ラベル */}
      <div className="flex mt-2">
        {months.map((month, index) => (
          <span
            key={`${month.year}-${month.monthIndex}-label`}
            className={cn(
              "flex-1 text-center text-[10px] tabular-nums",
              index === selectedIndex
                ? "text-primary font-bold"
                : month.isCurrentMonth
                  ? "text-gray-300 font-medium"
                  : "text-gray-600"
            )}
          >
            {month.label}
          </span>
        ))}
      </div>

      {/* 基準線の凡例。線が何を表すかを、棒を隠さない位置で示す */}
      {showAverageLine && (
        <div className="flex items-center justify-center space-x-2 mt-3">
          <span className="w-5 border-t border-dashed border-primary/70 shrink-0" />
          <span className="text-[10px] text-gray-500 tabular-nums">
            均すと 月 {formatJPY(averageMonthly)}
          </span>
        </div>
      )}

      {/* 最も高い月への注意喚起 (全ての棒に数値を置くと読めなくなるため1点だけ) */}
      {months[peakIndex].total > 0 && peakIndex !== selectedIndex && (
        <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-800">
          最も高いのは
          <button
            type="button"
            onClick={() => setSelectedIndex(peakIndex)}
            className="text-primary font-medium mx-1 underline underline-offset-2"
          >
            {months[peakIndex].monthIndex + 1}月
          </button>
          の {formatJPY(months[peakIndex].total)}
        </p>
      )}

      {/* 選択した月の内訳 */}
      {breakdown.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-gray-800 space-y-3">
          {breakdown.map((sub) => (
            <li key={sub.id} className="flex items-center">
              <ServiceIcon
                name={sub.name}
                color={sub.color}
                iconUrl={sub.iconUrl}
                size="sm"
                className="mr-3"
              />
              <span className="flex-1 min-w-0 text-sm text-white truncate pr-2">{sub.name}</span>
              <span className="text-[10px] text-gray-500 mr-2 shrink-0">
                {CYCLE_META[sub.cycle].shortLabel}
              </span>
              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {formatJPY(sub.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
