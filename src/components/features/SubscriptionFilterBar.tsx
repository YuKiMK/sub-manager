"use client";

import { Search, X } from "lucide-react";
import { CATEGORIES } from "@/constants/presets";
import { SORT_OPTIONS } from "@/constants/sort";
import { Category, ListFilter, SortKey } from "@/types";
import { cn } from "@/lib/utils";

interface SubscriptionFilterBarProps {
  filter: ListFilter;
  onChange: (filter: ListFilter) => void;
  /** 絞り込んだ結果の件数 */
  resultCount: number;
}

/**
 * 一覧の検索・カテゴリ絞り込み・並び替えをまとめた操作バー。
 *
 * 登録が増えると「次に払うもの順」の一本道では目的のサービスに辿り着けない。
 * 特に見直しの場面では「高い順」が要るため、並び替えを常に手の届く位置に置く。
 */
export default function SubscriptionFilterBar({
  filter,
  onChange,
  resultCount,
}: SubscriptionFilterBarProps) {
  const update = (patch: Partial<ListFilter>) => onChange({ ...filter, ...patch });

  /** 'all' と各カテゴリを1つの並びとして扱う */
  const categoryChips: { value: Category | "all"; label: string }[] = [
    { value: "all", label: "すべて" },
    ...CATEGORIES.map((category) => ({ value: category, label: category })),
  ];

  return (
    <div className="space-y-3">
      {/* 検索 */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="search"
          value={filter.keyword}
          onChange={(e) => update({ keyword: e.target.value })}
          placeholder="サービス名・メモ・支払い方法で検索"
          aria-label="登録済みのサービスを検索"
          className="w-full bg-[#151515] border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {filter.keyword && (
          <button
            type="button"
            onClick={() => update({ keyword: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded-full transition-colors"
            aria-label="検索語を消す"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* カテゴリ (横スクロールで折り返さず1行に収める) */}
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {categoryChips.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => update({ category: value })}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95",
              filter.category === value
                ? "border-primary bg-primary/15 text-primary"
                : "border-gray-800 bg-[#151515] text-gray-400 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 並び替えと件数 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <label htmlFor="sort" className="text-xs text-gray-500 shrink-0">
            並び替え
          </label>
          <select
            id="sort"
            value={filter.sort}
            onChange={(e) => update({ sort: e.target.value as SortKey })}
            className="bg-[#151515] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary appearance-none transition-all"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700 shrink-0">
          {resultCount}件
        </span>
      </div>
    </div>
  );
}
