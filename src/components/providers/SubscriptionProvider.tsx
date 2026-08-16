"use client";

/**
 * 端末内に保存されたサブスクリプションを読み込み、全画面へ配るコンテキスト。
 *
 * サーバーを持たない構成のため、データの取得はブラウザ上でしか行えない。
 * 各画面がそれぞれ読み込むと表示のたびにチラつくため、ここで一度だけ読み込み、
 * 追加・更新・削除のあとは自動で読み直して全画面に反映する。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addSubscription,
  changeSubscriptionStatus,
  deleteSubscription,
  getSubscriptions,
  importSubscriptions,
  updateSubscription,
} from "@/lib/subscriptionService";
import { LocalStorageUnavailableError } from "@/lib/localDb";
import { requestPersistentStorage } from "@/lib/storagePersistence";
import { hasRequestedPersistence, markPersistenceRequested } from "@/lib/appPreferences";
import {
  ActionResult,
  ImportActionResult,
  SubscriptionInput,
  SubscriptionStatus,
  SubscriptionView,
} from "@/types";

interface SubscriptionStore {
  /** 登録済みの全サブスクリプション (次回更新日が近い順) */
  subscriptions: SubscriptionView[];
  /** 初回の読み込み中かどうか (未登録との区別に使う) */
  isLoading: boolean;
  /** 読み込み自体に失敗した場合の文言 */
  loadError: string | null;
  add: (input: SubscriptionInput) => Promise<ActionResult>;
  update: (id: string, input: SubscriptionInput) => Promise<ActionResult>;
  changeStatus: (id: string, status: SubscriptionStatus) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
  importMany: (records: unknown) => Promise<ImportActionResult>;
}

const SubscriptionContext = createContext<SubscriptionStore | null>(null);

export default function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // アンマウント後の setState を避けるための生存フラグ
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /** 端末内のデータを読み直す */
  const refresh = useCallback(async () => {
    try {
      const latest = await getSubscriptions();
      if (!isMounted.current) return;
      setSubscriptions(latest);
      setLoadError(null);
    } catch (error) {
      console.error("サブスクリプションの取得に失敗しました:", error);
      if (!isMounted.current) return;
      setLoadError(
        error instanceof LocalStorageUnavailableError
          ? error.message
          : "データの読み込みに失敗しました。ページを再読み込みしてください。"
      );
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 登録が1件でもあれば、ブラウザの自動削除からデータを守るよう要求する。
  // 守る対象が無いうちに確認を出しても意味が無いため、データができてから1度だけ行う。
  useEffect(() => {
    if (isLoading || subscriptions.length === 0) return;
    if (hasRequestedPersistence()) return;

    markPersistenceRequested();
    void requestPersistentStorage();
  }, [isLoading, subscriptions.length]);

  // 日付が変わると「あとN日」や繰り越し後の請求日がずれるため、
  // アプリに戻ってきたタイミングで計算し直す (PWAは閉じずに翌日開かれることが多い)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  /** 書き込み処理の後に必ず読み直す共通ラッパー */
  const mutate = useCallback(
    async <T extends { success: boolean }>(task: () => Promise<T>): Promise<T> => {
      const result = await task();
      if (result.success) await refresh();
      return result;
    },
    [refresh]
  );

  const value = useMemo<SubscriptionStore>(
    () => ({
      subscriptions,
      isLoading,
      loadError,
      add: (input) => mutate(() => addSubscription(input)),
      update: (id, input) => mutate(() => updateSubscription(id, input)),
      changeStatus: (id, status) => mutate(() => changeSubscriptionStatus(id, status)),
      remove: (id) => mutate(() => deleteSubscription(id)),
      importMany: (records) => mutate(() => importSubscriptions(records)),
    }),
    [subscriptions, isLoading, loadError, mutate]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * 登録済みサブスクリプションと、その操作関数を取得する。
 * SubscriptionProvider の内側でのみ使用できる。
 */
export function useSubscriptions(): SubscriptionStore {
  const store = useContext(SubscriptionContext);
  if (!store) {
    throw new Error("useSubscriptions は SubscriptionProvider の内側で使用してください");
  }
  return store;
}
