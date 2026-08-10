/**
 * 課金サイクルに関する計算ロジック
 * 金額は全て日本円(JPY)の整数として扱い、外貨換算は一切行わない。
 * 日付は時差による1日のズレを避けるため、全てUTCの0時に正規化して計算する。
 */
import {
  BillingCycle,
  CategorySummary,
  Category,
  MonthlySpending,
  Subscription,
  SubscriptionView,
} from '@/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 繰り越し計算の無限ループを防ぐための上限 (月次で100年分) */
const MAX_SHIFT_STEPS = 1200;

/**
 * YYYY-MM-DD 形式の文字列をUTC0時のDateへ変換する
 */
export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * DateをYYYY-MM-DD形式の文字列へ変換する
 */
export function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 実行環境のローカル日付における「今日」をUTC0時のDateとして取得する
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * 基準日から指定月数を加算する。
 * 月末日の丸め込みは常に元の基準日を起点に行うため、
 * 「1/31 → 2/28 → 3/31」のように本来の請求日を維持できる。
 */
function shiftMonthsFromAnchor(anchor: Date, monthsToAdd: number): Date {
  const anchorDay = anchor.getUTCDate();
  const totalMonths = anchor.getUTCMonth() + monthsToAdd;
  const year = anchor.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;

  // 当該月の末日 (翌月0日 = 当月末日)
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(anchorDay, lastDayOfMonth)));
}

/**
 * 登録された基準日から、今日以降に到来する実際の次回更新日を算出する。
 * 登録日が過去になっても表示が古くならないよう、周期分だけ繰り越す。
 *
 * @param anchorDate DBに保存されている基準日 (YYYY-MM-DD)
 * @param cycle 支払周期
 * @param today 判定基準日 (省略時は本日)
 * @returns 今日以降の次回更新日 (YYYY-MM-DD)
 */
export function getUpcomingBillingDate(
  anchorDate: string,
  cycle: BillingCycle,
  today: Date = getToday()
): string {
  const anchor = parseDateKey(anchorDate);
  if (Number.isNaN(anchor.getTime())) return anchorDate;

  // 未来の日付が登録されている場合はそのまま利用する
  if (anchor.getTime() >= today.getTime()) return toDateKey(anchor);

  const monthsPerCycle = cycle === 'yearly' ? 12 : 1;

  for (let step = 1; step <= MAX_SHIFT_STEPS; step++) {
    const candidate = shiftMonthsFromAnchor(anchor, monthsPerCycle * step);
    if (candidate.getTime() >= today.getTime()) return toDateKey(candidate);
  }

  return anchorDate;
}

/**
 * 2つの日付の差を日数で返す (切り捨てなしの整数)
 */
export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * 次回請求日の1周期前(＝前回の請求日)を返す。
 * プログレスバーの起点として使う。
 */
export function getPreviousBillingDate(upcomingDate: string, cycle: BillingCycle): string {
  const upcoming = parseDateKey(upcomingDate);
  return toDateKey(shiftMonthsFromAnchor(upcoming, cycle === 'yearly' ? -12 : -1));
}

/**
 * 現在の請求周期の経過割合を 0〜1 で返す。
 * 1に近いほど次回請求日が迫っている。
 */
export function getCycleProgress(
  upcomingDate: string,
  cycle: BillingCycle,
  today: Date = getToday()
): number {
  const start = parseDateKey(getPreviousBillingDate(upcomingDate, cycle));
  const end = parseDateKey(upcomingDate);

  const total = diffInDays(start, end);
  if (total <= 0) return 1;

  const elapsed = diffInDays(start, today);
  return Math.min(Math.max(elapsed / total, 0), 1);
}

/**
 * 指定した月に発生する請求日を列挙する。
 *
 * 基準日より前の月には請求が無かったものとして扱い、過去へは遡らない。
 * 解約済みは請求が発生しないため空配列を返す。
 *
 * @param subscription 対象のサブスクリプション
 * @param year 対象の年
 * @param monthIndex 対象の月 (0〜11)
 * @returns その月に発生する請求日 (YYYY-MM-DD) の配列
 */
export function getBillingDatesInMonth(
  subscription: Subscription,
  year: number,
  monthIndex: number
): string[] {
  // 解約済みは解約日までの請求のみ残す (解約日が不明なものは表示しない)
  if (subscription.status === 'cancelled' && !subscription.cancelledAt) return [];

  const anchor = parseDateKey(subscription.nextBillingDate);
  if (Number.isNaN(anchor.getTime())) return [];

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  // 基準日より前は契約前とみなし、請求を表示しない
  if (monthEnd.getTime() < anchor.getTime()) return [];

  const monthsPerCycle = subscription.cycle === 'yearly' ? 12 : 1;
  const monthsFromAnchor =
    (year - anchor.getUTCFullYear()) * 12 + (monthIndex - anchor.getUTCMonth());

  // 年額は基準日と同じ月にしか発生しない
  if (monthsFromAnchor % monthsPerCycle !== 0) return [];

  const occurrence = shiftMonthsFromAnchor(anchor, monthsFromAnchor);
  if (occurrence.getTime() < monthStart.getTime()) return [];

  // 解約後は請求が発生しない
  if (subscription.cancelledAt) {
    const cancelled = parseDateKey(subscription.cancelledAt);
    if (occurrence.getTime() > cancelled.getTime()) return [];
  }

  return [toDateKey(occurrence)];
}

/**
 * 月ごとの請求予定額を集計する。
 *
 * 保存しているのは「基準日と周期」であり支払い履歴ではないため、
 * 過去に遡った実績は復元できない。そこで今月を起点に先の月だけを対象とする。
 * 年払いの更新が重なって高くなる月を事前に把握するのが狙い。
 *
 * @param subscriptions 集計対象
 * @param monthCount 今月を含めて何ヶ月分を集計するか
 * @param today 起点となる日
 */
export function summarizeMonthlySpending(
  subscriptions: Subscription[],
  monthCount: number,
  today: Date = getToday()
): MonthlySpending[] {
  const result: MonthlySpending[] = [];

  for (let offset = 0; offset < monthCount; offset++) {
    const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();

    let total = 0;
    let count = 0;

    for (const sub of subscriptions) {
      for (const _ of getBillingDatesInMonth(sub, year, monthIndex)) {
        total += sub.price;
        count++;
      }
    }

    result.push({
      year,
      monthIndex,
      label: `${monthIndex + 1}`,
      total,
      count,
      isCurrentMonth: offset === 0,
    });
  }

  return result;
}

/**
 * 月額換算が高い順に上位を返す (利用中のみ)
 *
 * @param subscriptions 集計対象
 * @param limit 返す件数
 */
export function findTopSpenders(
  subscriptions: SubscriptionView[],
  limit: number
): SubscriptionView[] {
  return subscriptions
    .filter(countsTowardTotal)
    .slice()
    .sort((a, b) => b.monthlyEquivalentPrice - a.monthlyEquivalentPrice)
    .slice(0, limit);
}

/**
 * 年額プランを12で割って月額へ換算する (円未満は切り捨て)
 */
export function getMonthlyEquivalentPrice(price: number, cycle: BillingCycle): number {
  return cycle === 'yearly' ? Math.floor(price / 12) : price;
}

/**
 * 実質月額合計に算入すべき契約かどうか。
 * トライアル中・開始予定はまだ支払いが発生しておらず、解約済みは支払いが終わっているため除外する。
 */
export function countsTowardTotal(subscription: Subscription): boolean {
  return subscription.status === 'active';
}

/**
 * 保存データに表示用の算出値(次回更新日・残日数・月額換算・周期の進捗)を付与する
 */
export function toSubscriptionView(
  subscription: Subscription,
  today: Date = getToday()
): SubscriptionView {
  const isOneTimeDate = subscription.status === 'trial' || subscription.status === 'scheduled';

  // トライアル終了日・利用開始日は「一度きりの予定日」、解約済みは以後請求が無いため繰り越さない
  const upcomingBillingDate =
    isOneTimeDate || subscription.status === 'cancelled'
      ? subscription.nextBillingDate
      : getUpcomingBillingDate(subscription.nextBillingDate, subscription.cycle, today);

  const daysUntilBilling = diffInDays(today, parseDateKey(upcomingBillingDate));

  return {
    ...subscription,
    upcomingBillingDate,
    daysUntilBilling,
    monthlyEquivalentPrice: getMonthlyEquivalentPrice(subscription.price, subscription.cycle),
    countsTowardTotal: countsTowardTotal(subscription),
    cycleProgress:
      subscription.status === 'cancelled'
        ? 1
        : getCycleProgress(upcomingBillingDate, subscription.cycle, today),
    // 予定日を過ぎたトライアル・開始予定は、勝手に状態を変えず更新を促す
    needsStatusUpdate: isOneTimeDate && daysUntilBilling < 0,
  };
}

/**
 * 月額の実質合計を計算する (年額は12で割って月額換算)
 * 利用中の契約のみを対象とし、トライアル・開始予定・解約済みは含めない。
 */
export function calculateMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(countsTowardTotal)
    .reduce((total, sub) => total + getMonthlyEquivalentPrice(sub.price, sub.cycle), 0);
}

/**
 * 年間の実質合計を計算する (月額は12倍、年額はそのまま)
 * 月額換算を12倍すると端数切り捨ての誤差が蓄積するため、元の金額から直接算出する。
 */
export function calculateYearlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(countsTowardTotal)
    .reduce((total, sub) => total + (sub.cycle === 'yearly' ? sub.price : sub.price * 12), 0);
}

/**
 * 解約によって浮いた月額を合計する (解約済みの月額換算の合計)
 */
export function calculateMonthlySavings(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((sub) => sub.status === 'cancelled')
    .reduce((total, sub) => total + getMonthlyEquivalentPrice(sub.price, sub.cycle), 0);
}

/**
 * カテゴリ別に月額換算で集計し、金額の大きい順に並べて返す。
 * 登録が0件のカテゴリは結果に含めない。
 */
export function summarizeByCategory(subscriptions: Subscription[]): CategorySummary[] {
  const totals = new Map<Category, { count: number; monthlyTotal: number }>();

  for (const sub of subscriptions.filter(countsTowardTotal)) {
    const current = totals.get(sub.category) ?? { count: 0, monthlyTotal: 0 };
    totals.set(sub.category, {
      count: current.count + 1,
      monthlyTotal: current.monthlyTotal + getMonthlyEquivalentPrice(sub.price, sub.cycle),
    });
  }

  const overallTotal = calculateMonthlyTotal(subscriptions);

  return Array.from(totals.entries())
    .map(([category, { count, monthlyTotal }]) => ({
      category,
      count,
      monthlyTotal,
      ratio: overallTotal > 0 ? monthlyTotal / overallTotal : 0,
    }))
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

/**
 * 次回更新日までの残日数を人間が読みやすい文言へ変換する
 */
export function formatDaysUntil(days: number): string {
  if (days <= 0) return '本日';
  if (days === 1) return '明日';
  return `あと${days}日`;
}
