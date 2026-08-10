/**
 * サーバーを持たない静的サイトとして書き出す設定。
 *
 * データは端末内(IndexedDB)に保存するため実行時のサーバー処理が一切無く、
 * GitHub Pages のような静的ホスティングにそのまま置ける。
 *
 * NEXT_PUBLIC_BASE_PATH … リポジトリ名付きで公開する場合に `/sub-manager` のように指定する
 *
 * 注意: output:"export" では distDir が「書き出し先」の意味になり、
 * 中間ファイルは常に .next へ置かれる。dev サーバーとビルドは同時に動かせない。
 */
// GitHub Actions は接頭辞を "/" で渡してくることがあるが、
// Next.js は末尾スラッシュ付きの basePath を受け付けないため揃えておく
// (src/constants/basePath.ts と同じ規則)
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // out/ に静的ファイルとして書き出す (Server Action・APIルートは使えない)
  output: "export",
  basePath,
  // `/calendar/index.html` の形で出力し、どの静的ホスティングでもそのまま開けるようにする
  trailingSlash: true,
  images: {
    // 画像の最適化はサーバーを必要とするため無効化する
    unoptimized: true,
  },
};

export default nextConfig;
