import { t } from "@/i18n";

export interface BrowserNavigator extends Navigator {
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  userAgentData?: {
    platform: string;
    mobile: boolean;
    brands: { brand: string; version: string }[];
    getHighEntropyValues(hints: string[]): Promise<Record<string, unknown>>;
  };
}
export function environmentSnapshot() {
  const nav = navigator as BrowserNavigator;
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: Array.from(nav.languages),
    hardwareConcurrency: nav.hardwareConcurrency,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export function environmentRows(): [string, string | number][] {
  const nav = navigator as BrowserNavigator;
  return [
    ["User-Agent", nav.userAgent],
    [t("平臺"), nav.platform || t("未提供")],
    [t("語言"), nav.languages.join(" · ")],
    [t("時區"), Intl.DateTimeFormat().resolvedOptions().timeZone],
    [t("屏幕"), `${screen.width} × ${screen.height}`],
    [t("可用屏幕"), `${screen.availWidth} × ${screen.availHeight}`],
    [t("視口"), `${innerWidth} × ${innerHeight}`],
    [t("像素比"), devicePixelRatio],
    [t("色深"), screen.colorDepth],
    [t("邏輯處理器"), nav.hardwareConcurrency ?? t("未提供")],
    [
      t("內存提示"),
      nav.deviceMemory ? t("{0} GB（近似）", [nav.deviceMemory]) : t("未提供"),
    ],
    [t("觸控點"), nav.maxTouchPoints],
    ["Cookie", nav.cookieEnabled ? t("已啓用") : t("未啓用")],
    [t("Client Hints 平臺"), nav.userAgentData?.platform ?? t("不支持")],
    [
      t("Client Hints 品牌"),
      nav.userAgentData?.brands
        .map((item) => `${item.brand} ${item.version}`)
        .join(" · ") ?? t("不支持"),
    ],
  ];
}
