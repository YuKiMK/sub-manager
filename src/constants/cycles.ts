import { BillingCycle } from '../types';

/**
 * 支払周期の表示定義と計算用の係数
 *
 * ラベルや換算係数を1箇所にまとめ、画面ごとに表記や計算が揺れないようにする。
 * 周期を増やす場合はここに1行足せば、フォーム・一覧・集計に自動で反映される。
 */
export interface CycleMeta {
  /** フォームの選択肢に出す名前 */
  label: string;
  /** 金額の後ろに付ける単位 (例: ￥1,000 / 月) */
  unit: string;
  /** 「月払い」のように単体で使う表記 */
  shortLabel: string;
  /**
   * 1周期の長さ (月数)。
   * 月末日の丸め込みを正しく行うため、月単位で表せる周期は日数ではなく月数で扱う。
   * 週次のみ月数で表せないため 0 とし、days を使う。
   */
  months: number;
  /** 1周期の長さ (日数)。月数で表せる周期では 0 */
  days: number;
  /**
   * 1年あたりの請求回数。月額換算・年額換算はこの値から算出する。
   * 週次は「1年 = 52週」として扱う (実際は52〜53回だが、慣用的な換算に合わせる)。
   */
  perYear: number;
}

export const CYCLE_META: Record<BillingCycle, CycleMeta> = {
  weekly: { label: '週額', unit: '週', shortLabel: '週払い', months: 0, days: 7, perYear: 52 },
  monthly: { label: '月額', unit: '月', shortLabel: '月払い', months: 1, days: 0, perYear: 12 },
  quarterly: { label: '3ヶ月', unit: '3ヶ月', shortLabel: '3ヶ月払い', months: 3, days: 0, perYear: 4 },
  semiannual: { label: '半年', unit: '半年', shortLabel: '半年払い', months: 6, days: 0, perYear: 2 },
  yearly: { label: '年額', unit: '年', shortLabel: '年払い', months: 12, days: 0, perYear: 1 },
  biennial: { label: '2年', unit: '2年', shortLabel: '2年払い', months: 24, days: 0, perYear: 0.5 },
};

/** フォームの選択肢に出す順序 (短い周期から) */
export const BILLING_CYCLES: BillingCycle[] = [
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'yearly',
  'biennial',
];
