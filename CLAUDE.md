# Subscription Manager - Claude AI Guide

## アーキテクチャ設計思想
- **モバイルファースト**: Galaxy等のAndroidスマートフォンでの片手操作性を最優先。画面の最大幅を制限（max-w-md）し、ネイティブアプリのような体験を提供。
- **UI/UX**: ダークモード基調。BottomNavigationと中央配置のFAB（Floating Action Button）を中心としたUI。
- **SRP (単一責任の原則)**: コンポーネントやロジックは細かく分割し、1ファイル1コンポーネントを徹底。
- **データストア**: 端末内の IndexedDB。サーバーを持たず、データは端末から出ない。
- **スタイル**: Tailwind CSSによるユーティリティファーストなスタイリング。

## サーバーを持たない構成
実行時のサーバー処理は一切無く、`output: "export"` で静的ファイルとして書き出して
GitHub Pages に置く（`.github/workflows/deploy.yml`）。この前提が全体を規定している。

- **Server Action・APIルート・SSRは使えない**。データ操作は全てブラウザ上で行う。
- したがって `crypto`・`fs` などNode専用APIを含むコードをアプリ側に置かない
  （id採番は `lib/id.ts`。`crypto.randomUUID` はHTTPS/localhost以外で使えないため代替経路を持つ）。
- 認証は不要。データが端末から出ないため、公開URLでも他人のデータは見えない。
- 端末間で同期しない。引き継ぎは `設定 → データ管理` のJSON書き出し／読み込みのみ。

## ディレクトリ構造
- `/src/app`: Next.js App Router (ページ、レイアウト)
  - 4画面とも `"use client"`。データは `useSubscriptions()` から受け取る
  - `/calendar`, `/analytics`, `/settings`: カレンダー・分析・設定画面
- `/src/components`: UIコンポーネント
  - `/ui`: 汎用コンポーネント (ボタン、入力フォーム、読み込み/エラー表示等)
  - `/layout`: レイアウトコンポーネント (ボトムナビ、FAB等)
  - `/features`: 特定機能のコンポーネント
  - `/providers`: 全画面へ値を配るコンテキスト
- `/src/constants`: 定数 (プリセット一覧、カテゴリ、公開先の接頭辞等。一元管理)
- `/src/types`: TypeScriptの型定義
- `/src/lib`: ユーティリティ、データ層
  - `localDb.ts`: IndexedDBの開閉とトランザクション
  - `subscriptionRepository.ts`: 保存形式 ⇔ 型 の変換 (データアクセス層)
  - `subscriptionService.ts`: 検証とリポジトリ呼び出しの窓口
  - `subscriptionValidation.ts`: 入力値の検証・正規化
  - `billing.ts`: 課金日の繰り越し・月額換算・集計ロジック
  - `id.ts`: id採番

## データフローの原則
`画面 → SubscriptionProvider → subscriptionService → 検証 (subscriptionValidation)
→ リポジトリ (subscriptionRepository) → localDb.ts`
の一方向。コンポーネントから直接 IndexedDB を触らないこと。

読み込みは `SubscriptionProvider` が1度だけ行い、全画面へ配る。
追加・更新・削除は `useSubscriptions()` の関数を使うこと。書き込み後の読み直しまで
Provider が行うため、画面側で再取得を書く必要はない。

画面表示の直後はまだ読み込みが終わっていない。`isLoading` を見ずに描くと
一瞬「登録なし」「￥0」が出るため、必ず `LoadingPanel` / `ErrorPanel` に差し替えること。

## サービスアイコン
画像(`iconUrl`)が設定されていればそれを、無ければサービス名の頭文字を
イメージカラーの円に載せて表示する (`ServiceIcon`)。文字色は背景の輝度から自動決定するため、
明るいブランド色でも読めなくならない。
`iconUrl` は端末で96px正方形に縮小した data URI か `/public` 配下のパスのみ許可する。

## プリセットの追加
`/src/constants/presets.ts` の `SUBSCRIPTION_PRESETS` に1行足すだけで、
検索・カテゴリ絞り込み・一覧に自動反映される。`popular: true` を付けると上部の横スクロール枠に出る。
金額は登録時の初期値（目安）であり、ユーザーが必ず上書きできる前提で扱うこと。

## 公開先の接頭辞 (basePath)
リポジトリ名付きで GitHub Pages に置くとURLが `/<リポジトリ名>/` 配下になる。
ビルド時の `NEXT_PUBLIC_BASE_PATH` で吸収する（ワークフローが自動で渡す）。

- `next/link`・`next/image` は `next.config.mjs` の `basePath` が自動で効く。
- 自前で文字列としてパスを組み立てる箇所（アイコン、マニフェスト、SWの登録）だけ
  `constants/basePath.ts` の `withBasePath()` を通すこと。
- `metadata.manifest` は **basePath が剥がれる**ため使わない。
  `layout.tsx` の `<head>` に自前の `<link rel="manifest">` を出している。
- `app/manifest.ts` は使わない。存在すると Next が接頭辞なしの link を勝手に追加してしまう。
  代わりに `public/manifest.webmanifest` を**相対パス**で持つ（`start_url: "./"`,
  `icons[].src: "icons/..."`）。相対にしてあるため、どこに置いても解決できる。

## PWA / アイコン
- `public/sw.js` … Service Worker。GETのみ扱う。
  自身の配置場所から接頭辞を割り出すので、パスを決め打ちにしないこと。
  4画面のHTMLを先読みしてあり、初回起動の直後に圏外になっても全画面を開ける。
  キャッシュの中身を変えたら `VERSION` を上げること（activate時に旧版を削除する）。
- 開発時はSWを登録しない（`ServiceWorkerRegistration`）。静的ファイルのキャッシュで編集が反映されなくなるため。
- アイコンは `npm run icons` (`scripts/generate-icons.js`) で再生成する。依存パッケージ無しでPNGを直接出力する。
  意匠は「重なったカード＝複数の契約」で、前面のカードから円記号をくり抜いている。
  maskable用に図形を中央80%（半径204/512）以内へ収める制約があり、スクリプトが起動時に検算して
  超えていれば止まる。32pxはカードが潰れるため円記号だけの簡易版に切り替える。
  **アイコンを差し替えたら `public/sw.js` の `VERSION` を上げること**（キャッシュ優先で配るため、
  上げないと既存の端末で古い絵が残る）。
- **PWAとして「インストール」するにはHTTPSが必須**（localhostは例外）。
  LANのhttp://192.168.x.x では動作はするがインストールはできない。GitHub Pages はHTTPSなので可。

## ビルドと確認
`npm run build` → `out/` に書き出し、`npm run serve` で確認する。

`output: "export"` では `distDir` が**書き出し先**の意味になり、中間ファイルは常に `.next` に置かれる。
そのため `next dev` を起動したままビルドすることはできない（かつて使えた `NEXT_DIST_DIR` による
分離は効かない）。先に dev サーバーを止めること。

## 契約状態 (status)
`active` / `trial` / `scheduled` / `cancelled` の4種。表示定義は `/src/constants/status.ts` に集約。
- 実質月額合計・カテゴリ集計に入るのは **active のみ**。判定は `billing.ts` の `countsTowardTotal()` を使い、
  画面ごとに条件を書かないこと。
- `nextBillingDate` の意味が状態で変わる: active=次回請求日 / trial=無料期間の終了日 / scheduled=利用開始日。
  trial・scheduled・cancelled は「一度きりの日付」なので繰り越さない。
- 予定日を過ぎた trial・scheduled は勝手に active へ書き換えず、`needsStatusUpdate` を立てて
  ユーザーに更新を促す（合計金額が黙って変わるのを避けるため）。
- 解約は削除と別物。`cancelled` は履歴として残し、節約額の集計に使う。

## 支出の推移グラフ
支払い履歴テーブルは持たず、基準日と周期から算出しているため **過去に遡った実績は復元できない**。
分析画面の推移グラフは今月起点の「今後12ヶ月の請求予定」であり、過去の月を足してはいけない
（先月登録したサービスが半年前も契約されていたかは判断できず、必ず過少になるため）。
実績を出したくなった場合は、請求日の経過を記録する payments テーブルの新設が必要。

## 保存項目を増やすとき
IndexedDBは列定義を持たないため、`Subscription` 型と
`subscriptionRepository.ts` の `SubscriptionRecord` に項目を足すだけでよい。

**既に端末に入っているデータには新しい項目が無い**点に注意する。
`toSubscription()` のように、欠けている場合の既定値を必ず用意すること
（`status` を `'active'` に倒しているのがその例）。
`localDb.ts` の `DB_VERSION` を上げる必要があるのは、オブジェクトストアや索引を
増減する場合だけ。項目の追加では上げない。

登録済みデータを消す変更は行わないこと。ユーザーの手元にしか存在しないため復元できない。

## 日付の扱い
保存された `nextBillingDate` は「基準日」として扱い、表示時に `billing.ts` が
今日以降になるまで周期分を繰り越して算出する (保存値は書き換えない)。
月末日は元の基準日を起点に丸めるため、1/31登録は 2/28 → 3/31 と本来の請求日を維持する。
日付計算は時差による1日ズレを防ぐため、全てUTC0時に正規化して行うこと。

## 開発・改修時の絶対ルール
1. **通貨の統一**: アプリ内の全ての金額は日本円 (JPY) で計算・保存・表示すること。外貨換算ロジックは組み込まない。
2. **料金の編集可能性**: プリセットからサブスクリプションを選択した場合でも、プラン変更や値上げに備え、ユーザーがUI上で手動で金額を上書き編集できる入力フォーム設計にすること。
3. **型とドキュメント**: TypeScriptを用いた厳格な型定義を行い、データの流れを追いやすくする。複雑なロジックや主要関数にはJSDocを記述すること。
4. **データの保全**: 登録内容はユーザーの端末内にしか存在せず、消えたら復元できない。
   保存形式を変える場合は、既存データが読めなくなる変更を避けること。
5. **個人データを公開しない**: `subscriptions.db` と書き出したJSONは登録内容そのもの。
   `.gitignore` 済みだが、リポジトリに含めないこと。
