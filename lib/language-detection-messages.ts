export type LanguageDetectionCopy = {
  title: string;
  description: string;
  countdown: string;
  switchTo: string;
};

// Kept as a tiny standalone map so the client LanguageDetectionAlert component
// never bundles the full i18n JSON files (~184 KB across locales).
export const LANGUAGE_DETECTION_MESSAGES: Record<string, LanguageDetectionCopy> = {
  en: {
    title: "Language Suggestion",
    description:
      "We noticed your browser language differs from the current site language. You can switch languages anytime.",
    countdown: "Closing in {countdown} seconds",
    switchTo: "Switch to",
  },
  zh: {
    title: "语言建议",
    description:
      "我们发现你的浏览器语言与当前站点语言不同，可以随时切换语言。",
    countdown: "{countdown} 秒后关闭",
    switchTo: "切换到",
  },
  ja: {
    title: "言語の提案",
    description:
      "ブラウザの言語が現在のサイト言語と異なるようです。いつでも言語を切り替えられます。",
    countdown: "{countdown} 秒後に閉じます",
    switchTo: "切り替える",
  },
};
