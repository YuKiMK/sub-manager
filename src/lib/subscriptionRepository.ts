/**
 * サブスクリプションのデータアクセス層 (端末内 IndexedDB)
 *
 * 保存形式 ⇔ アプリ内部の型 の変換と、保存・取得・削除のみを担当する。
 * 入力値の検証は subscriptionValidation.ts、UIとの橋渡しは subscriptionService.ts の責務。
 *
 * ブラウザでしか動かないため、必ずクライアント側から呼び出すこと。
 */
import { countOne, readAll, readOne, removeOne, writeMany, writeOne } from './localDb';
import { generateId } from './id';
import {
  BillingCycle,
  Category,
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
} from '@/types';

/**
 * IndexedDBに保存されているレコード。
 * 過去のバージョンで保存された値も読めるよう、追加された項目は省略可能として扱う。
 */
interface SubscriptionRecord {
  id: string;
  name: string;
  price: number;
  cycle: string;
  nextBillingDate: string;
  category: string;
  status?: string | null;
  cancelledAt?: string | null;
  memo?: string | null;
  color?: string | null;
  iconUrl?: string | null;
}

/**
 * 保存レコードをアプリ内部の Subscription 型へ変換する (null → undefined)
 */
function toSubscription(record: SubscriptionRecord): Subscription {
  return {
    id: record.id,
    name: record.name,
    price: record.price,
    cycle: record.cycle as BillingCycle,
    nextBillingDate: record.nextBillingDate,
    category: record.category as Category,
    // 項目追加前に登録されたデータは status を持たないため利用中として扱う
    status: (record.status as SubscriptionStatus) ?? 'active',
    cancelledAt: record.cancelledAt ?? undefined,
    memo: record.memo ?? undefined,
    color: record.color ?? undefined,
    iconUrl: record.iconUrl ?? undefined,
  };
}

/**
 * 保存用のレコードへ変換する。
 * IndexedDBは undefined をそのまま保持できるが、
 * 書き出したJSONを他の端末で読み込む際の差異をなくすため null に寄せる。
 */
function toRecord(subscription: Subscription): SubscriptionRecord {
  return {
    id: subscription.id,
    name: subscription.name,
    price: subscription.price,
    cycle: subscription.cycle,
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    status: subscription.status,
    cancelledAt: subscription.cancelledAt ?? null,
    memo: subscription.memo ?? null,
    color: subscription.color ?? null,
    iconUrl: subscription.iconUrl ?? null,
  };
}

/** 次回更新日が近い順、同日ならサービス名順 (SQLite時代の ORDER BY と同じ並び) */
function byBillingDateThenName(a: Subscription, b: Subscription): number {
  return (
    a.nextBillingDate.localeCompare(b.nextBillingDate) || a.name.localeCompare(b.name, 'ja')
  );
}

/**
 * 登録済みの全サブスクリプションを取得する。
 * 次回更新日が近い順に並べ、同日の場合はサービス名順とする。
 */
export async function findAllSubscriptions(): Promise<Subscription[]> {
  const records = await readAll<SubscriptionRecord>();
  return records.map(toSubscription).sort(byBillingDateThenName);
}

/**
 * idを指定して1件取得する。
 *
 * @param id 取得対象のid
 * @returns 見つからない場合は null
 */
export async function findSubscriptionById(id: string): Promise<Subscription | null> {
  const record = await readOne<SubscriptionRecord>(id);
  return record ? toSubscription(record) : null;
}

/**
 * サブスクリプションを1件登録する。
 * idはこの層でUUIDを採番するため、呼び出し側は指定不要。
 *
 * @param input 検証済みの入力値
 * @returns 採番されたidを含む登録後のデータ
 */
export async function insertSubscription(input: SubscriptionInput): Promise<Subscription> {
  const subscription: Subscription = { id: generateId(), ...input };
  await writeOne(toRecord(subscription));
  return subscription;
}

/**
 * サブスクリプションを1件更新する。
 * プラン変更や値上げに対応できるよう、金額を含む全項目を上書き可能とする。
 *
 * @param id 更新対象のid
 * @param input 検証済みの入力値
 * @returns 実際に更新された場合はtrue (対象が存在しなければfalse)
 */
export async function updateSubscriptionById(
  id: string,
  input: SubscriptionInput
): Promise<boolean> {
  // 存在しないidで put すると新規作成になってしまうため、先に有無を確認する
  if ((await countOne(id)) === 0) return false;

  await writeOne(toRecord({ id, ...input }));
  return true;
}

/**
 * 契約状態だけを更新する。
 * 解約・再開など、金額や日付を変えずに状態のみを切り替える操作で使う。
 *
 * @param id 対象のid
 * @param status 新しい状態
 * @param cancelledAt 解約日 (解約以外では null)
 */
export async function updateSubscriptionStatusById(
  id: string,
  status: SubscriptionStatus,
  cancelledAt: string | null
): Promise<boolean> {
  const existing = await readOne<SubscriptionRecord>(id);
  if (!existing) return false;

  await writeOne({ ...existing, status, cancelledAt });
  return true;
}

/**
 * idを指定してサブスクリプションをまとめて保存する (同じidがあれば上書き)。
 * バックアップの読み込みで使用し、同じファイルを2回取り込んでも重複しないようにする。
 *
 * 1件でも失敗すれば全件が巻き戻るため、途中まで取り込まれた状態にはならない。
 *
 * @param subscriptions idを含む完全なデータの配列
 */
export async function upsertSubscriptions(subscriptions: Subscription[]): Promise<void> {
  await writeMany(subscriptions.map(toRecord));
}

/**
 * サブスクリプションを1件削除する。
 *
 * @param id 削除対象のid
 * @returns 実際に削除された場合はtrue (対象が存在しなければfalse)
 */
export async function deleteSubscriptionById(id: string): Promise<boolean> {
  if ((await countOne(id)) === 0) return false;

  await removeOne(id);
  return true;
}
