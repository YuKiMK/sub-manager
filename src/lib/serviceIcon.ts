/**
 * サービスアイコンの表示ロジック
 * 画像が未設定でも一目で見分けられるよう、サービス名から頭文字マークを生成する。
 */

/** アイコンが無い場合のフォールバック色 */
export const FALLBACK_ICON_COLOR = '#888888';

/** 半角英数のみで構成されているか */
const ASCII_WORD = /^[\x20-\x7E]+$/;

/**
 * サービス名から1〜2文字の頭文字マークを作る。
 *
 * - 英数字の複数語: 各語の先頭を2文字 (例: "YouTube Premium" → "YP")
 * - 英数字の1語: 語中の大文字/数字を拾って2文字 (例: "1Password" → "1P", "NordVPN" → "NV")
 *   拾えるものが無ければ先頭1文字 (例: "Netflix" → "N")
 * - 日本語を含む名前: 先頭1文字 (例: "楽天マガジン" → "楽")
 *
 * @param name サービス名
 * @returns 頭文字 (名前が空の場合は "?")
 */
export function getServiceInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  if (ASCII_WORD.test(trimmed)) {
    // 記号を区切りとして単語に分割する (例: "お名前.com" は日本語判定なのでここには来ない)
    const words = trimmed.split(/[\s._\-+/()]+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    // 1語の場合は語中の大文字・数字を2文字目として使い、判別しやすくする
    const word = words[0] ?? trimmed;
    const innerCapital = word.slice(1).match(/[A-Z0-9]/);
    return (word[0] + (innerCapital ? innerCapital[0] : '')).toUpperCase();
  }

  // 日本語などマルチバイトを含む名前はサロゲートペアを壊さないよう1文字取り出す
  return Array.from(trimmed)[0].toUpperCase();
}

/**
 * 背景色に対して読みやすい文字色 (黒 or 白) を返す。
 * WCAGの相対輝度に基づいて判定するため、明るいブランド色でも文字が潰れない。
 *
 * @param backgroundColor #rrggbb 形式の背景色
 */
export function getReadableTextColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';

  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(parseInt(hex.slice(0, 2), 16));
  const g = toLinear(parseInt(hex.slice(2, 4), 16));
  const b = toLinear(parseInt(hex.slice(4, 6), 16));

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // 白文字とのコントラスト比が 4.5:1 を下回る明るい背景では黒文字にする
  return (1.05) / (luminance + 0.05) >= 4.5 ? '#ffffff' : '#111111';
}
