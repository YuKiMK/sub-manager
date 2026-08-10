import Link from "next/link";
import { TriangleAlert, BellRing } from "lucide-react";
import { SubscriptionView } from "@/types";
import { formatDaysUntil } from "@/lib/billing";

/** 「まもなく請求」とみなす日数 */
const IMMINENT_DAYS = 3;

interface HomeAlertBannerProps {
  subscriptions: SubscriptionView[];
}

/**
 * ホーム上部のお知らせ。
 *
 * ローカル動作のため端末へのプッシュ通知は出せないが、
 * 「解約し忘れ」を防ぐという目的はアプリを開いた瞬間に伝えれば果たせる。
 * 優先度は 状態の要確認 > 無料期間の終了 > 直近の請求 の順。
 */
export default function HomeAlertBanner({ subscriptions }: HomeAlertBannerProps) {
  const needsUpdate = subscriptions.filter((sub) => sub.needsStatusUpdate);

  const endingTrials = subscriptions.filter(
    (sub) => sub.status === "trial" && !sub.needsStatusUpdate && sub.daysUntilBilling <= 7
  );

  const imminent = subscriptions.filter(
    (sub) => sub.status === "active" && sub.daysUntilBilling <= IMMINENT_DAYS
  );

  if (needsUpdate.length === 0 && endingTrials.length === 0 && imminent.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {needsUpdate.length > 0 && (
        <div className="flex items-start space-x-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3.5">
          <TriangleAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-200">
              {needsUpdate.length}件の状態を確認してください
            </p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              {needsUpdate.map((sub) => sub.name).join("、")} が予定日を過ぎています
            </p>
          </div>
        </div>
      )}

      {endingTrials.length > 0 && (
        <div className="flex items-start space-x-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3.5">
          <BellRing size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-200">まもなく無料期間が終わります</p>
            <ul className="mt-1 space-y-0.5">
              {endingTrials.map((sub) => (
                <li key={sub.id} className="text-xs text-amber-200/80">
                  {sub.name} — {formatDaysUntil(sub.daysUntilBilling)}で課金開始
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {imminent.length > 0 && (
        <Link
          href="/calendar"
          className="flex items-start space-x-3 bg-primary/10 border border-primary/25 rounded-2xl px-4 py-3.5 hover:bg-primary/15 active:scale-[0.99] transition-all"
        >
          <BellRing size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">
              {IMMINENT_DAYS}日以内に{imminent.length}件の請求があります
            </p>
            <p className="text-xs text-primary/70 mt-0.5">
              {imminent.map((sub) => sub.name).join("、")}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
