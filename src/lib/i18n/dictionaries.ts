import type { Locale } from "./config";

const zhTwDictionary = {
  site: {
    name: "1Wiki｜AI、軟體、3C 使用教學與疑難解答",
    description: "用清楚、可操作的步驟，解決 AI、軟體、社群與 3C 的日常問題。",
  },
  navigation: { primary: "主要導覽", language: "選擇語言", admin: "後台", ai: "AI", software: "軟體", social: "社群" },
  home: {
    eyebrow: "一步一步，把問題解決",
    title: "科技卡住了？從這裡找到答案。",
    intro: "1Wiki 用清楚、可操作的繁體中文教學，協助你處理 AI、軟體、社群與 3C 的日常問題。",
    exploreEyebrow: "探索主題",
    exploreTitle: "從問題類型開始",
    latestEyebrow: "最新解答",
    latestTitle: "剛整理好的實用教學",
    viewCategory: "查看教學 →",
    emptyTitle: "第一批教學準備中",
    emptyDescription: "後台發布文章後，內容會自動出現在這裡。",
  },
  category: { eyebrow: "主題分類", emptyTitle: "內容準備中", emptyDescription: "這個分類的教學正在整理，很快就會更新。" },
  article: { home: "首頁", readMore: "閱讀解答 →", updated: "更新於", explore: "繼續探索", categoryLink: "前往分類 →" },
  footer: { description: "AI、軟體、3C 使用教學與疑難解答。", information: "網站資訊", about: "關於我們", contact: "聯絡我們", privacy: "隱私權", terms: "使用條款" },
  notFound: { eyebrow: "404", title: "找不到這個頁面", description: "內容可能已移動、尚未發布，或網址輸入錯誤。", home: "返回首頁" },
  error: { eyebrow: "發生錯誤", title: "暫時無法載入", description: "請稍後重試；如果問題持續發生，請聯絡網站管理者。", retry: "重新載入" },
  infoUnavailable: { title: "內容準備中", description: "此頁面的繁體中文內容正在準備。" },
} as const;

type DictionaryShape = {
  [Section in keyof typeof zhTwDictionary]: {
    [Key in keyof (typeof zhTwDictionary)[Section]]: string;
  };
};

const enDictionary = {
  site: { name: "1Wiki | Practical technology guides", description: "Clear, practical guides for AI, software, social platforms, and everyday technology." },
  navigation: { primary: "Primary navigation", language: "Choose language", admin: "Admin", ai: "AI", software: "Software", social: "Social" },
  home: { eyebrow: "Clear answers, step by step", title: "Stuck with technology? Start here.", intro: "1Wiki publishes practical guides for everyday technology problems.", exploreEyebrow: "Explore topics", exploreTitle: "Start with a category", latestEyebrow: "Latest answers", latestTitle: "Recently published guides", viewCategory: "View guides →", emptyTitle: "Content coming soon", emptyDescription: "English guides are being prepared." },
  category: { eyebrow: "Topic", emptyTitle: "Content coming soon", emptyDescription: "Guides for this topic are being prepared." },
  article: { home: "Home", readMore: "Read the answer →", updated: "Updated", explore: "Explore more", categoryLink: "View category →" },
  footer: { description: "Practical guides for AI, software, and everyday technology.", information: "Site information", about: "About", contact: "Contact", privacy: "Privacy", terms: "Terms" },
  notFound: { eyebrow: "404", title: "Page not found", description: "This content may have moved, may not be published, or the address may be incorrect.", home: "Back to home" },
  error: { eyebrow: "Error", title: "Unable to load this page", description: "Please try again later. Contact the site administrator if the problem continues.", retry: "Try again" },
  infoUnavailable: { title: "Content coming soon", description: "The English version of this page is being prepared." },
} satisfies DictionaryShape;

const jaDictionary = {
  site: { name: "1Wiki｜実用的なテクノロジーガイド", description: "AI、ソフトウェア、SNS、デジタル機器の問題を分かりやすい手順で解決します。" },
  navigation: { primary: "メインナビゲーション", language: "言語を選択", admin: "管理画面", ai: "AI", software: "ソフトウェア", social: "SNS" },
  home: { eyebrow: "一つずつ、分かりやすく解決", title: "テクノロジーで困ったら、ここから。", intro: "1Wikiでは、日常のテクノロジー問題に役立つ実用的なガイドを提供します。", exploreEyebrow: "トピックを探す", exploreTitle: "カテゴリーから探す", latestEyebrow: "最新の回答", latestTitle: "新着ガイド", viewCategory: "ガイドを見る →", emptyTitle: "コンテンツを準備中です", emptyDescription: "日本語のガイドを準備しています。" },
  category: { eyebrow: "カテゴリー", emptyTitle: "コンテンツを準備中です", emptyDescription: "このカテゴリーのガイドを準備しています。" },
  article: { home: "ホーム", readMore: "回答を読む →", updated: "更新日", explore: "関連情報", categoryLink: "カテゴリーを見る →" },
  footer: { description: "AI、ソフトウェア、デジタル機器の実用ガイド。", information: "サイト情報", about: "サイトについて", contact: "お問い合わせ", privacy: "プライバシー", terms: "利用規約" },
  notFound: { eyebrow: "404", title: "ページが見つかりません", description: "ページが移動したか、まだ公開されていないか、URLが正しくない可能性があります。", home: "ホームへ戻る" },
  error: { eyebrow: "エラー", title: "ページを読み込めません", description: "しばらくしてからもう一度お試しください。", retry: "再読み込み" },
  infoUnavailable: { title: "コンテンツを準備中です", description: "このページの日本語版を準備しています。" },
} satisfies DictionaryShape;

export type SiteDictionary = DictionaryShape;

const dictionaries = {
  "zh-tw": zhTwDictionary,
  en: enDictionary,
  ja: jaDictionary,
} satisfies Record<Locale, SiteDictionary>;

export function getDictionary(locale: Locale): SiteDictionary {
  return dictionaries[locale];
}
