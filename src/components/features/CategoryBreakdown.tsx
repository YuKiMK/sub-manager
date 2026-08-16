import { CategorySummary } from "@/types";
import BreakdownBars from "@/components/ui/BreakdownBars";

interface CategoryBreakdownProps {
  summaries: CategorySummary[];
}

/**
 * カテゴリ別の月額支出を横棒で比較する内訳表示。
 * 描画は BreakdownBars と共通で、ここでは表示用の形へ移し替えるだけとする。
 */
export default function CategoryBreakdown({ summaries }: CategoryBreakdownProps) {
  return (
    <BreakdownBars
      items={summaries.map((summary) => ({
        key: summary.category,
        label: summary.category,
        count: summary.count,
        amount: summary.monthlyTotal,
        ratio: summary.ratio,
      }))}
    />
  );
}
