/**
 * サブスクリプション入力値のバリデーション
 * フォームの入力に加え、読み込んだバックアップファイルの内容も通るため、
 * 保存する前にこのモジュールで必ず検証・正規化を行う。
 */
import { CATEGORIES } from '@/constants/presets';
import { BILLING_CYCLES } from '@/constants/cycles';
import { PAYMENT_METHOD_MAX_LENGTH } from '@/constants/paymentMethods';
import { SubscriptionInput, SubscriptionStatus } from '@/types';

/** 許可する契約状態 */
const STATUSES: readonly SubscriptionStatus[] = ['active', 'trial', 'scheduled', 'cancelled'];

/** YYYY-MM-DD 形式かどうかの判定 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** テーマカラー (#rrggbb) の判定 */
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const NAME_MAX_LENGTH = 60;
const MEMO_MAX_LENGTH = 200;

/**
 * アイコンとして許可する形式。
 * 端末で縮小したdata URI、もしくは /public 配下のローカルパスのみを受け付け、
 * 外部URLや javascript: 等のスキームは弾く。
 */
const ICON_DATA_URI_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const ICON_LOCAL_PATH_PATTERN = /^\/[\w\-./]+\.(png|jpe?g|webp|svg|gif)$/i;

/** アイコンdata URIの上限 (文字数)。96px正方形なら十分収まる */
const ICON_MAX_LENGTH = 200_000;

/** 日本円の上限 (入力ミスによる極端な値を弾くための現実的な上限) */
const PRICE_MAX = 10_000_000;

/**
 * バリデーション結果
 * 成功時は正規化済みの値(trim済みの文字列など)を返す。
 */
export type ValidationResult =
  | { ok: true; value: SubscriptionInput }
  | { ok: false; error: string };

/**
 * 実在する日付かどうかを判定する (例: 2026-02-31 は不正)
 */
function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * フォーム入力値を検証し、DBへ保存可能な形へ正規化する。
 * 金額は日本円(JPY)の0以上の整数のみを許可する。
 *
 * @param input クライアントから受け取った入力値
 * @returns 検証に成功した場合は正規化済みの値、失敗した場合は日本語のエラーメッセージ
 */
export function validateSubscriptionInput(input: SubscriptionInput): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: '入力内容が正しく送信されませんでした。' };
  }

  // --- サービス名 ---
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    return { ok: false, error: 'サービス名を入力してください。' };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `サービス名は${NAME_MAX_LENGTH}文字以内で入力してください。` };
  }

  // --- 料金 (JPY) ---
  const price = input.price;
  if (typeof price !== 'number' || !Number.isInteger(price)) {
    return { ok: false, error: '料金は円単位の整数で入力してください。' };
  }
  if (price < 0 || price > PRICE_MAX) {
    return { ok: false, error: `料金は0〜${PRICE_MAX.toLocaleString('ja-JP')}円の範囲で入力してください。` };
  }

  // --- 支払周期 ---
  if (!BILLING_CYCLES.includes(input.cycle)) {
    return { ok: false, error: '支払周期の指定が正しくありません。' };
  }

  // --- 次回更新日 ---
  if (typeof input.nextBillingDate !== 'string' || !isRealDate(input.nextBillingDate)) {
    return { ok: false, error: '次回更新日を正しい日付で入力してください。' };
  }

  // --- カテゴリ ---
  if (!CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'カテゴリの指定が正しくありません。' };
  }

  // --- 契約状態 (列追加前のバックアップを取り込めるよう、未指定は利用中とみなす) ---
  const status: SubscriptionStatus = input.status ?? 'active';
  if (!STATUSES.includes(status)) {
    return { ok: false, error: '契約状態の指定が正しくありません。' };
  }

  // --- 解約日 (解約済みのときのみ保持する) ---
  const rawCancelledAt = typeof input.cancelledAt === 'string' ? input.cancelledAt.trim() : '';
  if (status === 'cancelled' && rawCancelledAt && !isRealDate(rawCancelledAt)) {
    return { ok: false, error: '解約日を正しい日付で入力してください。' };
  }
  const cancelledAt = status === 'cancelled' ? rawCancelledAt || undefined : undefined;

  // --- 支払い方法 (任意) ---
  const paymentMethod =
    typeof input.paymentMethod === 'string' ? input.paymentMethod.trim() : '';
  if (paymentMethod.length > PAYMENT_METHOD_MAX_LENGTH) {
    return {
      ok: false,
      error: `支払い方法は${PAYMENT_METHOD_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  // --- メモ (任意) ---
  const memo = typeof input.memo === 'string' ? input.memo.trim() : '';
  if (memo.length > MEMO_MAX_LENGTH) {
    return { ok: false, error: `メモは${MEMO_MAX_LENGTH}文字以内で入力してください。` };
  }

  // --- テーマカラー (任意) ---
  const color = typeof input.color === 'string' ? input.color.trim() : '';
  if (color && !HEX_COLOR_PATTERN.test(color)) {
    return { ok: false, error: 'テーマカラーの形式が正しくありません。' };
  }

  // --- アイコン画像 (任意) ---
  const iconUrl = typeof input.iconUrl === 'string' ? input.iconUrl.trim() : '';
  if (iconUrl) {
    if (iconUrl.length > ICON_MAX_LENGTH) {
      return { ok: false, error: 'アイコン画像のデータが大きすぎます。別の画像をお試しください。' };
    }
    if (!ICON_DATA_URI_PATTERN.test(iconUrl) && !ICON_LOCAL_PATH_PATTERN.test(iconUrl)) {
      return { ok: false, error: 'アイコン画像の形式が正しくありません。' };
    }
  }

  return {
    ok: true,
    value: {
      name,
      price,
      cycle: input.cycle,
      nextBillingDate: input.nextBillingDate,
      category: input.category,
      status,
      cancelledAt,
      paymentMethod: paymentMethod || undefined,
      memo: memo || undefined,
      color: color || undefined,
      iconUrl: iconUrl || undefined,
    },
  };
}
