"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HardDriveDownload, X } from "lucide-react";
import { daysSinceLastExport, shouldRemindBackup } from "@/lib/appPreferences";

interface BackupReminderProps {
  /** 登録件数。守るものが少ないうちは促さない */
  subscriptionCount: number;
}

/** これ以上登録されていたら、失ったときの手戻りが大きいとみなす */
const MIN_COUNT_TO_REMIND = 3;

/**
 * バックアップを促す一行。
 *
 * データはこの端末にしか無く、ブラウザのデータを消すと復元できない。
 * 気づくのは失った後になるため、失う前に一度だけ視界に入れる。
 * 閉じたら同じ表示の間は出さない（毎回出すと読まれなくなるため）。
 */
export default function BackupReminder({ subscriptionCount }: BackupReminderProps) {
  // localStorage は描画時に読めないため、表示後に判定する
  const [visible, setVisible] = useState(false);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (subscriptionCount < MIN_COUNT_TO_REMIND) return;
    if (!shouldRemindBackup()) return;

    setDays(daysSinceLastExport());
    setVisible(true);
  }, [subscriptionCount]);

  if (!visible) return null;

  return (
    <div className="flex items-start space-x-3 bg-gray-800/40 border border-gray-700/60 rounded-2xl px-4 py-3.5">
      <HardDriveDownload size={18} className="text-gray-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-200">
          {days === null ? "バックアップがまだありません" : `バックアップから${days}日経ちました`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
          データはこの端末にしかありません。
          <Link href="/settings" className="text-primary underline underline-offset-2 ml-0.5">
            設定から書き出す
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="p-1 -m-1 text-gray-600 hover:text-gray-300 rounded-full transition-colors shrink-0"
        aria-label="この案内を閉じる"
      >
        <X size={15} />
      </button>
    </div>
  );
}
