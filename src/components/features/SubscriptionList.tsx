"use client";

import { useState } from "react";
import { SubscriptionView } from "@/types";
import SubscriptionCard from "./SubscriptionCard";
import SubscriptionActionSheet from "./SubscriptionActionSheet";
import EditSubscriptionModal from "./EditSubscriptionModal";

interface SubscriptionListProps {
  subscriptions: SubscriptionView[];
}

/** 選択中のカードに対して開いている画面 */
type OpenPanel = "none" | "actions" | "edit";

/**
 * サブスクリプション一覧と、カード選択時の操作UI(操作シート/編集モーダル)をまとめるコンポーネント。
 * データ取得はServer Component側で行い、ここでは選択状態のみを管理する。
 */
export default function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>("none");

  // 再取得後のデータから常に最新の値を引き直す (編集直後の表示ズレを防ぐ)
  const selected = subscriptions.find((sub) => sub.id === selectedId) ?? null;

  const closeAll = () => {
    setSelectedId(null);
    setOpenPanel("none");
  };

  return (
    <>
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            subscription={sub}
            onClick={() => {
              setSelectedId(sub.id);
              setOpenPanel("actions");
            }}
          />
        ))}
      </div>

      {selected && openPanel === "actions" && (
        <SubscriptionActionSheet
          subscription={selected}
          onEdit={() => setOpenPanel("edit")}
          onClose={closeAll}
        />
      )}

      {selected && openPanel === "edit" && (
        <EditSubscriptionModal subscription={selected} onClose={closeAll} />
      )}
    </>
  );
}
