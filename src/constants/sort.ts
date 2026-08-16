import { SortKey } from '../types';

/**
 * 一覧の並び替えの選択肢
 *
 * 既定は「次回請求日が近い順」。次に払うものが上に来るのが日常の使い方だが、
 * 見直しをするときは「高い順」が要るため、切り替えられるようにしている。
 */
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'billing', label: '請求日が近い順' },
  { key: 'priceDesc', label: '高い順（月額換算）' },
  { key: 'priceAsc', label: '安い順（月額換算）' },
  { key: 'name', label: '名前順' },
];
