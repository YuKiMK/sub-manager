"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, LoaderCircle } from "lucide-react";
import {
  StorageStatus,
  formatBytes,
  getStorageStatus,
  requestPersistentStorage,
} from "@/lib/storagePersistence";

/**
 * 端末内データの保護状態を表示し、保護を要求できるようにするパネル。
 *
 * ブラウザは保存領域が足りなくなると断りなくデータを消すことがある。
 * 登録内容はこの端末にしか存在しないため、保護されているかを見えるようにし、
 * 保護されていない場合は本人の操作で要求できるようにしておく。
 */
export default function StoragePanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus(await getStorageStatus());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRequest = async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    setMessage(null);

    try {
      const granted = await requestPersistentStorage();
      setMessage(
        granted
          ? "保護されました。ブラウザの自動削除の対象から外れます。"
          : "このブラウザでは保護を有効にできませんでした。JSONの書き出しで備えてください。"
      );
      await reload();
    } finally {
      setIsRequesting(false);
    }
  };

  if (!status) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60 flex items-center justify-center">
        <LoaderCircle size={18} className="text-gray-700 animate-spin" />
      </div>
    );
  }

  const Icon = status.persisted ? ShieldCheck : ShieldAlert;

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-gray-800/60 space-y-4">
      <div className="flex items-start space-x-3">
        <Icon
          size={20}
          className={`shrink-0 mt-0.5 ${status.persisted ? "text-emerald-400" : "text-amber-400"}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            {status.persisted ? "データは保護されています" : "データが削除される可能性があります"}
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {status.persisted
              ? "端末の空き容量が減っても、このアプリのデータは自動削除されません。"
              : "ブラウザは保存領域が足りなくなると、断りなくデータを消すことがあります。"}
          </p>
        </div>
      </div>

      {status.usageBytes !== null && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-gray-500">使用量</span>
          <span className="text-gray-300 font-medium tabular-nums">
            {formatBytes(status.usageBytes)}
            {status.quotaBytes ? ` / ${formatBytes(status.quotaBytes)}` : ""}
          </span>
        </div>
      )}

      {!status.persisted && status.supported && (
        <button
          type="button"
          onClick={handleRequest}
          disabled={isRequesting}
          className="w-full bg-[#2a2a2a] text-white font-medium text-base rounded-xl py-3.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <ShieldCheck size={18} />
          <span>{isRequesting ? "要求中..." : "データを保護する"}</span>
        </button>
      )}

      {message && <p className="text-[11px] text-gray-500 leading-relaxed">{message}</p>}

      {!status.supported && (
        <p className="text-[11px] text-gray-600 leading-relaxed">
          このブラウザは保護状態を確認できません。JSONの書き出しで備えてください。
        </p>
      )}
    </div>
  );
}
