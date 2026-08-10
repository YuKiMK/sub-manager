"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddSubscriptionModal from "../features/AddSubscriptionModal";

/**
 * フローティング追加ボタン (Floating Action Button)
 * 画面中央下部に配置し、片手で親指が届きやすい特等席に配置。
 */
export default function FAB() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(187,134,252,0.3)] hover:scale-105 active:scale-95 transition-all"
          aria-label="サブスクリプションを追加"
        >
          <Plus size={30} strokeWidth={2.5} />
        </button>
      </div>

      {/* モーダルのマウント/アンマウントを制御 */}
      {isModalOpen && (
        <AddSubscriptionModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}