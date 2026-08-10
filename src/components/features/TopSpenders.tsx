import { SubscriptionView } from "@/types";
import { formatJPY } from "@/lib/utils";
import ServiceIcon from "@/components/ui/ServiceIcon";

interface TopSpendersProps {
  subscriptions: SubscriptionView[];
  /** 全体の月額合計 (占有率の算出に使う) */
  monthlyTotal: number;
}

/**
 * 月額換算が高い順に並べたリスト。
 * 「どれを削れば効くか」を判断するための入口。
 * 年払いは月割にして横並びで比較できるようにしている。
 */
export default function TopSpenders({ subscriptions, monthlyTotal }: TopSpendersProps) {
  if (subscriptions.length === 0) return null;

  return (
    <ul className="space-y-3.5">
      {subscriptions.map((sub, index) => (
        <li key={sub.id} className="flex items-center">
          <span className="w-4 text-xs font-bold text-gray-600 tabular-nums shrink-0">
            {index + 1}
          </span>
          <ServiceIcon
            name={sub.name}
            color={sub.color}
            iconUrl={sub.iconUrl}
            size="sm"
            className="mx-3"
          />

          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-medium text-white truncate">{sub.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {formatJPY(sub.price)}/{sub.cycle === "monthly" ? "月" : "年"}
              {monthlyTotal > 0 && (
                <span className="ml-1.5">
                  全体の{Math.round((sub.monthlyEquivalentPrice / monthlyTotal) * 100)}%
                </span>
              )}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white tabular-nums">
              {formatJPY(sub.monthlyEquivalentPrice)}
            </p>
            <p className="text-[10px] text-gray-500">月換算</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
