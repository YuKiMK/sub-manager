import { SubscriptionStatus } from '../types';

/**
 * 契約状態の表示定義
 * ラベルや色を1箇所にまとめ、画面ごとに表記が揺れないようにする。
 */
export interface StatusMeta {
  label: string;
  /** バッジの配色 (Tailwindのクラス) */
  badgeClass: string;
  /** 一覧やフォームでの補足説明 */
  description: string;
}

export const STATUS_META: Record<SubscriptionStatus, StatusMeta> = {
  active: {
    label: '利用中',
    badgeClass: 'bg-gray-800 text-gray-300 border-gray-700',
    description: '通常の契約。実質月額合計に算入されます',
  },
  trial: {
    label: '無料期間中',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    description: '無料期間の終了日を設定します。終了日までは合計に算入されません',
  },
  scheduled: {
    label: '開始予定',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    description: '利用開始日を設定します。開始日までは合計に算入されません',
  },
  cancelled: {
    label: '解約済み',
    badgeClass: 'bg-gray-800/60 text-gray-500 border-gray-700/60',
    description: '履歴として残り、節約額として集計されます',
  },
};

/** フォームで選択できる状態 (解約は操作シートから行うためここには含めない) */
export const SELECTABLE_STATUSES: SubscriptionStatus[] = ['active', 'trial', 'scheduled'];

/** 状態ごとの日付項目のラベル */
export const DATE_LABEL: Record<SubscriptionStatus, string> = {
  active: '次回更新日',
  trial: '無料期間の終了日',
  scheduled: '利用開始日',
  cancelled: '最終請求日',
};
