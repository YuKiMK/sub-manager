# SubManager

サブスクリプションを日本円で一元管理する、スマホ向けのPWAです。

登録データは **その端末のブラウザ内 (IndexedDB)** にのみ保存されます。
サーバーへ送信されることはなく、アカウント登録もログインも必要ありません。

---

## スマホで使えるようにする

GitHub Pages に置くと HTTPS で配信されるため、ホーム画面へ「インストール」できます。

### 1. リポジトリを用意する

GitHub で新しいリポジトリを作り、このフォルダの内容を push します。

```powershell
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

### 2. Pages を有効にする

リポジトリの **Settings → Pages** を開き、**Source** を `GitHub Actions` に変更します。

これだけで、`main` への push のたびに `.github/workflows/deploy.yml` が動き、
`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開されます。

> リポジトリ名を `<ユーザー名>.github.io` にした場合は
> `https://<ユーザー名>.github.io/` がそのまま公開URLになります。
> どちらの場合もパスの調整は自動で行われます。

### 3. ホーム画面に追加する

公開されたURLをスマホのブラウザで開き、

- **Android (Chrome)**: メニュー → 「アプリをインストール」
- **iPhone (Safari)**: 共有 → 「ホーム画面に追加」

ブラウザのURL欄が消え、アプリとして起動します。

---

## データについて

| | |
|---|---|
| 保存先 | 端末のブラウザ内 (IndexedDB) |
| 通信 | 起動時に画面ファイルを取得するのみ。データは送信しない |
| 同期 | されません。PCとスマホはそれぞれ別のデータを持ちます |

**ブラウザのデータを削除するとサブスクの登録内容も消えます。**
機種変更やブラウザの変更でデータを引き継ぐ場合も含め、
`設定 → データ管理` からJSONファイルへ書き出しておいてください。
読み込みは既存データを消さずに追加し、同じ項目は上書きします。

---

## 開発

```powershell
npm install
npm run dev          # http://localhost:3000
npm run dev:lan      # 同じWi-Fi内のスマホから確認する場合
```

`npm run dev:lan` で開いた `http://192.168.x.x:3000` でも動作しますが、
HTTPSではないため「インストール」はできません（動作確認まで）。

### 静的サイトとして書き出す

```powershell
npm run build        # out/ に書き出される
npm run serve        # 書き出した結果を http://localhost:3000 で確認する
```

`next dev` を起動したまま `npm run build` はできません（`.next` を奪い合うため）。
先に dev サーバーを止めてください。

### アイコンを作り直す

```powershell
npm run icons
```

`scripts/generate-icons.js` が `public/icons/` のPNGを再生成します。

---

## 技術構成

- Next.js 14 (App Router) / 静的エクスポート
- TypeScript
- Tailwind CSS
- IndexedDB (端末内ストレージ)
- Service Worker (オフライン対応・PWAインストール)

サーバー処理は一切ありません。GitHub Pages のような静的ホスティングに置けます。

設計方針や実装上の決まりごとは [CLAUDE.md](CLAUDE.md) を参照してください。
