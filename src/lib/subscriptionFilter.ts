/**
 * 一覧の検索・絞り込み・並び替え
 *
 * 登録件数が増えると一覧をただ流すだけでは目的のサービスに辿り着けないため、
 * 画面から独立した純粋な関数として切り出してある。
 */
import { ListFilter, SortKey, SubscriptionView } from '@/types';

export const DEFAULT_LIST_FILTER: ListFilter = {
  keyword: '',
  category: 'all',
  sort: 'billing',
};

/**
 * 検索語がサービスに一致するか。
 * サービス名だけでなくメモ・カテゴリ・支払い方法も対象にして、
 * 「楽天カードで払っているもの」のような探し方ができるようにする。
 */
function matchesKeyword(subscription: SubscriptionView, keyword: string): boolean {
  if (!keyword) return true;

  const haystack = [
    subscription.name,
    subscription.memo,
    subscription.category,
    subscription.paymentMethod,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  // 空白区切りの複数語は、全てを含むものだけに絞る
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** 並び替えの比較関数。同順位はサービス名で安定させる */
function comparatorFor(sort: SortKey): (a: SubscriptionView, b: SubscriptionView) => number {
  const byName = (a: SubscriptionView, b: SubscriptionView) => a.name.localeCompare(b.name, 'ja');

  switch (sort) {
    case 'priceDesc':
      return (a, b) => b.monthlyEquivalentPrice - a.monthlyEquivalentPrice || byName(a, b);
    case 'priceAsc':
      return (a, b) => a.monthlyEquivalentPrice - b.monthlyEquivalentPrice || byName(a, b);
    case 'name':
      return byName;
    case 'billing':
    default:
      return (a, b) => a.daysUntilBilling - b.daysUntilBilling || byName(a, b);
  }
}

/**
 * 絞り込みと並び替えを適用した一覧を返す。
 *
 * @param subscriptions 対象 (呼び出し側で解約済みの分離などを済ませておく)
 * @param filter 検索語・カテゴリ・並び順
 */
export function filterAndSortSubscriptions(
  subscriptions: SubscriptionView[],
  filter: ListFilter
): SubscriptionView[] {
  const keyword = filter.keyword.trim();

  return subscriptions
    .filter((sub) => filter.category === 'all' || sub.category === filter.category)
    .filter((sub) => matchesKeyword(sub, keyword))
    .sort(comparatorFor(filter.sort));
}

/**
 * 絞り込みが掛かっているか (件数が0のときの文言を出し分けるために使う)。
 * 並び順は件数を変えないため判定に含めない。
 */
export function isFilterActive(filter: ListFilter): boolean {
  return filter.keyword.trim() !== '' || filter.category !== 'all';
}
