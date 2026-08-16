"use client";

import { useState, useEffect } from "react";
import { X, Check, TriangleAlert } from "lucide-react";
import { CATEGORIES, THEME_COLORS } from "@/constants/presets";
import { BILLING_CYCLES, CYCLE_META } from "@/constants/cycles";
import { DATE_LABEL, SELECTABLE_STATUSES, STATUS_META } from "@/constants/status";
import {
  BillingCycle,
  Category,
  PresetSubscription,
  Subscription,
  SubscriptionStatus,
} from "@/types";
import { cn, formatJPY } from "@/lib/utils";
import { getToday, getUpcomingBillingDate, toDateKey } from "@/lib/billing";
import { useSubscriptions } from "@/components/providers/SubscriptionProvider";
import PresetPicker from "./PresetPicker";
import IconPicker from "./IconPicker";
import PaymentMethodField from "./PaymentMethodField";

/** フォームの動作モード */
export type SubscriptionFormMode = "create" | "edit";

interface SubscriptionFormModalProps {
  mode: SubscriptionFormMode;
  /** 編集モードで必須となる編集対象 */
  subscription?: Subscription;
  onClose: () => void;
}

/**
 * サブスクリプションの登録・編集用モーダル (Bottom Sheet型)
 * Galaxy等での片手操作性を重視し、画面下部からスライドアップするUI。
 * 追加と編集で入力項目が完全に一致するため、モードで挙動を切り替える単一のフォームとして実装。
 */
export default function SubscriptionFormModal({
  mode,
  subscription,
  onClose,
}: SubscriptionFormModalProps) {
  const isEdit = mode === "edit";
  const { add, update, subscriptions } = useSubscriptions();

  // --- State (編集モードでは既存の値を初期値とする) ---
  const [name, setName] = useState(subscription?.name ?? "");
  const [price, setPrice] = useState<number | "">(subscription?.price ?? "");
  const [cycle, setCycle] = useState<BillingCycle>(subscription?.cycle ?? "monthly");
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [category, setCategory] = useState<Category>(subscription?.category ?? "エンタメ");
  const [paymentMethod, setPaymentMethod] = useState(subscription?.paymentMethod ?? "");
  const [memo, setMemo] = useState(subscription?.memo ?? "");
  const [color, setColor] = useState(subscription?.color ?? THEME_COLORS[0]);
  const [iconUrl, setIconUrl] = useState<string | undefined>(subscription?.iconUrl);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? "active");

  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);

  // 保存処理の実行状態 (二重送信の防止とエラー表示に使用)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Effects ---
  // 初期値の日付をセット (新規は本日、編集は繰り越し済みの次回更新日)
  useEffect(() => {
    if (subscription) {
      setNextBillingDate(
        getUpcomingBillingDate(subscription.nextBillingDate, subscription.cycle)
      );
      return;
    }
    // 端末のローカル日付を使用 (UTC変換による前日ズレを防ぐ)
    setNextBillingDate(toDateKey(getToday()));
  }, [subscription]);

  // モーダル表示中は背面のスクロールをロック
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  /**
   * 同じ名前で既に登録されているか。
   * 「登録したのを忘れて二重に入れる」のは実際に起きるうえ、
   * 合計金額が黙って倍になるため、登録前に気づけるようにする。
   * 解約済みは再契約の可能性があるため対象から外す。
   */
  const duplicate = subscriptions.find(
    (item) =>
      item.id !== subscription?.id &&
      item.status !== "cancelled" &&
      item.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  // --- Handlers ---
  const handlePresetClick = (preset: PresetSubscription) => {
    setSelectedPresetName(preset.name);
    setName(preset.name);
    setPrice(preset.price);
    setCycle(preset.cycle);
    setCategory(preset.category);
    if (preset.color) setColor(preset.color);
    // プリセット固有の画像があれば採用し、無ければ頭文字アイコンに戻す
    setIconUrl(preset.iconUrl);
  };

  /**
   * 入力内容を端末内ストレージへ保存し、成功時のみモーダルを閉じる。
   * 保存中は二重送信を防止し、失敗時はモーダルを開いたままエラーを表示する。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const input = {
      name,
      price: price === "" ? 0 : price,
      cycle,
      nextBillingDate,
      category,
      paymentMethod: paymentMethod.trim() || undefined,
      memo: memo.trim() || undefined,
      color,
      iconUrl,
      status,
      // 解約日は操作シートからの解約でのみ記録するため、ここでは既存値を維持する
      cancelledAt: subscription?.cancelledAt,
    };

    try {
      const result =
        isEdit && subscription
          ? await update(subscription.id, input)
          : await add(input);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      // 保存に成功した場合のみモーダルを閉じる (一覧はProvider側で読み直し済み)
      onClose();
    } catch (error) {
      console.error("サブスクリプションの保存でエラーが発生しました:", error);
      setErrorMessage("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in sm:p-4"
      onClick={onClose}
    >
      {/*
        モーダルコンテナ
        スマホでは画面下部にピッタリくっつくBottom Sheet風、PCでは中央配置
      */}
      <div
        className="w-full max-w-md bg-[#1e1e1e] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? "サブスクを編集" : "サブスクを追加"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors active:scale-95"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* スクロール可能なコンテンツ領域 */}
        <div className="overflow-y-auto p-5 space-y-7 pb-8 custom-scrollbar">

          {/* プリセット選択 ※新規登録時のみ表示 */}
          {!isEdit && (
            <PresetPicker selectedName={selectedPresetName} onSelect={handlePresetClick} />
          )}

          <form id="add-sub-form" onSubmit={handleSubmit} className="space-y-5">
            {/* サービス名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1.5">
                サービス名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="例: Spotify"
              />
              {/* 二重登録の注意。登録自体は妨げない (同名の別プランを持つ場合があるため) */}
              {duplicate && (
                <p className="flex items-start space-x-1.5 mt-2 text-[11px] text-amber-300/90">
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                  <span>
                    「{duplicate.name}」は既に登録されています（
                    {formatJPY(duplicate.price)}/{CYCLE_META[duplicate.cycle].unit}）
                  </span>
                </p>
              )}
            </div>

            {/* 料金 & 支払周期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-400 mb-1.5">
                  料金 (円) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                    required
                    min="0"
                    className="w-full bg-[#151515] border border-gray-700 rounded-xl pl-9 pr-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cycle" className="block text-sm font-medium text-gray-400 mb-1.5">
                  支払周期 <span className="text-red-400">*</span>
                </label>
                <select
                  id="cycle"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as BillingCycle)}
                  className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all"
                >
                  {BILLING_CYCLES.map((item) => (
                    <option key={item} value={item}>
                      {CYCLE_META[item].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 契約状態 (合計金額に算入するかどうかが変わる) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                契約状態 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SELECTABLE_STATUSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    className={cn(
                      "px-2 py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95",
                      status === item
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-700 bg-[#151515] text-gray-400 hover:text-white"
                    )}
                  >
                    {STATUS_META[item].label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                {STATUS_META[status].description}
              </p>
            </div>

            {/* 日付 (状態によってラベルの意味が変わる) */}
            <div>
              <label htmlFor="nextBillingDate" className="block text-sm font-medium text-gray-400 mb-1.5">
                {DATE_LABEL[status]} <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="nextBillingDate"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                required
                className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1.5">
                カテゴリ <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 支払い方法 (カード再発行時の洗い出しに使う) */}
            <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} />

            {/* アイコン画像 (未設定なら頭文字アイコン) */}
            <IconPicker name={name} color={color} iconUrl={iconUrl} onChange={setIconUrl} />

            {/* テーマカラー (カードのアクセント色) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                テーマカラー
              </label>
              <div className="grid grid-cols-8 gap-2.5">
                {/* プリセット外の色 (プリセット由来のブランドカラー等) は先頭に保持・表示 */}
                {!THEME_COLORS.includes(color.toLowerCase() as (typeof THEME_COLORS)[number]) && (
                  <span
                    className="w-full aspect-square rounded-full ring-2 ring-offset-2 ring-offset-[#1e1e1e] ring-white"
                    style={{ backgroundColor: color }}
                    aria-label={`選択中のテーマカラー ${color}`}
                  />
                )}
                {THEME_COLORS.map((themeColor) => (
                  <button
                    key={themeColor}
                    type="button"
                    onClick={() => setColor(themeColor)}
                    className={cn(
                      "w-full aspect-square rounded-full transition-all active:scale-90",
                      color.toLowerCase() === themeColor
                        ? "ring-2 ring-offset-2 ring-offset-[#1e1e1e] ring-white"
                        : "opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: themeColor }}
                    aria-label={`テーマカラー ${themeColor}`}
                  />
                ))}
              </div>
            </div>

            {/* メモ */}
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-400 mb-1.5">
                メモ (任意)
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                placeholder="プラン詳細や解約予定など..."
              />
            </div>
          </form>
        </div>

        {/* フッター (保存ボタン) */}
        <div className="p-5 border-t border-gray-800 bg-[#1e1e1e] shrink-0">
          {/* 保存失敗時のみ表示されるエラーメッセージ */}
          {errorMessage && (
            <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            form="add-sub-form"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-bold text-lg rounded-xl py-4 flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(187,134,252,0.15)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:brightness-100"
          >
            <Check size={22} strokeWidth={2.5} />
            <span>
              {isSubmitting ? "保存中..." : isEdit ? "この内容で更新する" : "この内容で登録する"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
