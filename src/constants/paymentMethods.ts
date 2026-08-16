/**
 * 支払い方法の入力候補
 *
 * 自由入力を基本とし（「楽天カード(1234)」のように書けるようにするため）、
 * よく使うものだけを1タップで入れられるようにする。
 * ここに無い決済手段でも自由に入力できる。
 */
export const PAYMENT_METHOD_SUGGESTIONS: string[] = [
  'クレジットカード',
  'デビットカード',
  'PayPay',
  'Apple ID',
  'Google Play',
  'Amazon',
  'キャリア決済',
  '口座振替',
  'PayPal',
];

/** 支払い方法の最大文字数 */
export const PAYMENT_METHOD_MAX_LENGTH = 40;

/** 支払い方法が未入力のものをまとめる際の表示名 */
export const PAYMENT_METHOD_UNSET = '未設定';
