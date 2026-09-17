import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import { ActionButton, IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { toolGroups } from "@/layout/routes";
import { companyTypeColors } from "@/lib/ip-badge-colors";
import { ipScoreColor } from "@/lib/ip-score";
import { BrowserSummary } from "@/views/browser/summary";
import { lookupIp } from "@/views/ip/api";
import { PerfectScoreEffects } from "@/views/ip/perfect-score-effects";
import { testConnectivity, type ProbeResult } from "@/views/link/api";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Crown,
  Fingerprint,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getGeo, getBrowserIp, getDomesticIp } from "./api";
import { PlatformSummary } from "./platform-summary";
import { SplitResults } from "./split-results";

export function HomePage() {
  const mobile = useIsMobile();
  const browserTools = useAvailableTools("browser");
  const navigationGroups = [
    { label: t("網絡檢測"), icon: Network, tools: toolGroups.network },
    { label: t("瀏覽器檢測"), icon: Fingerprint, tools: browserTools },
    { label: t("AI 檢測"), icon: Sparkles, tools: toolGroups.ai },
    {
      label: t("服務狀態"),
      icon: Activity,
      tools: [
        { path: "/status/", label: t("全部服務") },
        { path: "/status/openai", label: "OpenAI" },
        { path: "/status/claude", label: "Claude" },
      ],
    },
  ];
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    const filters = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        [
          "home-domestic-ip",
          "browser-ip",
          "split",
          "geoip",
          "lookup-ip-coffee",
          "connectivity",
          "connectivity-progress",
          "ai-preview",
          "service-status",
          "home-dns",
          "home-webrtc",
          "webrtc-diagnostic",
          "home-browser-fingerprint",
        ].includes(String(query.queryKey[0])),
    };
    try {
      await client.cancelQueries(filters);
      await client.resetQueries(filters);
    } finally {
      setRefreshing(false);
    }
  };
  const connectivity = useQueries({
    queries: homeTargets.map((target) => ({
      queryKey: ["connectivity", target.url, 0],
      enabled: false,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        testConnectivity(target.url, signal, (result) =>
          client.setQueryData(["connectivity-progress", target.url, 0], result),
        ),
      retry: false,
      staleTime: 60_000,
    })),
  });
  const orderedTargets = homeTargets.map((target, index) => ({
    target,
    query: connectivity[index],
  }));
  if (
    connectivity.every(
      (query) => !query.isFetching && (query.isSuccess || query.isError),
    )
  ) {
    orderedTargets.sort((a, b) => {
      const left =
        (a.query.data as ProbeResult | undefined)?.median ?? Infinity;
      const right =
        (b.query.data as ProbeResult | undefined)?.median ?? Infinity;
      return left - right;
    });
  }

  const connectivityRef = useSortAnimation(
    `${mobile}-${orderedTargets.map(({ target }) => target.name).join("|")}`,
  );
  useEffect(() => {
    document.title = t("概覽 - IP 網絡工具");
  }, []);
  const probes = useQueries({
    queries: [
      {
        queryKey: ["home-domestic-ip", 3],
        retry: false,
        queryFn: ({ signal }: { signal: AbortSignal }) => getDomesticIp(signal),
      },
      {
        queryKey: ["browser-ip", 4],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getBrowserIp(4, signal),
      },
    ].map((probe) => ({ retry: false, staleTime: 60_000, ...probe })),
  });
  const cards = probes.flatMap((query, index) => {
    // Only dedicated probes belong in the overview; per-site routes stay in SplitResults.
    if (!query.data || query.data.ip.includes(":")) return [];
    if (index === 1 && query.data?.ip === probes[0].data?.ip) return [];
    return [
      {
        query,
        data: query.data,
        version: 4,
        label: index === 0 ? t("IPv4 · 國內探測") : t("IPv4 · 外部探測"),
      },
    ];
  });
  const ips = [
    ...new Set(cards.flatMap(({ data }) => (data ? [data.ip] : []))),
  ];
  const geoQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["geoip", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) => getGeo(ip, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const geoByIp = new Map(ips.map((ip, index) => [ip, geoQueries[index]]));
  const typeQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["lookup-ip-coffee", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        lookupIp(ip, AbortSignal.any([signal, AbortSignal.timeout(3000)])),
      staleTime: 3600_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const typeByIp = new Map(ips.map((ip, index) => [ip, typeQueries[index]]));
  return (
    <div className="home-page">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold">{t("網絡概覽")}</h1>
        <ActionButton
          size="sm"
          variant="outline"
          busy={refreshing}
          onClick={refresh}
        >
          {refreshing ? t("檢測中...") : t("重新檢測")}
        </ActionButton>
      </div>
      <div className="home-overview home-ip-overview">
        {cards.map(({ query, data, version, label }, index) => {
          const pending = !data && query.isPending;
          const geo = data
            ? { ...data, ...geoByIp.get(data.ip)?.data }
            : undefined;
          const classification = data ? typeByIp.get(data.ip) : undefined;
          const company = classification?.isSuccess
            ? classification.data.coffee
            : undefined;
          const score = company?.trust_score;
          const hasScore =
            typeof score === "number" &&
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100;
          const typeLabels = company
            ? [
                company.company_type
                  ? {
                      label: company.company_type,
                      color:
                        companyTypeColors[company.company_type.toLowerCase()] ??
                        "bg-primary/5 text-primary dark:bg-primary/10",
                    }
                  : null,
                company.is_public_service === true
                  ? {
                      label: t("公共服務"),
                      color: "bg-primary/15 text-primary dark:bg-primary/20",
                    }
                  : null,
                company.isResidential === true && !company.is_public_service
                  ? {
                      label: t("家庭住宅 IP"),
                      color: "bg-primary/25 text-primary dark:bg-primary/30",
                    }
                  : null,
                company.is_datacenter === true && !company.is_public_service
                  ? {
                      label: t("機房 IP"),
                      color: "bg-primary/5 text-primary dark:bg-primary/10",
                    }
                  : null,
                company.is_mobile === true
                  ? {
                      label: t("移動網絡"),
                      color: "bg-primary/15 text-primary dark:bg-primary/20",
                    }
                  : null,
                company.is_proxy === true ||
                company.is_vpn === true ||
                company.is_tor === true
                  ? {
                      label: t("代理 / VPN / Tor"),
                      color: "bg-primary/10 text-primary dark:bg-primary/15",
                    }
                  : null,
              ].filter((item) => item !== null)
            : [];
          const loading =
            pending || Boolean(data && geoByIp.get(data.ip)?.isPending);
          return (
            <Card
              key={index}
              className={`home-primary-card relative${score === 100 ? " ip-dossier-perfect" : ""}`}
            >
              {score === 100 && <PerfectScoreEffects />}
              {data && (
                <Link
                  to={`/network/ip/${encodeURIComponent(data.ip)}`}
                  aria-label={`${label} · ${t("IP 信息查詢")}`}
                  className="absolute inset-0 z-10 rounded-[inherit] transition-colors hover:bg-primary/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                />
              )}
              <CardContent className="primary-ip-block">
                <div className="row-between eyebrow">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{label}</span>
                    {typeLabels.map((type) => (
                      <Badge
                        key={type.label}
                        variant="secondary"
                        className={`h-4 px-1.5 text-[10px] font-medium tracking-normal ${type.color}`}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="home-address-row">
                  <div className="ip-value">
                    {pending ? (
                      <Pending>{t("加載中...")}</Pending>
                    ) : geo ? (
                      <>
                        <CountryFlag code={geo.country_code} />
                        <IpText ip={geo.ip} link={false} />
                      </>
                    ) : (
                      <span className="muted">
                        {t("未獲取到 IPv")}
                        {version}
                      </span>
                    )}
                  </div>
                  {hasScore && (
                    <div
                      className={`ip-reputation-badge shrink-0${score === 100 ? " ip-reputation-perfect" : ""}`}
                      style={{ color: ipScoreColor(score) }}
                    >
                      <span
                        className={
                          score === 100 ? "ip-perfect-label" : undefined
                        }
                      >
                        {score === 100 && (
                          <Crown size={13} aria-hidden="true" />
                        )}
                        {score === 100 ? t("滿分信譽") : t("IP 信譽分")}
                      </span>
                      <strong>
                        <NumberTicker value={score} />
                      </strong>
                    </div>
                  )}
                </div>
                <div className="primary-ip-meta text-sm text-muted-foreground">
                  {loading ? (
                    <Pending>{t("正在查詢歸屬信息…")}</Pending>
                  ) : geo?.country || geo?.city || geo?.isp ? (
                    <>
                      <p>
                        {[geo.country, geo.region, geo.city]
                          .filter(Boolean)
                          .filter((item, i, all) => all.indexOf(item) === i)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs">
                        {[geo.isp, geo.asn ? `AS${geo.asn}` : undefined]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </>
                  ) : data ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{t("歸屬信息暫不可用")}</span>
                      <button
                        type="button"
                        className="relative z-20 shrink-0 text-primary"
                        onClick={() => geoByIp.get(data.ip)?.refetch()}
                      >
                        {t("重試")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="home-connectivity-card">
          <CardHeader>
            <div className="row-between">
              <CardTitle>{t("網絡連通性")}</CardTitle>
              <UnderlineHover asChild>
                <Link className="small muted" to="/network/connectivity/">
                  {t("查看更多 ›")}
                </Link>
              </UnderlineHover>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={connectivityRef}>
              <div className="ping-grid">
                {orderedTargets.map(({ target }) => (
                  <ConnectivityTile target={target} key={target.name} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <SplitResults summary />
      <PlatformSummary />
      <BrowserSummary />
      <Card className="home-shortcuts">
        <CardHeader>
          <CardTitle>{t("熱門功能")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/ai/claude" className="shortcut-feature">
            <span className="shortcut-icon">
              <SiteLogo website="https://claude.ai" />
            </span>
            <span className="shortcut-label">
              <strong>{t("Claude 中國用戶檢測")}</strong>
              <span className="shortcut-description">
                {t("檢查語言、時區與設備信號，瞭解瀏覽器暴露的環境特徵。")}
              </span>
            </span>
            <ArrowRight className="shortcut-arrow" aria-hidden="true" />
          </Link>
          <div className="shortcut-grid">
            {[
              {
                path: "/ai/gpt",
                label: t("ChatGPT 檢測"),
                description: t("檢查 AI 服務響應與訪問出口"),
                icon: () => <SiteLogo website="https://chatgpt.com" />,
              },
              {
                path: "/network/connectivity",
                label: t("網站連通與出口"),
                description: t("覈對網站連通性、響應延遲和實際出口"),
                icon: Network,
              },
              {
                path: "/browser/challenges",
                label: t("人機檢測"),
                description: t("體驗驗證碼，查看驗證結果"),
                icon: ShieldCheck,
              },
              {
                path: "/browser/consistency",
                label: t("環境一致性"),
                description: t("覈對瀏覽器環境與設備信號"),
                icon: Search,
              },
              {
                path: "/browser/fingerprint",
                label: t("瀏覽器指紋"),
                description: t("查看指紋組成與變化"),
                icon: Fingerprint,
              },
              {
                path: "/status/",
                label: t("服務狀態"),
                description: t("查看平臺故障與服務動態"),
                icon: Activity,
              },
            ].map((tool) => (
              <Link key={tool.path} to={tool.path}>
                <span className="shortcut-icon">
                  <tool.icon aria-hidden="true" />
                </span>
                <span className="shortcut-label">
                  <strong>{tool.label}</strong>
                  <span className="shortcut-description">
                    {tool.description}
                  </span>
                </span>
                <ArrowRight className="shortcut-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="home-tool-directory">
        <CardHeader>
          <div className="row-between">
            <CardTitle id="home-tool-directory-title">
              {t("全部功能")}
            </CardTitle>
            <UnderlineHover asChild>
              <Link className="small muted" to="/docs/api">
                {t("API 文檔")}
              </Link>
            </UnderlineHover>
          </div>
        </CardHeader>
        <CardContent>
          <nav
            aria-labelledby="home-tool-directory-title"
            className="tool-directory-groups"
          >
            {navigationGroups.map((group) => (
              <section className="tool-directory-group" key={group.label}>
                <h3 className="tool-directory-heading">
                  <group.icon aria-hidden="true" />
                  {group.label}
                </h3>
                <ul className="tool-directory-links">
                  {group.tools.map((tool) => (
                    <li key={tool.path}>
                      <Link to={tool.path}>{tool.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
export default HomePage;
