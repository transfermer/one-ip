import { t } from "@/i18n";
import catalog from "../link/targets.json" with { type: "json" };

export type ScenarioTarget = {
  id: string;
  name: string;
  url: string;
  website?: string;
  icon?: string;
  trace?: boolean;
  readable?: boolean;
};
export type ScenarioGroup = {
  id: string;
  label: string;
  targets: ScenarioTarget[];
  quality?: "streaming" | "gaming" | "rtc";
  inbound?: boolean;
};

function fromCatalog(name: string, label = name): ScenarioTarget {
  const target = catalog.find((item) => item.name === name);
  if (!target) throw new Error(`Missing connectivity target: ${name}`);
  return {
    id: name,
    name: t(label),
    url: target.url,
    website: `https://${("host" in target && target.host) || target.icon?.match(/\/ip3\/([^/]+)\.ico$/)?.[1] || new URL(target.url).hostname}`,
    icon: target.icon,
  };
}
function site(
  id: string,
  name: string,
  website: string,
  path = "/favicon.ico",
): ScenarioTarget {
  return { id, name: t(name), website, url: new URL(path, website).href };
}

export const scenarioGroups: ScenarioGroup[] = [
  {
    id: "ai",
    label: t("AI 應用"),
    targets: [
      {
        ...site("claude", "Claude", "https://claude.ai", "/cdn-cgi/trace"),
        trace: true,
      },
      {
        ...site("chatgpt", "ChatGPT", "https://chatgpt.com", "/cdn-cgi/trace"),
        trace: true,
      },
      site("gemini", "Gemini", "https://gemini.google.com"),
      fromCatalog("DeepSeek"),
      fromCatalog("Mistral AI"),
      site("perplexity", "Perplexity", "https://www.perplexity.ai"),
    ],
  },
  {
    id: "commerce",
    label: t("跨境電商"),
    targets: [
      fromCatalog("Amazon"),
      fromCatalog("shopify.com", "Shopify"),
      fromCatalog("ebay.com", "eBay"),
      fromCatalog("aliexpress.com", "AliExpress"),
      fromCatalog("etsy.com", "Etsy"),
      fromCatalog("shopee.com", "Shopee"),
    ],
  },
  {
    id: "social",
    label: t("社交與短視頻"),
    targets: [
      fromCatalog("TikTok"),
      site(
        "instagram",
        "Instagram",
        "https://www.instagram.com",
        "https://static.cdninstagram.com/rsrc.php/yr/r/rzWiSjZRxk5.webp",
      ),
      site(
        "facebook",
        "Facebook",
        "https://www.facebook.com",
        "https://static.xx.fbcdn.net/rsrc.php/y1/r/ay1hV6OlegS.ico",
      ),
      fromCatalog("X"),
      fromCatalog("Reddit"),
      site(
        "xiaohongshu",
        "小紅書",
        "https://www.xiaohongshu.com",
        "https://fe-video-qc.xhscdn.com/fe-platform/ed8fe781ce9e16c1bfac2cd962f0721edabe2e49.ico",
      ),
    ],
  },
  {
    id: "crypto",
    label: t("加密貨幣"),
    targets: [
      fromCatalog("coinbase.com", "Coinbase"),
      fromCatalog("binance.com", "Binance"),
      fromCatalog("www.okx.com", "OKX"),
      fromCatalog("kraken.com", "Kraken"),
      fromCatalog("bybit.com", "Bybit"),
    ],
  },
  {
    id: "streaming",
    label: t("流媒體影音"),
    quality: "streaming",
    targets: [
      fromCatalog("YouTube"),
      fromCatalog("Netflix"),
      fromCatalog("Twitch"),
      fromCatalog("Spotify"),
      fromCatalog("嗶哩嗶哩"),
    ],
  },
  {
    id: "gaming",
    label: t("遊戲平臺"),
    quality: "gaming",
    targets: [
      fromCatalog("Steam"),
      fromCatalog("任天堂"),
      site("epic", "Epic Games", "https://store.epicgames.com", "/robots.txt"),
      site("xbox", "Xbox", "https://www.xbox.com"),
      site(
        "playstation",
        "PlayStation",
        "https://www.playstation.com",
        "https://gmedia.playstation.com/is/image/SIEPDC/ps-logo-favicon?$icon-32-32--t$",
      ),
    ],
  },
  {
    id: "remote",
    label: t("辦公協作"),
    quality: "rtc",
    targets: [
      fromCatalog("Zoom"),
      site("slack", "Slack", "https://slack.com"),
      site(
        "notion",
        "Notion",
        "https://www.notion.com",
        "/front-static/favicon.ico",
      ),
      site("teams", "Microsoft Teams", "https://teams.microsoft.com"),
      site("google-docs", "Google Docs", "https://docs.google.com"),
    ],
  },
  {
    id: "api",
    label: t("開發與軟件源"),
    targets: [
      site("github", "GitHub", "https://github.com"),
      fromCatalog("npm"),
      site("gitlab", "GitLab", "https://gitlab.com"),
      site("docker", "Docker Hub", "https://hub.docker.com"),
      site("stackoverflow", "Stack Overflow", "https://stackoverflow.com"),
      site("pypi", "PyPI", "https://pypi.org"),
    ],
  },
  {
    id: "hosting",
    label: t("雲服務與託管"),
    inbound: true,
    targets: [
      site("cloudflare", "Cloudflare", "https://www.cloudflare.com"),
      fromCatalog("Oracle"),
      site("aws", "AWS", "https://aws.amazon.com"),
      site("azure", "Microsoft Azure", "https://azure.microsoft.com"),
      site("vercel", "Vercel", "https://vercel.com"),
    ],
  },
  {
    id: "search",
    label: t("搜索與資訊"),
    targets: [
      fromCatalog("Google"),
      fromCatalog("Bing"),
      fromCatalog("百度"),
      fromCatalog("Wikipedia"),
      fromCatalog("Yahoo! JP"),
    ],
  },
  {
    id: "domestic",
    label: t("國內常用"),
    targets: [
      fromCatalog("淘寶"),
      fromCatalog("京東"),
      fromCatalog("微信"),
      fromCatalog("新浪微博"),
      fromCatalog("網易"),
      site("douyin", "抖音", "https://www.douyin.com"),
    ],
  },
  {
    id: "communication",
    label: t("郵箱與通信"),
    targets: [
      site("telegram", "Telegram", "https://web.telegram.org", "/favicon.ico"),
      fromCatalog("LINE"),
      site(
        "discord",
        "Discord",
        "https://discord.com",
        "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6266bc493fb42d4e27bb8393_847541504914fd33810e70a0ea73177e.ico",
      ),
      site("outlook", "Outlook", "https://outlook.live.com"),
      site("proton", "Proton Mail", "https://mail.proton.me"),
    ],
  },
];

// Interleave scenarios so the first sample queue covers every category early.
export const accessTargets: ScenarioTarget[] = Array.from(
  { length: Math.max(...scenarioGroups.map((group) => group.targets.length)) },
  (_, index) =>
    scenarioGroups.flatMap((group) =>
      group.targets[index] ? [group.targets[index]] : [],
    ),
).flat();
