import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "@/components/copy-button";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { IpText, ToolCard, DataTable, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { ipScoreColor } from "@/lib/ip-score";
import type { Geo } from "@/lib/types";
import { hideIpAtom } from "@/store/privacy";
import { useAtom } from "jotai";
import { Crown, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { coffeeThreatLabels, type CoffeeLookup } from "./coffee";
import { IpFacts } from "./field-help";
import { IpLatency } from "./latency";
import { LocationMap } from "./location-map";
import { PerfectScoreEffects } from "./perfect-score-effects";
import { ipProfile } from "./profile";
import { useIpLatency } from "./use-ip-latency";

const IpProfileGraph = lazy(() => import("./profile-graph"));
const IpRouteGraph = lazy(() => import("./route-graph"));
const IpReputationScale = lazy(() =>
  import("./profile-graph").then((module) => ({
    default: module.IpReputationScale,
  })),
);

export function IpDetails({
  data,
  search,
  recent,
}: {
  data: CoffeeLookup;
  search?: ReactNode;
  recent?: ReactNode;
}) {
  const mobile = useIsMobile();
  const [hidden, setHidden] = useAtom(hideIpAtom);
  const d = data.coffee;
  const threats = coffeeThreatLabels(d, true);
  const profile = useMemo(() => ipProfile(d), [d]);
  const inbound = useIpLatency(d.ip);
  const chip = (label: string, tone = "neutral", title?: string) => (
    <span className={`ip-chip ip-chip-${tone}`} title={title}>
      {label}
    </span>
  );
  const yesNo = (value?: boolean) =>
    chip(typeof value !== "boolean" ? t("未知") : value ? t("是") : t("否"));
  const riskFlag = (value?: boolean) =>
    typeof value !== "boolean"
      ? chip(t("未知"))
      : value
        ? chip(t("已檢測到"), "bad")
        : chip(t("未檢測到"), "good");
  const number = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) ? (
      <NumberTicker
        value={value}
        formatValue={(v) => Math.round(v).toLocaleString()}
      />
    ) : (
      "—"
    );
  const seen = (value?: number) =>
    value ? new Date(value * 1000).toLocaleDateString() : "—";
  const score =
    typeof d.trust_score === "number" &&
    Number.isFinite(d.trust_score) &&
    d.trust_score >= 0 &&
    d.trust_score <= 100
      ? d.trust_score
      : null;
  const rpki: Record<string, string> = {
    valid: t("有效"),
    invalid: t("無效"),
    notfound: t("未聲明 ROA"),
    unknown: t("未知"),
  };
  return (
    <div className="ip-dossier">
      <div
        className={`ip-dossier-top${score === 100 ? " ip-dossier-perfect" : ""}`}
      >
        {score === 100 && <PerfectScoreEffects />}
        <div className="ip-dossier-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-all text-xl font-semibold">
                <IpText ip={d.ip} link={false} />
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={hidden ? t("顯示 IP 地址") : t("隱藏 IP 地址")}
                  title={hidden ? t("顯示 IP 地址") : t("隱藏 IP 地址")}
                  aria-pressed={hidden}
                  onClick={() => setHidden((value) => !value)}
                >
                  {hidden ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </Button>
                <CopyButton value={d.ip} />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CountryFlag code={data.geo.country_code} />
              <span>
                {[d.country, d.region, d.city, d.isp]
                  .filter(Boolean)
                  .filter((v, i, all) => all.indexOf(v) === i)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <div
            className={`ip-reputation-badge${score === 100 ? " ip-reputation-perfect" : ""}`}
            style={{ color: ipScoreColor(score) }}
          >
            <span className={score === 100 ? "ip-perfect-label" : undefined}>
              {score === 100 && <Crown size={13} aria-hidden="true" />}
              {score === 100 ? t("滿分信譽") : t("IP 信譽分")}
            </span>
            <strong>
              {score == null ? "—" : <NumberTicker value={score} />}
            </strong>
          </div>
        </div>
        <Suspense fallback={<div className="ip-reputation-scale" />}>
          <IpReputationScale profile={profile} />
        </Suspense>
        {search}
        {recent}
      </div>
      {profile.risk && (
        <div
          className="ip-risk-notice"
          data-severity={profile.risk.severity}
          role="alert"
        >
          <ShieldAlert size={20} aria-hidden="true" />
          <div>
            <strong>{profile.risk.title}</strong>
            {!!profile.risk.flags.length && (
              <ul>
                {profile.risk.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            )}
            <p>{profile.risk.description}</p>
          </div>
        </div>
      )}
      <Suspense
        fallback={
          <ToolCard title={t("IP 畫像")}>
            <div className="ip-profile-loading">
              <Pending>{t("正在加載圖譜…")}</Pending>
            </div>
          </ToolCard>
        }
      >
        <IpProfileGraph
          key={d.ip}
          data={d}
          profile={profile}
          inbound={inbound}
        />
      </Suspense>
      <div className="ip-dossier-grid">
        <ToolCard title={t("網絡屬性")}>
          <IpFacts
            rows={[
              [t("註冊國家"), d.registered_country],
              [t("數據中心"), yesNo(d.is_datacenter)],
              [t("移動網絡"), yesNo(d.is_mobile)],
              [t("企業信息"), d.company_name],
              [t("機房名稱"), d.datacenter_name || "—"],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ASN / 運營商")}>
          <IpFacts
            rows={[
              ["ASN", d.asn ? `AS${d.asn}` : undefined],
              [t("服務商"), d.isp],
              [t("ASN 歸屬"), d.asname],
              [t("ASN 組織"), d.asOrganization],

              ["CIDR", d.cidr],
              [t("ASN 自報類型"), d.asn_kind],
              [t("ASN IPv4 總量"), number(d.asn_ipv4_count)],
              [t("ASN 註冊日期"), d.asn_allocated],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("技術指標")}>
          <IpFacts
            rows={[
              [t("地址類型"), d.ip.includes(":") ? "IPv6" : "IPv4"],
              [
                t("IP 範圍"),
                d.range?.first && d.range?.last
                  ? `${d.range.first} – ${d.range.last}`
                  : undefined,
              ],
              [t("地址數量"), number(d.range?.count)],
              [t("預估帶寬"), d.asn_tbps],
              ["Bogon", riskFlag(d.is_bogon)],
              [t("Reddit 限制"), riskFlag(d.reddit_blocked)],
              ["PTR", d.rdns || "—"],
              [
                "RPKI",
                d.rpki_status
                  ? (rpki[d.rpki_status.toLowerCase()] ?? d.rpki_status)
                  : t("未知"),
              ],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("風險深度檢測")}>
          <IpFacts
            rows={[
              ["VPN", riskFlag(d.is_vpn)],
              [t("代理"), riskFlag(d.is_proxy)],
              ["Tor", riskFlag(d.is_tor)],
              [t("爬蟲標記"), riskFlag(d.is_crawler)],
              [t("濫用標記"), riskFlag(d.is_abuser)],
              [
                t("濫用評分"),
                d.intelligence?.abuser_score_raw ?? d.abuser_score,
              ],
            ]}
          />
        </ToolCard>
      </div>
      <ToolCard title={t("IP 情報（威脅指標）")}>
        <IpFacts
          rows={[
            [
              t("風險標記"),
              Array.isArray(d.intelligence?.threats)
                ? threats.length
                  ? chip(threats.join(" · "), "bad")
                  : chip(t("未發現明顯威脅"), "good")
                : chip(t("未知")),
            ],
            [t("濫用等級"), d.intelligence?.abuser_level],
            [
              t("HTTP 蜜罐黑名單"),
              d.intelligence?.rep_threat == null
                ? chip(t("未知"))
                : JSON.stringify(d.intelligence.rep_threat),
            ],
            [
              t("VPN 線索"),
              d.vpn_trace == null
                ? "—"
                : typeof d.vpn_trace === "string"
                  ? d.vpn_trace
                  : JSON.stringify(d.vpn_trace),
            ],
            [t("訪問評估"), d.ai_verdict?.label],
            [
              t("評估置信度"),
              d.ai_verdict?.confidence == null ? (
                "—"
              ) : (
                <span key="confidence">{number(d.ai_verdict.confidence)}%</span>
              ),
            ],
            [t("評估依據"), d.ai_verdict?.reasoning],
          ]}
        />
      </ToolCard>
      <ToolCard title={t("地理位置 · 多源對比")}>
        {mobile ? (
          data.sources.length ? (
            <ul className="ip-geo-mobile">
              {data.sources.map((source, index) => (
                <li key={`${source.source}-${index}`}>
                  <span className="ip-geo-source">{source.source}</span>
                  <div className="ip-geo-place">
                    <CountryFlag code={source.country_code} />
                    <span>
                      {[source.country, source.region, source.city]
                        .filter(Boolean)
                        .filter((value, i, all) => all.indexOf(value) === i)
                        .join(" · ") || t("未知")}
                    </span>
                  </div>
                  {source.latitude != null && source.longitude != null && (
                    <p>
                      {t("緯度")} {source.latitude} · {t("經度")}{" "}
                      {source.longitude}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("未獲取到歸屬地數據")}
            </p>
          )
        ) : (
          <DataTable<Geo>
            className="ip-geo-table"
            columns={[
              { accessorKey: "source", header: t("數據來源") },
              { accessorKey: "country", header: t("國家 / 地區") },
              { accessorKey: "region", header: t("地區") },
              {
                accessorKey: "city",
                header: t("城市"),
                cell: ({ row }) => (
                  <span className="ip-geo-city" title={row.original.city}>
                    {row.original.city ?? "—"}
                  </span>
                ),
              },
              { accessorKey: "latitude", header: t("緯度") },
              { accessorKey: "longitude", header: t("經度") },
            ]}
            data={data.sources}
            empty={t("未獲取到歸屬地數據")}
          />
        )}
      </ToolCard>
      <IpLatency measurement={inbound} />
      <LocationMap
        geo={
          data.sources.find(
            (source) =>
              source.latitude != null &&
              source.longitude != null &&
              source.latitude === data.geo.latitude &&
              source.longitude === data.geo.longitude,
          ) ?? data.geo
        }
      />
      {!!d.related_domains?.length && (
        <ToolCard title={t("關聯域名")}>
          <IpFacts
            rows={d.related_domains.map((item) => [item.domain, item.via])}
          />
        </ToolCard>
      )}
      <div className="ip-dossier-grid">
        {!!d.location_history?.length && (
          <ToolCard title={t("位置歷史")}>
            <IpFacts
              rows={d.location_history.map((row) => [
                seen(row.seen_at),
                [row.country, row.region, row.city].filter(Boolean).join(" · "),
              ])}
            />
          </ToolCard>
        )}
        {!!d.asn_history?.length && (
          <ToolCard title={t("ASN 歷史")}>
            <IpFacts
              rows={d.asn_history.map((row) => [
                seen(row.seen_at),
                `AS${row.asn ?? "—"} · ${row.asn_org ?? "—"}`,
              ])}
            />
          </ToolCard>
        )}
        {!!d.company_history?.length && (
          <ToolCard title={t("企業歷史")}>
            <IpFacts
              rows={d.company_history.map((row) => [
                seen(row.seen_at),
                [row.company_name, row.company_type]
                  .filter(Boolean)
                  .join(" · "),
              ])}
            />
          </ToolCard>
        )}
      </div>
      {!!d.dc_neighbors?.length && (
        <ToolCard title={t("關聯網絡地址")}>
          {mobile ? (
            <ul className="divide-y divide-border/60">
              {d.dc_neighbors.map((row, index) => (
                <li
                  key={`${row.ip}-${index}`}
                  className="min-w-0 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 text-sm font-semibold">
                      <IpText ip={row.ip} />
                    </span>
                    <time
                      className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
                      aria-label={t("記錄時間")}
                    >
                      {seen(row.seen_at)}
                    </time>
                  </div>
                  {row.city && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.city}
                    </p>
                  )}
                  {row.company && (
                    <p className="mt-1 break-words text-xs leading-relaxed">
                      {row.company}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "ip",
                  header: "IP",
                  cell: ({ row }) => <IpText ip={row.original.ip} />,
                },
                { accessorKey: "city", header: t("城市") },
                { accessorKey: "company", header: t("企業信息") },
                {
                  accessorKey: "seen_at",
                  header: t("記錄時間"),
                  cell: ({ row }) => seen(row.original.seen_at),
                },
              ]}
              data={d.dc_neighbors}
            />
          )}
        </ToolCard>
      )}
      <Suspense
        fallback={
          <ToolCard title={t("BGP 路由拓撲")}>
            <div className="ip-route-graph-state">
              <Pending>{t("正在讀取路由數據…")}</Pending>
            </div>
          </ToolCard>
        }
      >
        <IpRouteGraph
          ip={d.ip}
          currentAsn={d.asn}
          currentAsnName={d.asOrganization ?? d.asname}
        />
      </Suspense>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/network/ping/?host=${encodeURIComponent(d.ip)}`}>
            {t("全球延遲測試")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
