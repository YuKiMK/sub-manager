"use client";

import { PieChart, PiggyBank } from "lucide-react";
import CategoryBreakdown from "@/components/features/CategoryBreakdown";
import UpcomingPayments from "@/components/features/UpcomingPayments";
import MonthlySpendingChart from "@/components/features/MonthlySpendingChart";
import TopSpenders from "@/components/features/TopSpenders";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatJPY } from "@/lib/utils";
import {
  calculateMonthlySavings,
  calculateMonthlyTotal,
  calculateYearlyTotal,
  findTopSpenders,
  summarizeByCategory,
  summarizeMonthlySpending,
} from "@/lib/billing";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

/** 支払い予定の集計対象日数 */
const UPCOMING_WINDOW_DAYS = 30;

/** 推移グラフで先読みする月数 (年払いの更新が必ず1回は入るよう12ヶ月) */
const TREND_MONTHS = 12;

/** 「コストが高いサブスク」に出す件数 */
const TOP_SPENDER_COUNT = 5;

export default function AnalyticsPage() {
  const { subscriptions, isLoading, loadError } = useSubscriptions();
  const monthlyTotal = calculateMonthlyTotal(subscriptions);
  const yearlyTotal = calculateYearlyTotal(subscriptions);
  const monthlySavings = calculateMonthlySavings(subscriptions);
  const categorySummaries = summarizeByCategory(subscriptions);
  const activeCount = subscriptions.filter((sub) => sub.countsTowardTotal).length;
  const monthlyTrend = summarizeMonthlySpending(subscriptions, TREND_MONTHS);
  const topSpenders = findTopSpenders(subscriptions, TOP_SPENDER_COUNT);

  return (
    <div className="space-y-7 pb-4">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">分析</h1>
        <p className="text-sm text-gray-400 mt-1">支出の内訳と今後の予定</p>
      </header>

      {loadError ? (
        <ErrorPanel message={loadError} />
      ) : isLoading ? (
        <LoadingPanel />
      ) : subscriptions.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl px-6 py-12 border border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
          <PieChart size={28} className="text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-400">分析できるデータがありません</p>
          <p className="text-xs text-gray-600 mt-1.5">
            サブスクを登録すると内訳が表示されます
          </p>
        </div>
      ) : (
        <>
          {/* 主要指標 (実質月額をこの画面の見出し数値とする) */}
          <section className="p-7 bg-[#1a1a1a] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-800/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 opacity-80" />
            <p className="text-sm text-gray-400 mb-2 font-medium">実質月額合計</p>
            <h2 className="text-5xl font-black text-white tracking-tight drop-shadow-sm">
              {formatJPY(monthlyTotal)}
            </h2>
          </section>

          {/* サブ指標 */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800/60">
              <p className="text-xs text-gray-400 font-medium">年間支出</p>
              <p className="text-xl font-bold text-white mt-1.5">{formatJPY(yearlyTotal)}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800/60">
              <p className="text-xs text-gray-400 font-medium">利用中</p>
              <p className="text-xl font-bold text-white mt-1.5">{activeCount}件</p>
            </div>
          </section>

          {/* 解約によって浮いた金額 */}
          {monthlySavings > 0 && (
            <section className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60 flex items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mr-4">
                <PiggyBank size={20} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">解約で浮いた金額</p>
                <p className="text-lg font-bold text-white mt-0.5">
                  月 {formatJPY(monthlySavings)}
                </p>
              </div>
              <p className="text-xs text-emerald-400 font-medium shrink-0 pl-2">
                年 {formatJPY(monthlySavings * 12)}
              </p>
            </section>
          )}

          {/* コストが高いサブスク */}
          {topSpenders.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4 px-1">
                <h3 className="text-lg font-bold text-white">コストが高いサブスク</h3>
                <span className="text-[10px] text-gray-500">月額換算</span>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60">
                <TopSpenders subscriptions={topSpenders} monthlyTotal={monthlyTotal} />
              </div>
            </section>
          )}

          {/* 月ごとの請求予定 */}
          <section>
            <div className="flex items-baseline justify-between mb-4 px-1">
              <h3 className="text-lg font-bold text-white">支出の推移</h3>
              <span className="text-[10px] text-gray-500">今後{TREND_MONTHS}ヶ月の予定</span>
            </div>
            <MonthlySpendingChart
              months={monthlyTrend}
              subscriptions={subscriptions}
              averageMonthly={monthlyTotal}
            />
            <p className="text-[10px] text-gray-600 mt-2.5 px-1 leading-relaxed">
              ※ 支払い履歴ではなく、登録内容から算出した予定額です。年払いの更新月は高くなります
            </p>
          </section>

          {/* カテゴリ別の内訳 (利用中の契約のみが対象) */}
          {categorySummaries.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4 px-1">
                <h3 className="text-lg font-bold text-white">カテゴリ別の月額</h3>
                <span className="text-[10px] text-gray-500">月額換算</span>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60">
                <CategoryBreakdown summaries={categorySummaries} />
              </div>
            </section>
          )}

          {/* 直近の支払い予定 */}
          <section>
            <div className="flex items-baseline justify-between mb-4 px-1">
              <h3 className="text-lg font-bold text-white">支払い予定</h3>
              <span className="text-[10px] text-gray-500">今後{UPCOMING_WINDOW_DAYS}日</span>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60">
              <UpcomingPayments
                subscriptions={subscriptions}
                withinDays={UPCOMING_WINDOW_DAYS}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
