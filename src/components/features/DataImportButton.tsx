"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";

/** メッセージの種類 (成功=グレー、失敗=赤) */
type Message = { text: string; isError: boolean };

/**
 * 書き出したJSONバックアップを読み込むボタン。
 *
 * 既存データを消さずに取り込む(同じidは上書き)ため、押し間違えても登録内容は失われない。
 */
export default function DataImportButton() {
  const { importMany } = useSubscriptions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを選び直せるよう入力値をリセットしておく
    e.target.value = "";
    if (!file) return;

    setMessage(null);
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // 書き出し形式 { subscriptions: [...] } と、配列そのものの両方を受け付ける
      const records = Array.isArray(parsed) ? parsed : parsed?.subscriptions;

      const result = await importMany(records);

      if (!result.success) {
        setMessage({ text: result.error, isError: true });
        return;
      }

      const skippedNote = result.skipped > 0 ? `（${result.skipped}件は形式が不正のため除外）` : "";
      setMessage({ text: `${result.imported}件を読み込みました${skippedNote}`, isError: false });
    } catch (error) {
      console.error("バックアップの読み込みでエラーが発生しました:", error);
      setMessage({ text: "ファイルを読み込めませんでした。JSON形式か確認してください。", isError: true });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
        className="w-full bg-[#2a2a2a] text-white font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <Upload size={18} />
        <span>{isImporting ? "読み込み中..." : "JSONから読み込む"}</span>
      </button>

      {message && (
        <p
          className={`text-xs mt-2.5 text-center ${message.isError ? "text-red-400" : "text-gray-500"}`}
        >
          {message.text}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
