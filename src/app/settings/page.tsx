"use client";

import { Database, JapaneseYen, Layers, Wallet } from "lucide-react";
import DataExportButton from "@/components/features/DataExportButton";
import DataImportButton from "@/components/features/DataImportButton";
import LoadingPanel from "@/components/ui/LoadingPanel";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatJPY } from "@/lib/utils";
import { calculateMonthlyTotal } from "@/lib/billing";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

export default function SettingsPage() {
  const { subscriptions, isLoading, loadError } = useSubscriptions();
  const monthlyTotal = calculateMonthlyTotal(subscriptions);

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
          {/* データのバックアップ */}
          <section>
            <h3 className="text-lg font-bold text-white mb-4 px-1">データ管理</h3>
            <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                登録データはこの端末のブラウザ内にのみ保存されます。
                機種変更やブラウザのデータ削除で失われるため、定期的にファイルへ書き出しておくことを推奨します。
              </p>
              <DataExportButton subscriptions={subscriptions} />
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
