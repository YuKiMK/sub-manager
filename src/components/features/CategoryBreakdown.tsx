import { CategorySummary } from "@/types";
import { formatJPY } from "@/lib/utils";

interface CategoryBreakdownProps {
  summaries: CategorySummary[];
}

/**
 * カテゴリ別の月額支出を横棒で比較する内訳表示。
 *
 * カテゴリは順序を持たない名義尺度のため、棒はすべて同一色(テーマカラー)とし、
 * 大小は棒の長さのみで表現する。金額・割合は全て文字で併記しているため、
 * 色が読めない環境でも値を取り違えることはない。
 */
export default function CategoryBreakdown({ summaries }: CategoryBreakdownProps) {
  // 最大値を基準に棒の長さを決める (全体比ではなく相対比較を見せるため)
  const maxTotal = Math.max(...summaries.map((s) => s.monthlyTotal), 1);

  return (
    <ul className="space-y-4">
      {summaries.map((summary) => (
        <li key={summary.category}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline space-x-2 min-w-0">
              <span className="text-sm font-medium text-white truncate">{summary.category}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{summary.count}件</span>
            </div>
            <div className="flex items-baseline space-x-2 shrink-0 pl-2">
              <span className="text-sm font-bold text-white tabular-nums">
                {formatJPY(summary.monthlyTotal)}
              </span>
              <span className="text-[11px] text-gray-500 tabular-nums w-9 text-right">
                {Math.round(summary.ratio * 100)}%
              </span>
            </div>
          </div>

          {/* 棒グラフ本体 (トラックは背景から一段だけ持ち上げた控えめなグレー) */}
          <div className="h-2 w-full bg-gray-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary rounded-r"
              style={{ width: `${Math.max((summary.monthlyTotal / maxTotal) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
