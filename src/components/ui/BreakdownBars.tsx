import { formatJPY } from "@/lib/utils";

export interface BreakdownItem {
  /** Reactのkey。表示名と兼ねられる場合は同じ値でよい */
  key: string;
  label: string;
  /** 件数 (ラベル横に小さく出す) */
  count: number;
  /** 月額換算の金額 (円) */
  amount: number;
  /** 全体に占める割合 (0〜1) */
  ratio: number;
}

interface BreakdownBarsProps {
  items: BreakdownItem[];
}

/**
 * 内訳を横棒で比較する表示。カテゴリ別・支払い方法別で共通して使う。
 *
 * 並べる項目はいずれも順序を持たない名義尺度のため、棒はすべて同一色(テーマカラー)とし、
 * 大小は棒の長さのみで表現する。金額・割合は全て文字で併記しているため、
 * 色が読めない環境でも値を取り違えることはない。
 */
export default function BreakdownBars({ items }: BreakdownBarsProps) {
  // 最大値を基準に棒の長さを決める (全体比ではなく相対比較を見せるため)
  const maxAmount = Math.max(...items.map((item) => item.amount), 1);

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline space-x-2 min-w-0">
              <span className="text-sm font-medium text-white truncate">{item.label}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{item.count}件</span>
            </div>
            <div className="flex items-baseline space-x-2 shrink-0 pl-2">
              <span className="text-sm font-bold text-white tabular-nums">
                {formatJPY(item.amount)}
              </span>
              <span className="text-[11px] text-gray-500 tabular-nums w-9 text-right">
                {Math.round(item.ratio * 100)}%
              </span>
            </div>
          </div>

          {/* 棒グラフ本体 (トラックは背景から一段だけ持ち上げた控えめなグレー) */}
          <div className="h-2 w-full bg-gray-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary rounded-r"
              style={{ width: `${Math.max((item.amount / maxAmount) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
