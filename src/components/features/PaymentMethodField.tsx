"use client";

import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_MAX_LENGTH,
  PAYMENT_METHOD_SUGGESTIONS,
} from "@/constants/paymentMethods";

interface PaymentMethodFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 支払い方法の入力欄。
 *
 * 「カードを再発行したとき、どれを切り替えればよいか」を後から追えるようにするための項目。
 * 決済手段は人によって呼び方が違う（「楽天カード(1234)」など）ため自由入力を基本とし、
 * よく使うものだけ1タップで入れられるようにしている。
 */
export default function PaymentMethodField({ value, onChange }: PaymentMethodFieldProps) {
  return (
    <div>
      <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-400 mb-1.5">
        支払い方法 (任意)
      </label>
      <input
        type="text"
        id="paymentMethod"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={PAYMENT_METHOD_MAX_LENGTH}
        className="w-full bg-[#151515] border border-gray-700 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        placeholder="例: 楽天カード (1234)"
      />

      {/* よく使う決済手段。押すと入力欄へ入り、同じものを押すと外れる */}
      <div className="flex flex-wrap gap-2 mt-2.5">
        {PAYMENT_METHOD_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onChange(value === suggestion ? "" : suggestion)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95",
              value === suggestion
                ? "border-primary bg-primary/15 text-primary"
                : "border-gray-700 bg-[#151515] text-gray-400 hover:text-white"
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
