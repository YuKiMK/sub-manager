/**
 * サブスクリプションの更新周期
 * 表示名と換算係数は /src/constants/cycles.ts に集約している。
 */
export type BillingCycle =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly'
  | 'biennial';

/**
 * サブスクリプションのカテゴリ
 */
export type Category = 'エンタメ' | 'AIツール' | '仕事' | 'インフラ' | 'その他';

/**
 * 契約の状態
 * - active:    利用中（合計金額に算入される）
 * - trial:     無料トライアル中（まだ課金されていないため合計から除外）
 * - scheduled: 開始予定（未来の契約。まだ課金されていないため合計から除外）
 * - cancelled: 解約済み（履歴として残し、節約額の集計に使う）
 */
export type SubscriptionStatus = 'active' | 'trial' | 'scheduled' | 'cancelled';

/**
 * サブスクリプションの基本データ定義
 */
export interface Subscription {
  id: string;
  name: string;
  price: number; // 全て日本円(JPY)で統一
  cycle: BillingCycle;
  /**
   * 課金日の基準となる日付 (YYYY-MM-DD)
   * status によって意味が変わる:
   *   active    … 次回請求日（過ぎた場合は周期分繰り越して表示）
   *   trial     … 無料期間の終了日 ＝ 初回課金日
   *   scheduled … 利用開始日 ＝ 初回請求日
   */
  nextBillingDate: string;
  category: Category;
  status: SubscriptionStatus;
  /** 解約日 (YYYY-MM-DD)。status === 'cancelled' のときのみ持つ */
  cancelledAt?: string;
  /**
   * 支払い方法 (例: 楽天カード / PayPay / Apple ID)。
   * カードを再発行したときに何を切り替える必要があるかを追えるようにするための任意項目。
   */
  paymentMethod?: string;
  memo?: string;
  color?: string; // テーマカラー (Hex)
  iconUrl?: string;
}

/**
 * プリセット用のデータ定義（idや次回更新日を持たないテンプレート）
 */
export type PresetSubscription = Omit<
  Subscription,
  'id' | 'nextBillingDate' | 'memo' | 'status' | 'cancelledAt'
> & {
  /** 追加モーダル上部の「人気のサービス」枠に表示するか */
  popular?: boolean;
};

/**
 * 登録フォームからサーバーへ渡す入力値
 * idは保存時にデータ層で採番するため含まない。
 */
export type SubscriptionInput = Omit<Subscription, 'id'>;

/**
 * 追加・更新・削除の実行結果を表す共通の戻り値
 * 例外を握りつぶさず、UI側で日本語のエラーメッセージを表示できるようにする。
 */
export type ActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * バックアップ読み込みの実行結果
 * 何件取り込み、何件を不正として飛ばしたかを画面に返す。
 */
export type ImportActionResult =
  | { success: true; imported: number; skipped: number }
  | { success: false; error: string };

/**
 * 画面表示用に算出値を付与したサブスクリプション
 * DBに保存された nextBillingDate は「基準日」として扱い、
 * 実際に次に支払う日は今日を基準に周期分だけ繰り越して算出する。
 */
export interface SubscriptionView extends Subscription {
  /** 今日以降に繰り越した実際の次回更新日 (YYYY-MM-DD) */
  upcomingBillingDate: string;
  /** 次回更新日までの日数 (0 = 本日) */
  daysUntilBilling: number;
  /** 月額換算した金額 (円・整数) */
  monthlyEquivalentPrice: number;
  /** 実質月額合計に算入されるか (利用中のみ true) */
  countsTowardTotal: boolean;
  /** 現在の周期の経過割合 (0〜1)。次回請求日までのプログレスバーに使う */
  cycleProgress: number;
  /**
   * トライアル・開始予定なのに予定日を過ぎている状態。
   * 自動で状態を書き換えず、ユーザーに更新を促すために使う。
   */
  needsStatusUpdate: boolean;
}

/**
 * 一覧の並び替え方法
 * 表示名は /src/constants/sort.ts に集約している。
 */
export type SortKey = 'billing' | 'priceDesc' | 'priceAsc' | 'name';

/**
 * 一覧の絞り込み条件
 */
export interface ListFilter {
  /** サービス名・メモ・支払い方法に対する検索語 */
  keyword: string;
  /** 'all' は絞り込みなし */
  category: Category | 'all';
  sort: SortKey;
}

/**
 * ホーム上部に出すお知らせ
 */
export interface HomeAlert {
  /** まもなく課金が始まるトライアル */
  endingTrials: SubscriptionView[];
  /** 状態の更新が必要なもの */
  needsUpdate: SubscriptionView[];
  /** 数日以内に請求があるもの */
  imminent: SubscriptionView[];
}

/**
 * 月ごとの請求予定額
 * 支払い履歴は保存していないため、対象は今月以降のみ。
 */
export interface MonthlySpending {
  year: number;
  /** 0〜11 */
  monthIndex: number;
  /** 軸に出す短いラベル (月の数字) */
  label: string;
  /** その月に請求される合計金額 (円) */
  total: number;
  /** その月の請求件数 */
  count: number;
  isCurrentMonth: boolean;
}

/**
 * カテゴリ別の集計結果
 */
export interface CategorySummary {
  category: Category;
  /** 登録件数 */
  count: number;
  /** 月額換算の合計金額 (円) */
  monthlyTotal: number;
  /** 全体に占める割合 (0〜1) */
  ratio: number;
}

/**
 * 支払い方法別の集計結果
 * 「このカードで月いくら払っているか」を把握するために使う。
 */
export interface PaymentMethodSummary {
  /** 未入力のものは「未設定」としてまとめる */
  method: string;
  count: number;
  monthlyTotal: number;
  ratio: number;
}
