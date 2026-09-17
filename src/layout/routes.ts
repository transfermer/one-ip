import { t } from "@/i18n";
import { aiPlatforms } from "@/views/ai/platforms";

export const navigationRoutes = [
  { value: "/", label: t("概覽"), short: t("概覽") },
  { value: "/ai/", label: t("AI 檢測"), short: "AI" },
  { value: "/status/", label: t("服務狀態"), short: t("狀態") },
  { value: "/network/", label: t("網絡檢測"), short: t("網絡") },
  { value: "/browser/", label: t("瀏覽器檢測"), short: t("瀏覽器") },
] as const;
export const toolGroups = {
  network: [
    { path: "/network/connectivity", label: t("網站連通與出口") },
    { path: "/network/dns", label: t("DNS 出口") },
    { path: "/network/cdn", label: t("CDN 節點") },
    { path: "/network/ip", label: t("IP 檢測") },
    { path: "/network/subdomains", label: t("子域名查詢") },
    { path: "/network/whois", label: "WHOIS" },
    { path: "/network/ping", label: t("全球 Ping") },
  ],
  browser: [
    { path: "/browser/environment", label: t("環境信息") },
    { path: "/browser/fingerprint", label: t("指紋檢測") },
    { path: "/browser/consistency", label: t("環境一致性") },
    { path: "/browser/automation", label: t("自動化特徵") },
    { path: "/browser/privacy", label: t("權限與隱私") },
    { path: "/browser/challenges", label: t("人機校驗") },
  ],
  ai: aiPlatforms.map((platform) => ({
    path: `/ai/${platform.id}`,
    label: platform.name,
  })),
} as const;
export const legacyRoutes: Record<string, string> = {
  "/query": "/network/ip",
  "/query/ip": "/network/ip",
  "/query/ip/:ip": "/network/ip",
  "/query/whois": "/network/whois",
  "/ip": "/network/ip",
  "/ip/:ip": "/network/ip",
  "/whois": "/network/whois",
  "/link": "/network/connectivity",
  "/network/link": "/network/connectivity",
  "/network/exits": "/network/connectivity",
  "/ping": "/network/ping",
  "/cdn": "/network/cdn",
  "/dns-exit": "/network/dns",
  "/network/dns-exit": "/network/dns",
  "/webrtc": "/browser/privacy",
  "/network/webrtc": "/browser/privacy",
  "/browser/webrtc": "/browser/privacy",
  "/gpt": "/ai/gpt",
  "/claude": "/ai/claude",
  "/gpt/status.html": "/status/openai",
  "/claude/status.html": "/status/claude",
  "/ai/gpt/status": "/status/openai",
  "/ai/claude/status": "/status/claude",
};
export function activeNavigationRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "/";
  for (const [group, routes] of Object.entries(toolGroups)) {
    if (path === `/${group}` || routes.some((route) => route.path === path))
      return `/${group}/`;
  }
  if (/^\/network\/ip\/[^/]+$/.test(path)) return "/network/";
  return /^\/status(?:\/(?:openai|claude))?$/.test(path)
    ? "/status/"
    : "not-found";
}

export function visibleTools(
  group: keyof typeof toolGroups,
  challengesConfigured: boolean,
) {
  return toolGroups[group].filter(
    (tool) => tool.path !== "/browser/challenges" || challengesConfigured,
  );
}
