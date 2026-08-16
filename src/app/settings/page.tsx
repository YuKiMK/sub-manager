"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, JapaneseYen, Layers, Wallet } from "lucide-react";
import DataExportButton from "@/components/features/DataExportButton";
import DataImportButton from "@/components/features/DataImportButton";
import StoragePanel from "@/components/features/StoragePanel";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { cn, formatJPY } from "@/lib/utils";
import { calculateMonthlyTotal } from "@/lib/billing";
import { BACKUP_REMINDER_DAYS, daysSinceLastExport } from "@/lib/appPreferences";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

/** 最終バックアップの経過日数を文言にする */
function describeLastBackup(days: number | null): { text: string; stale: boolean } {
  if (days === null) return { text: "まだ書き出していません", stale: true };
  if (days <= 0) return { text: "本日", stale: false };
  if (days === 1) return { text: "昨日", stale: false };
  return { text: `${days}日前`, stale: days >= BACKUP_REMINDER_DAYS };
}

export default function SettingsPage() {
  const { subscriptions, isLoading, loadError } = useSubscriptions();
  const monthlyTotal = calculateMonthlyTotal(subscriptions);

  // localStorage は描画時には読めないため、表示後に読み込む
  const [backupDays, setBackupDays] = useState<number | null>(null);
  const [backupChecked, setBackupChecked] = useState(false);

  const reloadBackupState = useCallback(() => {
    setBackupDays(daysSinceLastExport());
    setBackupChecked(true);
  }, []);

  useEffect(() => {
    reloadBackupState();
  }, [reloadBackupState]);

  const backup = describeLastBackup(backupDays);

  /** アプリの基本情報 (仕様として固定されている項目) */
  const appInfo = [
    { icon: JapaneseYen, label: "通貨", value: "日本円 (JPY) 固定" },
    { icon: Database, label: "保存先", value: "この端末のブラウザ内" },
    { icon: Layers, label: "登録件数", value: `${subscriptions.length}件` },
  ];

  return (
    <div className="space-y-7 pb-4">
      <header className="pt-4">
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-sm text-gray-400 mt-1">データとアプリの情報</p>
      </header>

      {loadError ? (
        <ErrorPanel message={loadError} />
      ) : isLoading ? (
        <LoadingPanel />
      ) : (
        <>
          {/* 保存領域の保護状態 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-4 px-1">保存データの保護</h3>
            <StoragePanel />
          </section>

          {/* データのバックアップ */}
          <section>
            <h3 className="text-lg font-bold text-white mb-4 px-1">データ管理</h3>
            <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                登録データはこの端末のブラウザ内にのみ保存されます。
                機種変更やブラウザのデータ削除で失われるため、定期的にファイルへ書き出しておくことを推奨します。
              </p>

              {/* 最後にいつ備えたかが分からないと「そろそろ書き出す」判断ができない */}
              {backupChecked && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-gray-500">最後の書き出し</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      backup.stale ? "text-amber-400" : "text-gray-300"
                    )}
                  >
                    {backup.text}
                  </span>
                </div>
              )}

              <DataExportButton subscriptions={subscriptions} onExported={reloadBackupState} />
              <DataImportButton />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                読み込みは既存データを消さずに追加します（同じ項目は上書き）。
              </p>
            </div>
          </section>

          {/* 現在の状況 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-4 px-1">アプリ情報</h3>
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800/60 divide-y divide-gray-800/70">
              {appInfo.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center px-5 py-4">
                  <Icon size={17} className="text-gray-500 shrink-0 mr-3" />
                  <span className="text-sm text-gray-400 flex-1">{label}</span>
                  <span className="text-sm font-medium text-white">{value}</span>
                </div>
              ))}
              <div className="flex items-center px-5 py-4">
                <Wallet size={17} className="text-gray-500 shrink-0 mr-3" />
                <span className="text-sm text-gray-400 flex-1">実質月額合計</span>
                <span className="text-sm font-medium text-white">{formatJPY(monthlyTotal)}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
