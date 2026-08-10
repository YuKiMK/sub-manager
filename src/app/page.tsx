"use client";

import SubscriptionList from "@/components/features/SubscriptionList";
import HomeAlertBanner from "@/components/features/HomeAlertBanner";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatJPY } from "@/lib/utils";
import { calculateMonthlyTotal, calculateYearlyTotal } from "@/lib/billing";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

export default function Home() {
  // 端末内に保存された登録内容を取得 (次回更新日が近い順)
  const { subscriptions, isLoading, loadError } = useSubscriptions();

  // 解約済みは一覧の下部に履歴としてまとめる
  const current = subscriptions.filter((sub) => sub.status !== "cancelled");
  const cancelled = subscriptions.filter((sub) => sub.status === "cancelled");

  const monthlyTotal = calculateMonthlyTotal(subscriptions);
  const yearlyTotal = calculateYearlyTotal(subscriptions);

  // 合計に入っていない契約(無料期間中・開始予定)の件数
  const pendingCount = current.filter((sub) => !sub.countsTowardTotal).length;

  // 読み込み前に合計を出すと一瞬 ¥0 と表示されてしまうため、読み込み中は本文ごと差し替える
  if (loadError || isLoading) {
    return (
      <div className="space-y-7 pb-4">
        <header className="pt-4">
          <h1 className="text-2xl font-bold tracking-tight">サブスク管理</h1>
          <p className="text-sm text-gray-400 mt-1">今月の支払い状況</p>
        </header>
        {loadError ? <ErrorPanel message={loadError} /> : <LoadingPanel />}
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-4">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">サブスク管理</h1>
        <p className="text-sm text-gray-400 mt-1">今月の支払い状況</p>
      </header>

      <HomeAlertBanner subscriptions={subscriptions} />

      {/* 月額合計サマリー (質感を高めたグラスモーフィズム風カード) */}
      <section className="p-7 bg-[#1a1a1a] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-800/50 flex flex-col items-center justify-center relative overflow-hidden">
        {/* 上部のアクセントグラデーション */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 opacity-80" />

        <p className="text-sm text-gray-400 mb-2 font-medium">実質月額合計</p>
        <div className="flex items-baseline space-x-1">
          <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">
            {formatJPY(monthlyTotal)}
          </h2>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-medium">年間 {formatJPY(yearlyTotal)}</p>
        <p className="text-[10px] text-gray-500 mt-3 bg-gray-900/50 px-3 py-1 rounded-full border border-gray-800">
          {pendingCount > 0
            ? `※年額は月割。無料期間中・開始予定の${pendingCount}件は未算入`
            : "※年額プランは月割で合算しています"}
        </p>
      </section>

      {/* 登録済みリスト */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-bold text-white">登録中のサービス</h3>
          <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
            {current.length}件
          </span>
        </div>

        {/* カードのリスト配置 */}
        {current.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl px-6 py-10 border border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-400">まだ登録がありません</p>
            <p className="text-xs text-gray-600 mt-1.5">
              下の「＋」ボタンから最初のサブスクを追加しましょう
            </p>
          </div>
        ) : (
          <SubscriptionList subscriptions={current} />
        )}
      </section>

      {/* 解約済みの履歴 */}
      {cancelled.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-400">解約済み</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-800/60 px-2.5 py-1 rounded-full border border-gray-700/60">
              {cancelled.length}件
            </span>
          </div>
          <SubscriptionList subscriptions={cancelled} />
        </section>
      )}
    </div>
  );
}
