/**
 * 端末内データの保護状態
 *
 * ブラウザは保存領域が逼迫すると、断りなく IndexedDB を消すことがある。
 * 登録内容はこの端末にしか存在せず消えたら復元できないため、
 * 「永続化」を要求して自動削除の対象から外す。
 *
 * - Chrome / Edge … 利用状況から自動で判断される (確認ダイアログは出ない)
 * - Firefox      … 確認ダイアログが出る
 * - Safari       … persist() 自体が無く、常に false になる
 *
 * いずれの場合も保護に失敗することがあるため、JSONの書き出しが最終的な備えである点は変わらない。
 */

export interface StorageStatus {
  /** navigator.storage が使えるか */
  supported: boolean;
  /** 自動削除の対象から外れているか */
  persisted: boolean;
  /** 使用量 (バイト)。取得できない場合は null */
  usageBytes: number | null;
  /** 割り当て量 (バイト)。取得できない場合は null */
  quotaBytes: number | null;
}

const UNSUPPORTED: StorageStatus = {
  supported: false,
  persisted: false,
  usageBytes: null,
  quotaBytes: null,
};

/** navigator.storage が使える環境かどうか */
function getStorageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.storage ?? null;
}

/**
 * 現在の保存領域の状態を取得する。
 * 取得に失敗しても画面が落ちないよう、未対応時と同じ値を返す。
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const storage = getStorageManager();
  if (!storage) return UNSUPPORTED;

  try {
    const persisted = storage.persisted ? await storage.persisted() : false;

    let usageBytes: number | null = null;
    let quotaBytes: number | null = null;
    if (storage.estimate) {
      const estimate = await storage.estimate();
      usageBytes = estimate.usage ?? null;
      quotaBytes = estimate.quota ?? null;
    }

    return { supported: true, persisted, usageBytes, quotaBytes };
  } catch (error) {
    console.error('保存領域の状態を取得できませんでした:', error);
    return UNSUPPORTED;
  }
}

/**
 * データを自動削除の対象から外すよう要求する。
 *
 * @returns 保護されている状態になったか (もともと保護済みの場合も true)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = getStorageManager();
  if (!storage?.persist) return false;

  try {
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch (error) {
    console.error('保存領域の保護を要求できませんでした:', error);
    return false;
  }
}

/**
 * バイト数を読みやすい単位へ変換する
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
