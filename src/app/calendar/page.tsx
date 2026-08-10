"use client";

import { CalendarDays } from "lucide-react";
import BillingCalendar from "@/components/features/BillingCalendar";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { getToday, toDateKey } from "@/lib/billing";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

export default function CalendarPage() {
  const { subscriptions, isLoading, loadError } = useSubscriptions();
  // 解約済みは以後の請求が無いためカレンダーから除く
  const billable = subscriptions.filter((sub) => sub.status !== "cancelled");

  return (
    <div className="space-y-6 pb-4">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">カレンダー</h1>
        <p className="text-sm text-gray-400 mt-1">請求日を月ごとに確認</p>
      </header>

      {loadError ? (
        <ErrorPanel message={loadError} />
      ) : isLoading ? (
        <LoadingPanel />
      ) : billable.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl px-6 py-12 border border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
          <CalendarDays size={28} className="text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-400">表示できる請求がありません</p>
          <p className="text-xs text-gray-600 mt-1.5">
            サブスクを登録すると請求日がカレンダーに並びます
          </p>
        </div>
      ) : (
        <BillingCalendar subscriptions={billable} todayKey={toDateKey(getToday())} />
      )}
    </div>
  );
}
