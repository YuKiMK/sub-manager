"use client";

import { useState } from "react";
import { Pencil, Trash2, TriangleAlert, CircleCheck, RotateCcw, Ban } from "lucide-react";
import { SubscriptionStatus, SubscriptionView } from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";
import { STATUS_META } from "@/constants/status";
import ServiceIcon from "@/components/ui/ServiceIcon";

interface SubscriptionActionSheetProps {
  subscription: SubscriptionView;
  onEdit: () => void;
  onClose: () => void;
}

/**
 * カードをタップした際に表示される操作シート (Bottom Sheet型)
 * 「状態の切り替え」「編集」「削除」を親指の届く画面下部に配置する。
 * 削除は誤操作を防ぐため、同一シート内で2段階の確認を挟む。
 */
export default function SubscriptionActionSheet({
  subscription,
  onEdit,
  onClose,
}: SubscriptionActionSheetProps) {
  const { changeStatus, remove } = useSubscriptions();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCancelled = subscription.status === "cancelled";

  /** 状態変更・削除に共通する実行処理 */
  const run = async (task: () => Promise<{ success: boolean; error?: string }>) => {
    if (isWorking) return;
    setIsWorking(true);
    setErrorMessage(null);

    try {
      const result = await task();
      if (!result.success) {
        setErrorMessage(result.error ?? "処理に失敗しました。");
        return;
      }
      onClose();
    } catch (error) {
      console.error("操作でエラーが発生しました:", error);
      setErrorMessage("処理に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsWorking(false);
    }
  };

  const handleStatusChange = (status: SubscriptionStatus) =>
    run(() => changeStatus(subscription.id, status));

  const handleDelete = () => run(() => remove(subscription.id));

  /** 状態に応じた一手操作 (ラベル・アイコン・遷移先) */
  const statusAction = (() => {
    if (isCancelled) {
      return {
        label: "利用を再開する",
        icon: RotateCcw,
        next: "active" as SubscriptionStatus,
      };
    }
    if (subscription.status === "trial") {
      return {
        label: "無料期間を終了して利用中にする",
        icon: CircleCheck,
        next: "active" as SubscriptionStatus,
      };
    }
    if (subscription.status === "scheduled") {
      return {
        label: "利用を開始した (利用中にする)",
        icon: CircleCheck,
        next: "active" as SubscriptionStatus,
      };
    }
    return null;
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1e1e1e] rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 対象サービスの表示 */}
        <div className="flex items-center p-5 border-b border-gray-800">
          <ServiceIcon
            name={subscription.name}
            color={subscription.color}
            iconUrl={subscription.iconUrl}
            size="md"
            className="mr-3"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white truncate">{subscription.name}</p>
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-xs text-gray-400">
                {formatJPY(subscription.price)} / {subscription.cycle === "monthly" ? "月" : "年"}
              </p>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  STATUS_META[subscription.status].badgeClass
                )}
              >
                {STATUS_META[subscription.status].label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          {errorMessage && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {errorMessage}
            </p>
          )}

          {isConfirmingDelete ? (
            <>
              {/* 削除の最終確認 */}
              <div className="flex items-start space-x-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <TriangleAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  「{subscription.name}」を履歴ごと削除します。この操作は取り消せません。
                </p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isWorking}
                className="w-full bg-red-500 text-white font-bold text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 size={19} strokeWidth={2.5} />
                <span>{isWorking ? "削除中..." : "完全に削除する"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isWorking}
                className="w-full bg-[#2a2a2a] text-gray-300 font-medium text-base rounded-xl py-3.5 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                やめる
              </button>
            </>
          ) : (
            <>
              {/* 予定日を過ぎたトライアル・開始予定への注意喚起 */}
              {subscription.needsStatusUpdate && (
                <div className="flex items-start space-x-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-1">
                  <TriangleAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    予定日を過ぎています。状態を更新すると合計金額に反映されます。
                  </p>
                </div>
              )}

              {statusAction && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(statusAction.next)}
                  disabled={isWorking}
                  className="w-full bg-primary/15 text-primary font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-primary/30 hover:bg-primary/25 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <statusAction.icon size={18} />
                  <span>{statusAction.label}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onEdit}
                className="w-full bg-[#2a2a2a] text-white font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all"
              >
                <Pencil size={18} />
                <span>編集する</span>
              </button>

              {/* 解約は削除と違い履歴が残る。まずこちらを勧める */}
              {!isCancelled && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={isWorking}
                  className="w-full bg-[#2a2a2a] text-gray-300 font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <Ban size={18} />
                  <span>解約した (履歴に残す)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full bg-[#2a2a2a] text-red-400 font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-red-500/10 hover:border-red-500/30 active:scale-[0.98] transition-all"
              >
                <Trash2 size={18} />
                <span>削除する</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-gray-500 font-medium text-base rounded-xl py-3.5 hover:text-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
