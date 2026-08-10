"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { CATEGORIES, POPULAR_PRESETS, SUBSCRIPTION_PRESETS } from "@/constants/presets";
import { Category, PresetSubscription } from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import ServiceIcon from "@/components/ui/ServiceIcon";

interface PresetPickerProps {
  /** 選択中のプリセット名 (未選択は null) */
  selectedName: string | null;
  onSelect: (preset: PresetSubscription) => void;
}

/** カテゴリ絞り込みの「すべて」を表す値 */
const ALL = "すべて" as const;

/**
 * プリセットからサービスを選ぶUI。
 *
 * 件数が多いため二段構えにしている:
 *   1. 常時表示 … 人気サービスの横スクロール（従来どおりの見た目）
 *   2. 展開時   … 検索ボックス + カテゴリ絞り込み + 一覧グリッド
 * プリセットを増やしても presets.ts に追記するだけで両方に反映される。
 */
export default function PresetPicker({ selectedName, onSelect }: PresetPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<Category | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return SUBSCRIPTION_PRESETS.filter((preset) => {
      const matchesCategory = category === ALL || preset.category === category;
      const matchesKeyword = !normalized || preset.name.toLowerCase().includes(normalized);
      return matchesCategory && matchesKeyword;
    });
  }, [keyword, category]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-400">
          人気のサービスから選ぶ
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center space-x-1 text-xs font-medium text-primary hover:brightness-110 transition-all active:scale-95"
        >
          <span>{isExpanded ? "閉じる" : `すべて見る (${SUBSCRIPTION_PRESETS.length})`}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 人気サービス (横スクロール) */}
      <div className="flex overflow-x-auto space-x-3 pb-2 -mx-5 px-5 scrollbar-hide">
        {POPULAR_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onSelect(preset)}
            className={cn(
              "flex-shrink-0 flex items-center space-x-2 pl-2 pr-4 py-2 rounded-full border transition-all active:scale-95",
              selectedName === preset.name
                ? "border-primary bg-primary/10"
                : "border-gray-700 bg-[#2a2a2a] hover:bg-gray-700"
            )}
          >
            <ServiceIcon name={preset.name} color={preset.color} size="sm" />
            <span className="text-sm font-medium text-white whitespace-nowrap">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* 全プリセットの検索・絞り込み */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="サービス名で検索"
              className="w-full bg-[#151515] border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors"
                aria-label="検索条件をクリア"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* カテゴリ絞り込み */}
          <div className="flex overflow-x-auto space-x-2 pb-1 -mx-5 px-5 scrollbar-hide">
            {[ALL, ...CATEGORIES].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95",
                  category === item
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-700 bg-[#2a2a2a] text-gray-400 hover:text-white"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {/* 一覧 */}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              該当するサービスがありません
              <span className="block text-xs text-gray-600 mt-1">
                下のフォームに直接入力して登録できます
              </span>
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-hide">
              {filtered.map((preset) => (
                <li key={preset.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(preset)}
                    className={cn(
                      "w-full h-full flex items-center space-x-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-95",
                      selectedName === preset.name
                        ? "border-primary bg-primary/10"
                        : "border-gray-700 bg-[#2a2a2a] hover:bg-gray-700"
                    )}
                  >
                    <ServiceIcon name={preset.name} color={preset.color} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-white truncate">
                        {preset.name}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {formatJPY(preset.price)}/{preset.cycle === "monthly" ? "月" : "年"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
