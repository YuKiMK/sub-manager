"use client";

import { MoreVertical, Calendar, TriangleAlert } from "lucide-react";
import { SubscriptionView } from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import { formatDaysUntil, parseDateKey } from "@/lib/billing";
import { STATUS_META } from "@/constants/status";
import { CYCLE_META } from "@/constants/cycles";
import ServiceIcon from "@/components/ui/ServiceIcon";

/** この日数以内に更新日が迫っている場合は強調表示する */
const IMMINENT_THRESHOLD_DAYS = 7;

interface SubscriptionCardProps {
  subscription: SubscriptionView;
  onClick?: () => void;
}

/**
 * サブスクリプション一覧表示用のカードコンポーネント
 * タップ可能な領域を広く取り、モバイルでの操作性を担保。
 *
 * 次回更新日は「基準日を今日以降へ繰り越した日付」を表示するため、常に未来の日付となる。
 * 下端のプログレスバーは現在の請求周期の進み具合を表し、右端に近いほど請求が迫っている。
 */
export default function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps) {
  // 日付の簡易フォーマット (例: 2026-08-25 -> 8/25)
  const dateObj = parseDateKey(subscription.upcomingBillingDate);
  const formattedDate = `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`;

  const isCancelled = subscription.status === "cancelled";
  const isTrial = subscription.status === "trial";
  const statusMeta = STATUS_META[subscription.status];

  const isImminent =
    !isCancelled &&
    !subscription.needsStatusUpdate &&
    subscription.daysUntilBilling <= IMMINENT_THRESHOLD_DAYS;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-[#1a1a1a] rounded-2xl p-4 flex items-center shadow-sm border border-gray-800/60 hover:bg-[#252525] active:scale-[0.98] transition-all cursor-pointer overflow-hidden group",
        isCancelled && "opacity-55"
      )}
    >
      {/* 左側のアクセントライン (テーマカラー) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: isCancelled ? "#555" : subscription.color || "#888" }}
      />

      {/* 左側のサービスアイコン (画像 or 頭文字) */}
      <ServiceIcon
        name={subscription.name}
        color={isCancelled ? "#555555" : subscription.color}
        iconUrl={subscription.iconUrl}
        size="md"
        className={cn("mr-4", isCancelled && "grayscale")}
      />

      {/* 中央: サービス名とカテゴリ */}
      <div className="flex-1 min-w-0 pr-2">
        <h3
          className={cn(
            "text-base font-bold truncate",
            isCancelled ? "text-gray-400 line-through" : "text-white"
          )}
        >
          {subscription.name}
        </h3>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-800 text-gray-300 rounded-md">
            {subscription.category}
          </span>
          {/* 利用中以外は状態バッジを出し、合計に入らない理由を明示する */}
          {subscription.status !== "active" && (
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-md border",
                statusMeta.badgeClass
              )}
            >
              {statusMeta.label}
            </span>
          )}
          {subscription.memo && !isCancelled && (
            <span className="text-[11px] text-gray-500 truncate max-w-[70px]">
              {subscription.memo}
            </span>
          )}
        </div>
      </div>

      {/* 右側: 金額と次回更新日 */}
      <div className="flex flex-col items-end shrink-0 pl-2">
        <div className="flex items-baseline space-x-0.5">
          <span className={cn("text-lg font-bold", isCancelled ? "text-gray-500" : "text-white")}>
            {formatJPY(subscription.price)}
          </span>
          <span className="text-[10px] text-gray-400">
            /{CYCLE_META[subscription.cycle].unit}
          </span>
        </div>

        {subscription.needsStatusUpdate ? (
          <div className="flex items-center mt-1 space-x-1 text-amber-400">
            <TriangleAlert size={11} />
            <span className="text-[11px] font-medium">要確認</span>
          </div>
        ) : isCancelled ? (
          <span className="text-[11px] font-medium text-gray-600 mt-1">解約済み</span>
        ) : (
          <div
            className={cn(
              "flex items-center mt-1 space-x-1",
              isTrial ? "text-amber-400" : isImminent ? "text-primary" : "text-gray-500"
            )}
          >
            <Calendar size={11} />
            <span className="text-[11px] font-medium">
              {isTrial
                ? `${formatDaysUntil(subscription.daysUntilBilling)}で課金`
                : isImminent
                  ? `${formatDaysUntil(subscription.daysUntilBilling)} (${formattedDate})`
                  : `次回: ${formattedDate}`}
            </span>
          </div>
        )}
      </div>

      {/* 右上のオプションメニュー (カード全体のタップと同じ操作シートを開く) */}
      <button
        className="absolute right-1 top-1 p-2 text-gray-600 hover:text-gray-300 rounded-full transition-colors z-10"
        onClick={(e) => {
          e.stopPropagation(); // カード自体のクリックイベントを二重発火させない
          onClick?.();
        }}
        aria-label="オプション"
      >
        <MoreVertical size={16} />
      </button>

      {/* 下端: 請求周期の進捗 (解約済みと要確認では意味を持たないため出さない) */}
      {!isCancelled && !subscription.needsStatusUpdate && (
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-gray-800/80">
          <div
            className={cn(
              "h-full transition-all",
              isTrial ? "bg-amber-400" : isImminent ? "bg-primary" : "bg-gray-600"
            )}
            style={{ width: `${Math.round(subscription.cycleProgress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
