/**
 * サブスクリプションのid採番
 *
 * サーバーを持たないため、idはブラウザ側で採番する。
 * crypto.randomUUID() はセキュアコンテキスト (HTTPS または localhost) でしか使えず、
 * LANの http://192.168.x.x で開いた場合に存在しないため、代替の生成経路を用意している。
 */

/** 16バイトの乱数を得る (Web Crypto が無ければ Math.random で代替) */
function getRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const webCrypto = typeof crypto !== 'undefined' ? crypto : undefined;

  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
    return bytes;
  }

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * UUID v4 形式のidを生成する。
 * 既存データ (SQLite時代に randomUUID で採番したもの) と同じ形式のため、
 * バックアップの読み込みでidが混在しても問題ない。
 */
export function generateId(): string {
  const webCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();

  const bytes = getRandomBytes();
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // バージョン4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // バリアント

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
