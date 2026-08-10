"use client";

import SubscriptionFormModal from "./SubscriptionFormModal";

interface AddSubscriptionModalProps {
  onClose: () => void;
}

/**
 * サブスクリプション新規追加用モーダル
 * 入力項目は編集時と完全に同一のため、実体は SubscriptionFormModal に委譲する。
 */
export default function AddSubscriptionModal({ onClose }: AddSubscriptionModalProps) {
  return <SubscriptionFormModal mode="create" onClose={onClose} />;
}
