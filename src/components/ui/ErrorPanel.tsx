import { TriangleAlert } from "lucide-react";

interface ErrorPanelProps {
  /** 表示するエラー文言 */
  message: string;
}

/**
 * 端末内データの読み込みに失敗した場合の表示。
 *
 * プライベートブラウズなどでブラウザのストレージが使えない場合に出る。
 * 未登録と区別できるよう、空状態とは別の見た目にしている。
 */
export default function ErrorPanel({ message }: ErrorPanelProps) {
  return (
    <div className="bg-red-500/5 rounded-2xl px-6 py-10 border border-red-500/20 flex flex-col items-center justify-center text-center">
      <TriangleAlert size={26} className="text-red-400 mb-3" />
      <p className="text-sm font-medium text-red-300 leading-relaxed">{message}</p>
    </div>
  );
}
