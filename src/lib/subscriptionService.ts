/**
 * サブスクリプションの取得・追加・更新・削除の窓口
 *
 * UI(コンポーネント)からのデータ操作は全てこのモジュールを経由する。
 * 検証 → リポジトリ の順に呼び、UIには成功可否と文言だけを返す。
 * 直接この関数群を呼ばず、SubscriptionProvider 経由で使うと一覧の再取得まで自動で行われる。
 */
import {
  deleteSubscriptionById,
  findAllSubscriptions,
  insertSubscription,
  updateSubscriptionById,
  updateSubscriptionStatusById,
  upsertSubscriptions,
} from './subscriptionRepository';
import { validateSubscriptionInput } from './subscriptionValidation';
import { getToday, toSubscriptionView, toDateKey } from './billing';
import { generateId } from './id';
import { LocalStorageUnavailableError } from './localDb';
import {
  ActionResult,
  ImportActionResult,
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
  SubscriptionView,
} from '@/types';

/** 一度に取り込める最大件数 (壊れたファイルによる暴走を防ぐ) */
const MAX_IMPORT_RECORDS = 500;

/**
 * 保存に失敗した際の文言を決める。
 * 端末側でストレージが使えない場合はその旨を伝え、それ以外は再試行を促す。
 */
function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof LocalStorageUnavailableError) return error.message;
  return fallback;
}

/**
 * 登録済みのサブスクリプションを全件取得する。
 * 保存された基準日は今日以降へ繰り越したうえで返すため、
 * 更新日を過ぎても表示が古いままになることはない。
 */
export async function getSubscriptions(): Promise<SubscriptionView[]> {
  const subscriptions = await findAllSubscriptions();
  const today = getToday();

  return subscriptions
    .map((sub) => toSubscriptionView(sub, today))
    .sort((a, b) => a.daysUntilBilling - b.daysUntilBilling || a.name.localeCompare(b.name, 'ja'));
}

/**
 * サブスクリプションを新規登録する。
 * 金額は日本円(JPY)の整数として保存される。
 *
 * @param input フォームの入力値 (idはこの中で採番)
 */
export async function addSubscription(input: SubscriptionInput): Promise<ActionResult> {
  const validated = validateSubscriptionInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  try {
    await insertSubscription(validated.value);
    return { success: true };
  } catch (error) {
    console.error('サブスクリプションの登録に失敗しました:', error);
    return {
      success: false,
      error: toErrorMessage(error, '登録に失敗しました。時間をおいて再度お試しください。'),
    };
  }
}

/**
 * 既存のサブスクリプションを更新する。
 * 値上げやプラン変更に対応するため、金額を含む全項目を上書きできる。
 *
 * @param id 更新対象のid
 * @param input フォームの入力値
 */
export async function updateSubscription(
  id: string,
  input: SubscriptionInput
): Promise<ActionResult> {
  if (typeof id !== 'string' || !id.trim()) {
    return { success: false, error: '更新対象が指定されていません。' };
  }

  const validated = validateSubscriptionInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  try {
    const updated = await updateSubscriptionById(id, validated.value);
    if (!updated) {
      return { success: false, error: '対象のサブスクリプションが見つかりませんでした。' };
    }

    return { success: true };
  } catch (error) {
    console.error('サブスクリプションの更新に失敗しました:', error);
    return {
      success: false,
      error: toErrorMessage(error, '更新に失敗しました。時間をおいて再度お試しください。'),
    };
  }
}

/**
 * 契約状態だけを切り替える。
 * 「解約する」「利用を再開する」「トライアルを終了して利用中にする」といった
 * 一手で終わる操作のために、金額や日付を触らずに状態のみを更新する。
 *
 * @param id 対象のid
 * @param status 新しい状態
 */
export async function changeSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
): Promise<ActionResult> {
  if (typeof id !== 'string' || !id.trim()) {
    return { success: false, error: '対象が指定されていません。' };
  }

  const allowed: SubscriptionStatus[] = ['active', 'trial', 'scheduled', 'cancelled'];
  if (!allowed.includes(status)) {
    return { success: false, error: '契約状態の指定が正しくありません。' };
  }

  try {
    // 解約時のみ解約日を記録し、再開時は消して履歴から外す
    const cancelledAt = status === 'cancelled' ? toDateKey(getToday()) : null;

    const updated = await updateSubscriptionStatusById(id, status, cancelledAt);
    if (!updated) {
      return { success: false, error: '対象のサブスクリプションが見つかりませんでした。' };
    }

    return { success: true };
  } catch (error) {
    console.error('契約状態の更新に失敗しました:', error);
    return {
      success: false,
      error: toErrorMessage(error, '状態の更新に失敗しました。時間をおいて再度お試しください。'),
    };
  }
}

/**
 * 書き出したJSONバックアップを読み込む。
 *
 * 同じidが既にあれば上書きするため、同じファイルを重ねて取り込んでも重複しない。
 * 既存データの削除は行わないため、誤って取り込んでも登録済みの内容は失われない。
 * 検証に通らなかった行は取り込まずに件数だけ返す。
 *
 * 機種変更やブラウザの変更でデータを引き継ぐ唯一の手段となるため、
 * 一部が不正でも取り込めるものは取り込む方針とする。
 *
 * @param records バックアップファイル内のサブスクリプション配列
 */
export async function importSubscriptions(records: unknown): Promise<ImportActionResult> {
  if (!Array.isArray(records)) {
    return { success: false, error: 'バックアップファイルの形式が正しくありません。' };
  }
  if (records.length === 0) {
    return { success: false, error: 'ファイルにサブスクリプションが含まれていません。' };
  }
  if (records.length > MAX_IMPORT_RECORDS) {
    return {
      success: false,
      error: `一度に取り込めるのは${MAX_IMPORT_RECORDS}件までです。`,
    };
  }

  const accepted: Subscription[] = [];
  let skipped = 0;

  for (const record of records) {
    const validated = validateSubscriptionInput(record as SubscriptionInput);
    if (!validated.ok) {
      skipped++;
      continue;
    }

    // idが欠けている/不正なバックアップでも取り込めるよう、その場で採番する
    const rawId = (record as { id?: unknown }).id;
    const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : generateId();

    accepted.push({ id, ...validated.value });
  }

  if (accepted.length === 0) {
    return { success: false, error: '取り込める形式のデータが見つかりませんでした。' };
  }

  try {
    await upsertSubscriptions(accepted);
    return { success: true, imported: accepted.length, skipped };
  } catch (error) {
    console.error('バックアップの読み込みに失敗しました:', error);
    return {
      success: false,
      error: toErrorMessage(error, '読み込みに失敗しました。ファイルを確認してください。'),
    };
  }
}

/**
 * サブスクリプションを1件削除する。
 *
 * @param id 削除対象のid
 */
export async function deleteSubscription(id: string): Promise<ActionResult> {
  if (typeof id !== 'string' || !id.trim()) {
    return { success: false, error: '削除対象が指定されていません。' };
  }

  try {
    const deleted = await deleteSubscriptionById(id);
    if (!deleted) {
      return { success: false, error: '対象のサブスクリプションが見つかりませんでした。' };
    }

    return { success: true };
  } catch (error) {
    console.error('サブスクリプションの削除に失敗しました:', error);
    return {
      success: false,
      error: toErrorMessage(error, '削除に失敗しました。時間をおいて再度お試しください。'),
    };
  }
}
