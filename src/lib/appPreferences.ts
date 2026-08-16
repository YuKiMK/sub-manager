/**
 * アプリの控えめな設定値
 *
 * 「最後にバックアップした日」など、登録データそのものではない補助情報を持つ。
 * 消えても登録内容には影響しないため、IndexedDB ではなく localStorage を使う。
 * プライベートブラウズ等で書き込めない場合があるため、全ての操作で失敗を握りつぶす。
 */

import { SortKey } from '@/types';

const KEY_LAST_EXPORTED_AT = 'submanager:lastExportedAt';
const KEY_PERSISTENCE_REQUESTED = 'submanager:persistenceRequested';
const KEY_PREFERRED_SORT = 'submanager:preferredSort';

/** バックアップを促し始めるまでの日数 */
export const BACKUP_REMINDER_DAYS = 45;

function read(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // 保存できなくても動作に支障は無いため何もしない
  }
}

/** 最後にJSONを書き出した日時 (ISO文字列)。未実施なら null */
export function getLastExportedAt(): string | null {
  const value = read(KEY_LAST_EXPORTED_AT);
  if (!value) return null;

  // 壊れた値が入っていた場合は未実施として扱う
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

/** JSONを書き出した時刻を記録する */
export function markExported(now: Date = new Date()): void {
  write(KEY_LAST_EXPORTED_AT, now.toISOString());
}

/**
 * 最後の書き出しからの経過日数。未実施の場合は null。
 */
export function daysSinceLastExport(now: Date = new Date()): number | null {
  const last = getLastExportedAt();
  if (!last) return null;

  const elapsed = now.getTime() - new Date(last).getTime();
  return Math.floor(elapsed / (24 * 60 * 60 * 1000));
}

/**
 * バックアップを促すべきか。
 * 一度も書き出していない場合と、しばらく経っている場合に true を返す。
 */
export function shouldRemindBackup(now: Date = new Date()): boolean {
  const days = daysSinceLastExport(now);
  return days === null || days >= BACKUP_REMINDER_DAYS;
}

/** 許可する並び順の値 (壊れた値や古い値を読み込まないよう照合する) */
const SORT_KEYS: SortKey[] = ['billing', 'priceDesc', 'priceAsc', 'name'];

/**
 * 前回選んだ並び順。未設定・不正な値の場合は null。
 *
 * 検索語やカテゴリは記憶しない。次に開いたとき勝手に絞り込まれていると、
 * 登録が消えたように見えて驚かせるため。
 */
export function getPreferredSort(): SortKey | null {
  const value = read(KEY_PREFERRED_SORT) as SortKey | null;
  return value && SORT_KEYS.includes(value) ? value : null;
}

export function setPreferredSort(sort: SortKey): void {
  write(KEY_PREFERRED_SORT, sort);
}

/** 保存領域の保護を自動で要求済みか (何度も確認ダイアログを出さないための記録) */
export function hasRequestedPersistence(): boolean {
  return read(KEY_PERSISTENCE_REQUESTED) === 'true';
}

export function markPersistenceRequested(): void {
  write(KEY_PERSISTENCE_REQUESTED, 'true');
}
