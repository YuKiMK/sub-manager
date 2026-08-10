/**
 * 公開先のサブディレクトリ
 *
 * GitHub Pages にリポジトリ名付きで公開する場合、URLが
 * `https://<ユーザー名>.github.io/<リポジトリ名>/` となり、
 * 全てのパスの先頭に `/<リポジトリ名>` が必要になる。
 *
 * ビルド時に環境変数 NEXT_PUBLIC_BASE_PATH で指定する (例: `/sub-manager`)。
 * ルート直下 (`<ユーザー名>.github.io` リポジトリ) や localhost では空文字のままでよい。
 *
 * next/link や next/image は next.config.mjs の basePath が自動で効くため、
 * この定数が必要になるのは manifest・アイコン・Service Worker といった
 * 自前で文字列としてパスを組み立てている箇所のみ。
 */
// 末尾のスラッシュは取り除く (`/` だけが渡された場合は空文字と同じ扱いになる)
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/**
 * 先頭スラッシュ始まりのパスへ公開先のサブディレクトリを付ける。
 *
 * @param path `/icons/icon-192.png` のようなルート起点のパス
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
