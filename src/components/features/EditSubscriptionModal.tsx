"use client";

import { Subscription } from "@/types";
import SubscriptionFormModal from "./SubscriptionFormModal";

interface EditSubscriptionModalProps {
  subscription: Subscription;
  onClose: () => void;
}

/**
 * 登録済みサブスクリプションの編集用モーダル
 * 値上げやプラン変更に備え、金額を含む全項目を上書きできる。
 */
export default function EditSubscriptionModal({
  subscription,
  onClose,
}: EditSubscriptionModalProps) {
  return <SubscriptionFormModal mode="edit" subscription={subscription} onClose={onClose} />;
}
