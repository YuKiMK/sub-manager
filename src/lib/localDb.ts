/**
 * 端末内ストレージ (IndexedDB) への低レベルアクセス
 *
 * サーバーを持たない構成のため、登録データはこの端末のブラウザ内にのみ保存される。
 * 画像(iconUrl)を data URI で持つ都合上、容量が5MB程度で頭打ちになる localStorage ではなく
 * IndexedDB を使用する。
 *
 * SQL発行の代わりとなる層であり、値の検証は subscriptionValidation.ts の責務。
 * ブラウザでしか動かないため、必ずクライアント側(useEffect等)から呼び出すこと。
 */

/** データベース名 (端末内で一意であればよい) */
const DB_NAME = 'submanager';

/** スキーマのバージョン。オブジェクトストアを増やす場合のみ上げる */
const DB_VERSION = 1;

/** サブスクリプションを格納するオブジェクトストア */
export const STORE_NAME = 'subscriptions';

/** 開いた接続を使い回す (毎回openすると遅く、versionchangeの扱いも煩雑になるため) */
let connection: Promise<IDBDatabase> | null = null;

/**
 * IndexedDBが使えない環境で投げるエラー。
 * 呼び出し側はこのメッセージをそのまま画面に出せる文言にしてある。
 */
export class LocalStorageUnavailableError extends Error {
  constructor(reason?: string) {
    super(
      'この端末のブラウザではデータを保存できません。' +
        'プライベートブラウズを解除するか、別のブラウザでお試しください。' +
        (reason ? ` (${reason})` : '')
    );
    this.name = 'LocalStorageUnavailableError';
  }
}

/**
 * IndexedDBを開く。初回はオブジェクトストアを作成する。
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new LocalStorageUnavailableError('IndexedDBが利用できません'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(new LocalStorageUnavailableError((error as Error).message));
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // idは呼び出し側で採番するため autoIncrement は使わない
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // 別タブでスキーマが更新された場合、掴んだままだと以後の操作が失敗するため閉じる
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };

    request.onerror = () => reject(new LocalStorageUnavailableError(request.error?.message));
    request.onblocked = () => reject(new LocalStorageUnavailableError('他のタブが古い状態で開いています'));
  });
}

/**
 * 接続を取得する (失敗した場合は次回の呼び出しで開き直す)
 */
function getConnection(): Promise<IDBDatabase> {
  if (!connection) {
    connection = openDatabase().catch((error) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

/**
 * ひとつのトランザクション内で処理を行う共通ヘルパー。
 *
 * IndexedDBはコールバック方式のため、リクエストの完了とトランザクションの完了を
 * ここでPromiseにまとめる。書き込みは transaction.oncomplete まで待って初めて確定するため、
 * readwrite では完了を待ってから解決する。
 *
 * @param mode readonly / readwrite
 * @param run  ストアに対する操作 (戻り値のリクエスト結果がそのまま返る)
 */
async function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await getConnection();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));

    let result: T;
    request.onsuccess = () => {
      result = request.result as T;
      // 読み取りは即座に確定するため、完了を待たずに返して良い
      if (mode === 'readonly') resolve(result);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

/** 全件を取得する (並び順は呼び出し側で決める) */
export function readAll<T>(): Promise<T[]> {
  return runTransaction<T[]>('readonly', (store) => store.getAll());
}

/** キーを指定して1件取得する (無ければ undefined) */
export function readOne<T>(id: string): Promise<T | undefined> {
  return runTransaction<T | undefined>('readonly', (store) => store.get(id));
}

/** 1件を保存する (同じidがあれば上書き) */
export async function writeOne<T extends { id: string }>(value: T): Promise<void> {
  await runTransaction('readwrite', (store) => store.put(value));
}

/**
 * 複数件をまとめて保存する。
 * 1件でも失敗すればトランザクションごと巻き戻るため、中途半端な取り込みにならない。
 */
export async function writeMany<T extends { id: string }>(values: T[]): Promise<void> {
  if (values.length === 0) return;

  const db = await getConnection();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const value of values) store.put(value);

    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

/** 1件を削除する */
export async function removeOne(id: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id));
}

/** 保存されている件数を返す (存在確認に使う) */
export function countOne(id: string): Promise<number> {
  return runTransaction<number>('readonly', (store) => store.count(id));
}
