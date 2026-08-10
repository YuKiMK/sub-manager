"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Subscription, SubscriptionView } from "@/types";
import { getToday, toDateKey } from "@/lib/billing";

interface DataExportButtonProps {
  subscriptions: SubscriptionView[];
}

/**
 * 登録データをJSONファイルとして書き出すボタン。
 * データはこの端末のブラウザ内にのみ存在するため、
 * 機種変更・ブラウザのデータ削除に備えたバックアップ手段として提供する。
 * 別の端末へデータを移す唯一の経路でもある。
 */
export default function DataExportButton({ subscriptions }: DataExportButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    // 表示用の算出値は除き、DBに保存されている項目のみを書き出す
    const records: Subscription[] = subscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: sub.price,
      cycle: sub.cycle,
      nextBillingDate: sub.nextBillingDate,
      category: sub.category,
      status: sub.status,
      cancelledAt: sub.cancelledAt,
      memo: sub.memo,
      color: sub.color,
      iconUrl: sub.iconUrl,
    }));

    const payload = {
      exportedAt: new Date().toISOString(),
      currency: "JPY",
      subscriptions: records,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `subscriptions-${toDateKey(getToday())}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setMessage(`${records.length}件を書き出しました`);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={subscriptions.length === 0}
        className="w-full bg-[#2a2a2a] text-white font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <Download size={18} />
        <span>JSONで書き出す</span>
      </button>
      {message && <p className="text-xs text-gray-500 mt-2.5 text-center">{message}</p>}
    </div>
  );
}
