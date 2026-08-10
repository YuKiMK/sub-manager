import { SubscriptionView } from "@/types";
import { formatJPY } from "@/lib/utils";
import { formatDaysUntil, parseDateKey } from "@/lib/billing";
import ServiceIcon from "@/components/ui/ServiceIcon";

interface UpcomingPaymentsProps {
  subscriptions: SubscriptionView[];
  /** 集計対象とする日数 */
  withinDays: number;
}

/**
 * 指定日数以内に更新日が到来するサブスクリプションの支払い予定リスト。
 * 「今月あといくら引き落とされるのか」を把握するための表示。
 */
export default function UpcomingPayments({ subscriptions, withinDays }: UpcomingPaymentsProps) {
  // 解約済みと、予定日を過ぎたまま放置されているものは支払い予定に含めない
  const upcoming = subscriptions.filter(
    (sub) =>
      sub.status !== "cancelled" &&
      !sub.needsStatusUpdate &&
      sub.daysUntilBilling >= 0 &&
      sub.daysUntilBilling <= withinDays
  );
  const total = upcoming.reduce((sum, sub) => sum + sub.price, 0);

  if (upcoming.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        今後{withinDays}日間の支払い予定はありません
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-800/70">
        {upcoming.map((sub) => {
          const date = parseDateKey(sub.upcomingBillingDate);
          const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

          return (
            <li key={sub.id} className="flex items-center py-3 first:pt-0">
              <div className="flex flex-col items-center w-11 shrink-0 mr-3">
                <span className="text-sm font-bold text-white tabular-nums">{label}</span>
                <span className="text-[10px] text-gray-500">
                  {formatDaysUntil(sub.daysUntilBilling)}
                </span>
              </div>
              <ServiceIcon
                name={sub.name}
                color={sub.color}
                iconUrl={sub.iconUrl}
                size="sm"
                className="mr-3"
              />
              <span className="flex-1 min-w-0 text-sm text-white truncate pr-2">{sub.name}</span>
              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {formatJPY(sub.price)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between pt-3 mt-1 border-t border-gray-700">
        <span className="text-xs font-medium text-gray-400">合計 ({upcoming.length}件)</span>
        <span className="text-base font-bold text-primary tabular-nums">{formatJPY(total)}</span>
      </div>
    </div>
  );
}
