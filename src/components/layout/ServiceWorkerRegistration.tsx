"use client";

import { useEffect } from "react";
import { withBasePath } from "@/constants/basePath";

/**
 * Service Worker を登録する。
 *
 * ホーム画面へ「インストール」できるPWAとして認識されるには、
 * マニフェストに加えて fetch を処理するSWが必要になるため必須の処理。
 *
 * 開発時は登録しない。ハッシュ付きの静的ファイルをキャッシュしてしまい、
 * 編集が画面に反映されない事故が起きるため。
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      // SWの制御範囲は自身が置かれた階層になるため、公開先の接頭辞を付けて登録する
      navigator.serviceWorker.register(withBasePath("/sw.js")).catch((error) => {
        console.error("Service Workerの登録に失敗しました:", error);
      });
    };

    // 初期表示の描画と競合させない
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
