import { cn } from "@/lib/utils";
import {
  FALLBACK_ICON_COLOR,
  getReadableTextColor,
  getServiceInitials,
} from "@/lib/serviceIcon";

/** 表示サイズのプリセット */
const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-12 h-12 text-base",
  lg: "w-14 h-14 text-lg",
} as const;

interface ServiceIconProps {
  name: string;
  /** サービスのイメージカラー (#rrggbb) */
  color?: string;
  /** ユーザーが設定した画像 (data URI もしくは /public 配下のパス) */
  iconUrl?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * サービスを一目で見分けるためのアイコン。
 *
 * 画像が設定されていればそれを表示し、無い場合はイメージカラーの円に
 * サービス名の頭文字を載せる。文字色は背景の輝度から自動で決めるため、
 * 明るいブランド色でも読めなくならない。
 */
export default function ServiceIcon({
  name,
  color,
  iconUrl,
  size = "md",
  className,
}: ServiceIconProps) {
  const baseColor = color || FALLBACK_ICON_COLOR;
  const sizeClass = SIZE_CLASSES[size];

  if (iconUrl) {
    return (
      <div
        className={cn(
          "rounded-full shrink-0 overflow-hidden bg-[#2a2a2a] border border-gray-700/60",
          sizeClass,
          className
        )}
      >
        {/* 画像はdata URIやローカルパスを許容するため next/image ではなく img を使う */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold tracking-tight select-none",
        sizeClass,
        className
      )}
      style={{ backgroundColor: baseColor, color: getReadableTextColor(baseColor) }}
      aria-hidden="true"
    >
      {getServiceInitials(name)}
    </div>
  );
}
