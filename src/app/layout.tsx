import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import FAB from "@/components/layout/FAB";
import ServiceWorkerRegistration from "@/components/layout/ServiceWorkerRegistration";
import SubscriptionProvider from "@/components/providers/SubscriptionProvider";
import { withBasePath } from "@/constants/basePath";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ネイティブアプリに近い操作感のためズーム無効化
  themeColor: "#121212",
};

export const metadata: Metadata = {
  title: "SubManager",
  description: "サブスクリプション一元管理",
  // manifest はここで指定すると basePath が取り除かれてしまうため、
  // 下の <head> で自前のlinkタグとして出力している
  // ホーム画面に追加した際にネイティブアプリのように起動させる
  appleWebApp: {
    capable: true,
    title: "SubManager",
    statusBarStyle: "black-translucent",
  },
  other: {
    // apple-mobile-web-app-capable は非推奨のため、現行の指定も併記する
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: withBasePath("/icons/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: withBasePath("/icons/apple-icon.png"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        {/*
          マニフェストの参照。
          metadata.manifest 経由だとサブディレクトリ公開時に接頭辞が落ち、
          読み込めずインストールできなくなるため、ここで直接出力する。
        */}
        <link rel="manifest" href={withBasePath("/manifest.webmanifest")} />
      </head>
      <body className={`${inter.className} min-h-screen relative bg-background text-foreground`}>
        {/* 端末内のデータは1箇所で読み込み、全画面へ配る */}
        <SubscriptionProvider>
          {/* max-w-md と mx-auto でPC閲覧時もスマホサイズの幅に制限 */}
          <main className="container mx-auto p-4 max-w-md">
            {children}
          </main>
          <FAB />
          <BottomNav />
        </SubscriptionProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
