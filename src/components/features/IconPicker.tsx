"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import ServiceIcon from "@/components/ui/ServiceIcon";

/** 保存する正方形アイコンの一辺 (px) */
const ICON_SIZE = 96;

/** data URI の許容サイズ上限 (文字数)。DBの肥大化を防ぐ */
const MAX_DATA_URL_LENGTH = 200_000;

interface IconPickerProps {
  /** プレビューに使うサービス名 */
  name: string;
  /** プレビューに使うイメージカラー */
  color: string;
  iconUrl?: string;
  onChange: (iconUrl: string | undefined) => void;
}

/**
 * 端末の写真からサービスアイコンを設定するピッカー。
 *
 * 選んだ画像はブラウザ上で正方形96pxに縮小してからdata URIとして保存するため、
 * 外部ストレージを使わずにDB1件で完結する。未設定の場合は頭文字アイコンが使われる。
 */
export default function IconPicker({ name, color, iconUrl, onChange }: IconPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 画像を中央基準の正方形に切り出して縮小し、data URIへ変換する
   */
  const toSquareDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("ファイルを読み込めませんでした"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("画像を解釈できませんでした"));
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = ICON_SIZE;
          canvas.height = ICON_SIZE;

          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("画像を変換できませんでした"));
            return;
          }

          // 短辺に合わせて中央を正方形に切り出す (cover相当)
          const side = Math.min(image.width, image.height);
          const sx = (image.width - side) / 2;
          const sy = (image.height - side) / 2;
          context.drawImage(image, sx, sy, side, side, 0, 0, ICON_SIZE, ICON_SIZE);

          const webp = canvas.toDataURL("image/webp", 0.85);
          // webp非対応環境ではPNGが返るため、その場合はJPEGに切り替える
          resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85));
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを選び直せるよう入力値をリセットしておく
    e.target.value = "";
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const dataUrl = await toSquareDataUrl(file);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        setErrorMessage("画像を保存できるサイズに変換できませんでした。別の画像をお試しください。");
        return;
      }
      onChange(dataUrl);
    } catch (error) {
      console.error("アイコン画像の変換に失敗しました:", error);
      setErrorMessage("この画像は読み込めませんでした。別の画像をお試しください。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1.5">アイコン (任意)</label>

      <div className="flex items-center space-x-3">
        <ServiceIcon name={name || "?"} color={color} iconUrl={iconUrl} size="lg" />

        <div className="flex-1 min-w-0 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            className="w-full bg-[#2a2a2a] text-white font-medium text-sm rounded-xl py-2.5 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <ImagePlus size={16} />
            <span>{isProcessing ? "変換中..." : iconUrl ? "画像を変更" : "画像を選ぶ"}</span>
          </button>

          {iconUrl && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                onChange(undefined);
              }}
              className="w-full text-red-400 font-medium text-xs rounded-xl py-1.5 flex items-center justify-center space-x-1.5 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} />
              <span>画像を削除して頭文字に戻す</span>
            </button>
          )}
        </div>
      </div>

      {!iconUrl && (
        <p className="text-[11px] text-gray-600 mt-2">
          未設定の場合はサービス名の頭文字がアイコンになります
        </p>
      )}
      {errorMessage && <p className="text-xs text-red-400 mt-2">{errorMessage}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
