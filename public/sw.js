/*
 * SubManager Service Worker
 *
 * 役割は2つ:
 *   1. PWAとしてインストール可能にする (Chromeはfetchハンドラを持つSWを要求する)
 *   2. 通信が無くてもアプリを起動できるようにする
 *
 * 登録データは端末内(IndexedDB)にあり、サーバーとの通信は一切発生しない。
 * ここで扱うのは画面を構成するファイル(HTML/JS/CSS/画像)のみで、データには触れない。
 *
 * キャッシュの中身を変えたら VERSION を上げること (activate時に旧版を削除する)。
 */
const VERSION = "v3";
const STATIC_CACHE = `submanager-static-${VERSION}`;
const PAGE_CACHE = `submanager-pages-${VERSION}`;

/*
 * 公開先のサブディレクトリを自分の位置から割り出す。
 * GitHub Pages にリポジトリ名付きで置いた場合 `/sub-manager/sw.js` に配置されるため、
 * パスを決め打ちにするとキャッシュが一切効かなくなる。
 *   /sw.js             → ""
 *   /sub-manager/sw.js → "/sub-manager"
 */
const BASE = self.location.pathname.replace(/sw\.js$/, "").replace(/\/$/, "");

const OFFLINE_URL = `${BASE}/offline.html`;

/** 無いと成立しないもの (1つでも失敗すればインストールを失敗させる) */
const ESSENTIAL_URLS = [
  OFFLINE_URL,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/favicon-32.png`,
];

/**
 * 画面のHTML。
 * 初回起動の直後に通信が切れても全画面を開けるよう、先に取得しておく。
 * 取得できなくてもアプリ自体は動くため、失敗は握りつぶす。
 */
const PAGE_URLS = [`${BASE}/`, `${BASE}/calendar/`, `${BASE}/analytics/`, `${BASE}/settings/`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(ESSENTIAL_URLS))
      .then(() => caches.open(PAGE_CACHE))
      .then((cache) =>
        // 1画面でも取れなければ全て失敗する addAll は使わず、取れたものだけ保存する
        Promise.all(PAGE_URLS.map((url) => cache.add(url).catch(() => undefined)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** 通信優先。失敗したら直前の表示、それも無ければオフライン画面 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // クエリ違いで取り逃さないよう、検索文字列は無視して照合する
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("オフラインです", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** ハッシュ付きの静的ファイル向け。あれば即返す */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 参照以外のリクエストには関与しない
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // RSCペイロードは古い内容を返すと表示が壊れるためキャッシュしない
  if (url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith(`${BASE}/_next/static/`) ||
    url.pathname.startsWith(`${BASE}/icons/`)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
