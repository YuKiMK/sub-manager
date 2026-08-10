import { LoaderCircle } from "lucide-react";

interface LoadingPanelProps {
  /** 読み込み中に表示する文言 */
  label?: string;
}

/**
 * 端末内データの読み込み中に出すプレースホルダー。
 *
 * データはブラウザ内のIndexedDBから非同期に読み込むため、
 * 表示直後の一瞬だけ「登録なし」の状態になる。
 * それをそのまま出すと未登録と誤解されるため、読み込み中は本パネルに差し替える。
 */
export default function LoadingPanel({ label = "読み込んでいます..." }: LoadingPanelProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl px-6 py-12 border border-gray-800/60 flex flex-col items-center justify-center text-center">
      <LoaderCircle size={26} className="text-gray-700 mb-3 animate-spin" />
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
