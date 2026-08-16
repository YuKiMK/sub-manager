"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, SearchX } from "lucide-react";
import SubscriptionList from "@/components/features/SubscriptionList";
import SubscriptionFilterBar from "@/components/features/SubscriptionFilterBar";
import HomeAlertBanner from "@/components/features/HomeAlertBanner";
import BackupReminder from "@/components/features/BackupReminder";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { cn, formatJPY } from "@/lib/utils";
import {
  calculateDailyAverage,
  calculateMonthlyTotal,
  calculateYearlyTotal,
} from "@/lib/billing";
import {
  DEFAULT_LIST_FILTER,
  filterAndSortSubscriptions,
  isFilterActive,
} from "@/lib/subscriptionFilter";
import { getPreferredSort, setPreferredSort } from "@/lib/appPreferences";
import { ListFilter } from "@/types";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

/** 検索や並び替えを出し始める件数 (数件しか無いうちは邪魔になるだけ) */
const CONTROLS_THRESHOLD = 5;

export default function Home() {
  // 端末内に保存された登録内容を取得 (次回更新日が近い順)
  const { subscriptions, isLoading, loadError } = useSubscriptions();
  const [filter, setFilter] = useState(DEFAULT_LIST_FILTER);
  const [showCancelled, setShowCancelled] = useState(false);

  // 前回の並び順を引き継ぐ (localStorage は描画時に読めないため表示後に反映する)
  useEffect(() => {
    const preferred = getPreferredSort();
    if (preferred) setFilter((current) => ({ ...current, sort: preferred }));
  }, []);

  /** 並び順だけは次回も同じ見え方になるよう覚えておく */
  const handleFilterChange = useCallback((next: ListFilter) => {
    setFilter((current) => {
      if (next.sort !== current.sort) setPreferredSort(next.sort);
      return next;
    });
  }, []);

  // 解約済みは一覧の下部に履歴としてまとめる
  const current = subscriptions.filter((sub) => sub.status !== "cancelled");
  const cancelled = subscriptions.filter((sub) => sub.status === "cancelled");

  const visible = useMemo(
    () => filterAndSortSubscriptions(current, filter),
    [current, filter]
  );

  const monthlyTotal = calculateMonthlyTotal(subscriptions);
  const yearlyTotal = calculateYearlyTotal(subscriptions);
  const dailyAverage = calculateDailyAverage(subscriptions);

  // 合計に入っていない契約(無料期間中・開始予定)の件数
  const pendingCount = current.filter((sub) => !sub.countsTowardTotal).length;

  // 件数が少ないうちは操作バーを出さず、一覧をそのまま見せる
  const showControls = current.length >= CONTROLS_THRESHOLD;
  const filtering = isFilterActive(filter);

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

      <div className="space-y-2.5">
        <HomeAlertBanner subscriptions={subscriptions} />
        <BackupReminder subscriptionCount={subscriptions.length} />
      </div>

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
        <div className="flex items-center space-x-3 mt-2">
          <p className="text-xs text-gray-500 font-medium">年間 {formatJPY(yearlyTotal)}</p>
          <span className="w-px h-3 bg-gray-700" />
          <p className="text-xs text-gray-500 font-medium">1日 {formatJPY(dailyAverage)}</p>
        </div>
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
          {!showControls && (
            <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
              {current.length}件
            </span>
          )}
        </div>

        {showControls && (
          <div className="mb-4">
            <SubscriptionFilterBar
              filter={filter}
              onChange={handleFilterChange}
              resultCount={visible.length}
            />
          </div>
        )}

        {/* カードのリスト配置 */}
        {current.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl px-6 py-10 border border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-400">まだ登録がありません</p>
            <p className="text-xs text-gray-600 mt-1.5">
              下の「＋」ボタンから最初のサブスクを追加しましょう
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl px-6 py-10 border border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
            <SearchX size={24} className="text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">条件に合うサービスがありません</p>
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_LIST_FILTER)}
              className="mt-3 text-xs font-medium text-primary hover:brightness-125 transition-all"
            >
              絞り込みを解除する
            </button>
          </div>
        ) : (
          <SubscriptionList subscriptions={visible} />
        )}
      </section>

      {/* 解約済みの履歴 (普段は畳んでおき、一覧の見通しを優先する) */}
      {cancelled.length > 0 && !filtering && (
        <section>
          <button
            type="button"
            onClick={() => setShowCancelled((open) => !open)}
            aria-expanded={showCancelled}
            className="w-full flex items-center justify-between mb-4 px-1 group"
          >
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-gray-400 group-hover:text-gray-300 transition-colors">
                解約済み
              </h3>
              <ChevronDown
                size={18}
                className={cn(
                  "text-gray-600 transition-transform",
                  showCancelled && "rotate-180"
                )}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-800/60 px-2.5 py-1 rounded-full border border-gray-700/60">
              {cancelled.length}件
            </span>
          </button>
          {showCancelled && <SubscriptionList subscriptions={cancelled} />}
        </section>
      )}
    </div>
  );
}
