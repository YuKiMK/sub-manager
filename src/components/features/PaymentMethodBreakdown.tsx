import { PaymentMethodSummary } from "@/types";
import BreakdownBars from "@/components/ui/BreakdownBars";

interface PaymentMethodBreakdownProps {
  summaries: PaymentMethodSummary[];
}

/**
 * 支払い方法別の月額支出を横棒で比較する内訳表示。
 *
 * カードを再発行・解約するときに、どれを切り替える必要があるかを
 * 金額の大きい順に把握できるようにする。
 */
export default function PaymentMethodBreakdown({ summaries }: PaymentMethodBreakdownProps) {
  return (
    <BreakdownBars
      items={summaries.map((summary) => ({
        key: summary.method,
        label: summary.method,
        count: summary.count,
        amount: summary.monthlyTotal,
        ratio: summary.ratio,
      }))}
    />
  );
}
