/**
 * 課金サイクルに関する計算ロジック
 * 金額は全て日本円(JPY)の整数として扱い、外貨換算は一切行わない。
 * 日付は時差による1日のズレを避けるため、全てUTCの0時に正規化して計算する。
 */
import { CYCLE_META } from '@/constants/cycles';
import { PAYMENT_METHOD_UNSET } from '@/constants/paymentMethods';
import {
  BillingCycle,
  CategorySummary,
  Category,
  MonthlySpending,
  PaymentMethodSummary,
  Subscription,
  SubscriptionView,
} from '@/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 近似で求めた繰り越し回数を補正する際の上限 (無限ループ防止) */
const MAX_ADJUST_STEPS = 64;

/** 1ヶ月の平均日数。繰り越し回数の当たりを付けるためだけに使う */
const AVERAGE_DAYS_PER_MONTH = 30.44;

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
 * 基準日から指定回数ぶん周期を進める (負の値で戻す)。
 *
 * 週次のみ日数で、それ以外は月数で進める。月数で進めるのは
 * 「1/31 → 2/28 → 3/31」のように月末日の請求日を維持するため。
 *
 * @param anchor 基準日
 * @param cycle 支払周期
 * @param steps 進める周期の回数
 */
function shiftCycles(anchor: Date, cycle: BillingCycle, steps: number): Date {
  const meta = CYCLE_META[cycle];

  if (meta.days > 0) {
    return new Date(anchor.getTime() + meta.days * steps * MS_PER_DAY);
  }
  return shiftMonthsFromAnchor(anchor, meta.months * steps);
}

/**
 * 基準日から何回ぶん周期を進めれば target 以降になるかを求める。
 *
 * 周期が短い(週次など)と繰り返しが多くなるため、まず日数から当たりを付け、
 * そこから前後にずらして条件を満たす最小の回数へ補正する。
 *
 * @returns target 以降となる最小の繰り越し回数 (0以上)
 */
function stepsUntil(anchor: Date, cycle: BillingCycle, target: Date): number {
  if (anchor.getTime() >= target.getTime()) return 0;

  const meta = CYCLE_META[cycle];
  const daysPerCycle = meta.days > 0 ? meta.days : meta.months * AVERAGE_DAYS_PER_MONTH;
  const elapsed = diffInDays(anchor, target);

  // 近似は誤差で行き過ぎる場合があるため、少なめに見積もってから前へ詰める
  let steps = Math.max(0, Math.floor(elapsed / daysPerCycle) - 1);

  for (let i = 0; i < MAX_ADJUST_STEPS; i++) {
    if (shiftCycles(anchor, cycle, steps).getTime() >= target.getTime()) break;
    steps++;
  }
  // 行き過ぎていた場合に備えて戻す (最小の回数に揃える)
  for (let i = 0; i < MAX_ADJUST_STEPS; i++) {
    if (steps === 0) break;
    if (shiftCycles(anchor, cycle, steps - 1).getTime() < target.getTime()) break;
    steps--;
  }

  return steps;
}

/**
 * 登録された基準日から、今日以降に到来する実際の次回更新日を算出する。
 * 登録日が過去になっても表示が古くならないよう、周期分だけ繰り越す。
 *
 * @param anchorDate 保存されている基準日 (YYYY-MM-DD)
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

  return toDateKey(shiftCycles(anchor, cycle, stepsUntil(anchor, cycle, today)));
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
  return toDateKey(shiftCycles(parseDateKey(upcomingDate), cycle, -1));
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
 * 週次のように1ヶ月に複数回発生する周期があるため、配列で返す。
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

  const cancelledAt = subscription.cancelledAt ? parseDateKey(subscription.cancelledAt) : null;
  const firstStep = stepsUntil(anchor, subscription.cycle, monthStart);
  const dates: string[] = [];

  // 週次でも1ヶ月に5回程度。上限を設けて暴走を防ぐ
  for (let i = 0; i < MAX_ADJUST_STEPS; i++) {
    const occurrence = shiftCycles(anchor, subscription.cycle, firstStep + i);
    if (occurrence.getTime() > monthEnd.getTime()) break;
    // 解約後は請求が発生しない
    if (cancelledAt && occurrence.getTime() > cancelledAt.getTime()) break;
    if (occurrence.getTime() >= monthStart.getTime()) dates.push(toDateKey(occurrence));
  }

  return dates;
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
 * どの周期でも月額へ換算する (円未満は切り捨て)。
 * 「1年あたりの請求回数 ÷ 12」で求めるため、周期を増やしても cycles.ts の定義だけで済む。
 */
export function getMonthlyEquivalentPrice(price: number, cycle: BillingCycle): number {
  return Math.floor((price * CYCLE_META[cycle].perYear) / 12);
}

/**
 * どの周期でも年額へ換算する (円未満は四捨五入)。
 * 月額換算を12倍すると端数の切り捨て誤差が積み上がるため、元の金額から直接求める。
 */
export function getYearlyEquivalentPrice(price: number, cycle: BillingCycle): number {
  return Math.round(price * CYCLE_META[cycle].perYear);
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
    .reduce((total, sub) => total + getYearlyEquivalentPrice(sub.price, sub.cycle), 0);
}

/**
 * 1日あたりの支出を返す (円未満は切り捨て)。
 * 「月◯円」より実感が湧きやすいため、合計の補足として表示する。
 */
export function calculateDailyAverage(subscriptions: Subscription[]): number {
  return Math.floor(calculateYearlyTotal(subscriptions) / 365);
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
 * 支払い方法別に月額換算で集計し、金額の大きい順に並べて返す。
 *
 * カードを再発行・解約するときに「何を切り替える必要があるか」を把握するための集計。
 * 未入力のものは「未設定」としてまとめ、記入漏れが分かるようにする。
 */
export function summarizeByPaymentMethod(subscriptions: Subscription[]): PaymentMethodSummary[] {
  const totals = new Map<string, { count: number; monthlyTotal: number }>();

  for (const sub of subscriptions.filter(countsTowardTotal)) {
    const method = sub.paymentMethod?.trim() || PAYMENT_METHOD_UNSET;
    const current = totals.get(method) ?? { count: 0, monthlyTotal: 0 };
    totals.set(method, {
      count: current.count + 1,
      monthlyTotal: current.monthlyTotal + getMonthlyEquivalentPrice(sub.price, sub.cycle),
    });
  }

  const overallTotal = calculateMonthlyTotal(subscriptions);

  return Array.from(totals.entries())
    .map(([method, { count, monthlyTotal }]) => ({
      method,
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
