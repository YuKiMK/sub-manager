import { PresetSubscription } from '../types';

/**
 * カテゴリ一覧
 * Claude Codeエージェントは、カテゴリを追加・変更する場合ここを編集してください。
 */
export const CATEGORIES = ['エンタメ', 'AIツール', '仕事', 'インフラ', 'その他'] as const;

/**
 * 手動登録時に選択できるテーマカラー一覧
 * カードの左アクセントやアイコンの配色に利用される。
 */
export const THEME_COLORS = [
  '#bb86fc',
  '#03dac6',
  '#4f9cf9',
  '#f97316',
  '#ef4444',
  '#22c55e',
  '#eab308',
  '#ec4899',
] as const;

/**
 * デフォルトで提供されるサブスクリプションのプリセット一覧
 *
 * ここに載っている金額はあくまで登録時の初期値（目安）です。
 * プランの違いや値上げがあるため、UI上でユーザーが必ず上書きできるようにしてあります。
 * サービスを増やす場合はこの配列に追記するだけで、検索・カテゴリ絞り込みに自動で反映されます。
 *
 * - `popular: true` を付けたものがモーダル上部の横スクロール枠に並びます。
 * - `color` はアイコンの背景色（サービスのイメージカラー）です。
 */
export const SUBSCRIPTION_PRESETS: PresetSubscription[] = [
  // ---------------- エンタメ（動画） ----------------
  { name: 'Netflix', price: 1590, cycle: 'monthly', category: 'エンタメ', color: '#e50914', popular: true },
  { name: 'YouTube Premium', price: 1280, cycle: 'monthly', category: 'エンタメ', color: '#ff0000', popular: true },
  { name: 'Amazonプライム', price: 600, cycle: 'monthly', category: 'エンタメ', color: '#00a8e1', popular: true },
  { name: 'Disney+', price: 1140, cycle: 'monthly', category: 'エンタメ', color: '#1f4bd8' },
  { name: 'U-NEXT', price: 2189, cycle: 'monthly', category: 'エンタメ', color: '#00b0f0' },
  { name: 'Hulu', price: 1026, cycle: 'monthly', category: 'エンタメ', color: '#1ce783' },
  { name: 'DAZN', price: 4200, cycle: 'monthly', category: 'エンタメ', color: '#8fd400' },
  { name: 'ABEMAプレミアム', price: 1080, cycle: 'monthly', category: 'エンタメ', color: '#0dc268' },
  { name: 'dアニメストア', price: 550, cycle: 'monthly', category: 'エンタメ', color: '#cc0033' },
  { name: 'ニコニコプレミアム', price: 790, cycle: 'monthly', category: 'エンタメ', color: '#ffb300' },
  { name: 'Lemino', price: 990, cycle: 'monthly', category: 'エンタメ', color: '#e6007e' },

  // ---------------- エンタメ（音楽・書籍・ゲーム） ----------------
  { name: 'Spotify', price: 1080, cycle: 'monthly', category: 'エンタメ', color: '#1db954', popular: true },
  { name: 'Apple Music', price: 1080, cycle: 'monthly', category: 'エンタメ', color: '#fa243c' },
  { name: 'Amazon Music Unlimited', price: 1080, cycle: 'monthly', category: 'エンタメ', color: '#25d1da' },
  { name: 'Kindle Unlimited', price: 980, cycle: 'monthly', category: 'エンタメ', color: '#ff9900' },
  { name: 'Audible', price: 1500, cycle: 'monthly', category: 'エンタメ', color: '#f8991c' },
  { name: '楽天マガジン', price: 572, cycle: 'monthly', category: 'エンタメ', color: '#bf0000' },
  { name: 'Nintendo Switch Online', price: 2400, cycle: 'yearly', category: 'エンタメ', color: '#e60012' },
  { name: 'PlayStation Plus', price: 1300, cycle: 'monthly', category: 'エンタメ', color: '#0070d1' },
  { name: 'Apple Arcade', price: 900, cycle: 'monthly', category: 'エンタメ', color: '#f56300' },

  // ---------------- AIツール ----------------
  { name: 'ChatGPT Plus', price: 3000, cycle: 'monthly', category: 'AIツール', color: '#10a37f', popular: true },
  { name: 'Claude Pro', price: 3000, cycle: 'monthly', category: 'AIツール', color: '#d97757', popular: true },
  { name: 'Google AI Pro', price: 2900, cycle: 'monthly', category: 'AIツール', color: '#1a73e8', popular: true },
  { name: 'GitHub Copilot', price: 1500, cycle: 'monthly', category: 'AIツール', color: '#8957e5' },
  { name: 'Perplexity Pro', price: 3000, cycle: 'monthly', category: 'AIツール', color: '#20808d' },
  { name: 'Midjourney', price: 1500, cycle: 'monthly', category: 'AIツール', color: '#6b5bff' },
  { name: 'Notion AI', price: 1500, cycle: 'monthly', category: 'AIツール', color: '#e8e8e8' },
  { name: 'Cursor Pro', price: 3000, cycle: 'monthly', category: 'AIツール', color: '#3b82f6' },

  // ---------------- 仕事 ----------------
  { name: 'Microsoft 365', price: 1490, cycle: 'monthly', category: '仕事', color: '#d83b01' },
  { name: 'Adobe Creative Cloud', price: 7780, cycle: 'monthly', category: '仕事', color: '#eb1000' },
  { name: 'Notion', price: 1650, cycle: 'monthly', category: '仕事', color: '#e8e8e8' },
  { name: 'Slack', price: 1050, cycle: 'monthly', category: '仕事', color: '#36c5f0' },
  { name: 'Zoom', price: 2125, cycle: 'monthly', category: '仕事', color: '#2d8cff' },
  { name: 'Canva Pro', price: 1500, cycle: 'monthly', category: '仕事', color: '#00c4cc' },
  { name: 'Figma', price: 2250, cycle: 'monthly', category: '仕事', color: '#f24e1e' },
  { name: 'Dropbox Plus', price: 1500, cycle: 'monthly', category: '仕事', color: '#0061ff' },
  { name: 'Evernote', price: 1100, cycle: 'monthly', category: '仕事', color: '#00a82d' },
  { name: 'freee会計', price: 1980, cycle: 'monthly', category: '仕事', color: '#2864f0' },
  { name: 'マネーフォワード', price: 500, cycle: 'monthly', category: '仕事', color: '#0055a5' },

  // ---------------- インフラ ----------------
  { name: 'iCloud+', price: 450, cycle: 'monthly', category: 'インフラ', color: '#3693f3', popular: true },
  { name: 'Google One', price: 1300, cycle: 'monthly', category: 'インフラ', color: '#4285f4' },
  { name: '1Password', price: 3900, cycle: 'yearly', category: 'インフラ', color: '#0572ff' },
  { name: 'NordVPN', price: 1000, cycle: 'monthly', category: 'インフラ', color: '#4687ff' },
  { name: 'さくらのVPS', price: 600, cycle: 'monthly', category: 'インフラ', color: '#e5007f' },
  { name: 'お名前.com ドメイン', price: 1500, cycle: 'yearly', category: 'インフラ', color: '#eb6100' },
  { name: 'ahamo', price: 2970, cycle: 'monthly', category: 'インフラ', color: '#cc0033' },
  { name: 'povo', price: 2700, cycle: 'monthly', category: 'インフラ', color: '#00c2ff' },
  { name: '楽天モバイル', price: 3278, cycle: 'monthly', category: 'インフラ', color: '#bf0000' },

  // ---------------- その他 ----------------
  { name: 'chocoZAP', price: 3278, cycle: 'monthly', category: 'その他', color: '#ffc800' },
  { name: 'Uber One', price: 498, cycle: 'monthly', category: 'その他', color: '#06c167' },
  { name: 'Amazonプライム(年払い)', price: 5900, cycle: 'yearly', category: 'その他', color: '#00a8e1' },
  { name: 'JAF', price: 4000, cycle: 'yearly', category: 'その他', color: '#f5a200' },
];

/** モーダル上部の横スクロール枠に並べる人気サービス */
export const POPULAR_PRESETS = SUBSCRIPTION_PRESETS.filter((preset) => preset.popular);
