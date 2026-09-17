import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending, ActionButton } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import type { Geo } from "@/lib/types";
import { useQueries } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getGeo, inspectSite, type Site } from "./api";
import { matchesSiteCategory } from "./category-status";
import { ExitGroups, type SiteFilter } from "./exit-groups";
import rawsites from "./sites.json";

const sites = rawsites.map((item) => ({ ...item, name: t(item.name) }));

interface Row extends Site {
  onDetail: (name: string) => void;
  visible: boolean;
  geo?: Geo;
  pending: boolean;
  reachable?: boolean;
  geoPending: boolean;
}

const categoryLabels: Record<string, string> = {
  ai: "AI 服務",
  crypto: "加密貨幣",
  ecommerce: "跨境電商",
  media: "流媒體",
  social: "社交社區",
  dev: "開發平臺",
  tools: "實用工具",
  static: "靜態資源",
  speed: "測速服務",
};

function SiteEgressTable({
  rows,
  filter,
  onClearFilter,
}: {
  rows: Row[];
  filter: SiteFilter | null;
  onClearFilter: () => void;
}) {
  const tableId = useId();
  const [expanded, setExpanded] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const rowKey = rows.map((row) => row.name).join("|");
  const fadeRef = useRef<HTMLDivElement>(null);
  const canToggle = rows.length > 5;
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const tableRows = Array.from(body.rows);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gsap.killTweensOf(tableRows);
    gsap.set(tableRows, { filter: "none" });
    if (reduced) {
      gsap.set(tableRows, { opacity: 1, y: 0 });
      return;
    }
    const tween = gsap.fromTo(
      tableRows,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.22,
        stagger: 0.015,
        ease: "power2.out",
        clearProps: "opacity,transform",
      },
    );
    return () => {
      tween.kill();
    };
  }, [rowKey]);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const table = tableRef.current;
    const body = bodyRef.current;
    const fade = fadeRef.current;
    if (!viewport || !table || !body) return;
    const tableRows = Array.from(body.rows);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fullHeight = table.getBoundingClientRect().height;
    const headerHeight = table.tHead?.getBoundingClientRect().height ?? 0;
    const rowHeight = tableRows[0]?.getBoundingClientRect().height ?? 48;
    const collapsedHeight = Math.min(
      fullHeight,
      headerHeight + rowHeight * 5.75,
    );
    const collapsed = canToggle && !expanded;
    const targetHeight = collapsed ? collapsedHeight : fullHeight;
    const blurredRows = tableRows.slice(5);
    gsap.killTweensOf(viewport);
    if (fade) gsap.killTweensOf(fade);
    if (reduced) {
      gsap.set(viewport, { height: collapsed ? targetHeight : "auto" });
      gsap.set(blurredRows, { filter: "none", opacity: 1 });
      if (fade) gsap.set(fade, { autoAlpha: 0 });
      return;
    }
    const timeline = gsap.timeline();
    timeline.to(
      viewport,
      {
        height: targetHeight,
        duration: 0.42,
        ease: "power2.inOut",
        onComplete: () => {
          if (!collapsed) gsap.set(viewport, { clearProps: "height" });
        },
      },
      0,
    );
    timeline.to(
      blurredRows,
      {
        filter: collapsed ? "blur(2.5px)" : "blur(0px)",
        opacity: collapsed ? 0.62 : 1,
        duration: 0.28,
        stagger: 0.012,
        ease: "power2.out",
      },
      0.08,
    );
    if (fade)
      timeline.to(fade, { autoAlpha: collapsed ? 1 : 0, duration: 0.28 }, 0.1);
    return () => {
      timeline.kill();
    };
  }, [canToggle, expanded, rowKey]);
  return (
    <Card className="split-table-card mb-3 gap-0 rounded-lg py-0">
      <CardHeader className="split-table-header">
        <div className="row-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle>{t("網站訪問明細")}</CardTitle>
              <span className="split-table-count">
                {rows.length} {t("個站點")}
              </span>
            </div>
            {filter && (
              <p className="split-table-filter">
                {t(filter.kind === "site" ? "網站" : "IP")} · {filter.value}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {filter && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={onClearFilter}
              >
                {t("清除篩選")}
              </Button>
            )}
            {canToggle && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs"
                aria-expanded={expanded}
                aria-controls={tableId}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
                {expanded ? t("收起全部") : t("展開全部")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={viewportRef}
          className="split-table-viewport"
          data-expanded={expanded || !canToggle}
        >
          <div className="data-table split-table">
            <table ref={tableRef} id={tableId}>
              <thead>
                <tr>
                  <th>{t("網站")}</th>
                  <th>{t("訪問狀態")}</th>
                  <th>{t("IP")}</th>
                  <th>{t("歸屬地")}</th>
                </tr>
              </thead>
              <tbody ref={bodyRef}>
                {rows.map((row) => {
                  const location = row.geo
                    ? [
                        row.geo.country,
                        row.geo.region,
                        row.geo.city,
                        row.geo.isp,
                        row.geo.asn
                          ? `AS${String(row.geo.asn).replace(/^AS/i, "")}`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .filter(
                          (value, index, all) => all.indexOf(value) === index,
                        )
                        .join(" · ")
                    : "";
                  const status = row.pending
                    ? t("檢測中…")
                    : row.reachable === false
                      ? t("網站訪問受阻")
                      : row.reachable === true
                        ? t("網站可訪問")
                        : t("等待檢測");
                  return (
                    <tr key={row.name}>
                      <td>
                        <button
                          type="button"
                          className="site-cell w-full overflow-hidden text-left hover:text-primary"
                          title={status}
                          onClick={() => row.onDetail(row.name)}
                        >
                          <SiteLogo src={row.icon} />
                          <span className="min-w-0 truncate">{row.name}</span>
                          <Badge
                            variant="secondary"
                            className={
                              row.type === "domestic"
                                ? "tag-domestic"
                                : "tag-international"
                            }
                          >
                            {t(row.type === "domestic" ? "國內" : "國際")}
                          </Badge>
                          {row.extra?.map((category) => (
                            <Badge key={category} variant="secondary">
                              {t(categoryLabels[category] ?? category)}
                            </Badge>
                          ))}
                        </button>
                      </td>
                      <td>
                        {row.pending ? (
                          <Pending>{t("檢測中…")}</Pending>
                        ) : row.reachable === false ? (
                          <span className="text-destructive">
                            {t("網站訪問受阻")}
                          </span>
                        ) : row.reachable === true ? (
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {t("網站可訪問")}
                          </span>
                        ) : (
                          <span className="muted">{t("等待檢測")}</span>
                        )}
                      </td>
                      <td>
                        {row.geo ? (
                          <IpText ip={row.geo.ip} />
                        ) : row.reachable === true ? (
                          <span className="muted">{t("出口不可讀")}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {row.geoPending ? (
                          <Pending>{t("查詢中…")}</Pending>
                        ) : location ? (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <CountryFlag code={row.geo?.country_code} />
                            <CompactText text={location} />
                          </div>
                        ) : (
                          <span className="muted">{t("歸屬信息暫不可用")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div ref={fadeRef} className="split-table-fade" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SplitResults({ summary = false }: { summary?: boolean }) {
  const [round, setRound] = useState(0);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailIp, setDetailIp] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<SiteFilter | null>(null);
  const [visibleSites, setVisibleSites] = useState<Set<string>>(
    () => new Set(),
  );
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleSites(new Set(sites.map((site) => site.name)));
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [summary]);
  const inspectionQueries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ["split", site.name, round],
      enabled: visibleSites.has(site.name),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        inspectSite(site, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const ips = [
    ...new Set(
      [
        ...inspectionQueries.filter((_, index) =>
          visibleSites.has(sites[index].name),
        ),
      ].flatMap((query) => (query.data?.geo ? [query.data.geo.ip] : [])),
    ),
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
  const rows: Row[] = sites.map((site, i) => ({
    ...site,
    onDetail: setDetailName,
    visible: visibleSites.has(site.name),
    geo: inspectionQueries[i].data?.geo
      ? {
          ...inspectionQueries[i].data.geo,
          ...geoByIp.get(inspectionQueries[i].data.geo.ip)?.data,
        }
      : undefined,
    pending: inspectionQueries[i].isFetching || inspectionQueries[i].isPending,
    reachable: inspectionQueries[i].data?.reachable,
    geoPending:
      inspectionQueries[i].isPending ||
      Boolean(
        inspectionQueries[i].data?.geo &&
        geoByIp.get(inspectionQueries[i].data.geo.ip)?.isPending,
      ),
  }));
  const groupedRows = [...rows].sort((a, b) => {
    const aBlocked = a.visible && !a.pending && a.reachable === false;
    const bBlocked = b.visible && !b.pending && b.reachable === false;
    return Number(bBlocked) - Number(aBlocked);
  });
  const categoryRows = rows.filter((row) => matchesSiteCategory(row, category));
  const filteredRows = filter
    ? categoryRows.filter((row) =>
        filter.kind === "site"
          ? row.name === filter.value
          : row.geo?.ip === filter.value,
      )
    : categoryRows;
  const exits = [
    ...new Map(
      rows.flatMap((row) => (row.geo ? [[row.geo.ip, row.geo] as const] : [])),
    ).values(),
  ];
  const detail = rows.find((row) => row.name === detailName);
  const pending = inspectionQueries.some((query) => query.isFetching);
  const Container = summary ? Card : "div";
  const Content = summary ? CardContent : "div";
  return (
    <Container ref={container} className="mb-3">
      {summary && (
        <CardHeader>
          <div className="row-between">
            <CardTitle>{t("網站分流出口")}</CardTitle>
            {summary && (
              <Link className="small muted" to="/network/connectivity">
                {t("查看全部 ›")}
              </Link>
            )}
          </div>
        </CardHeader>
      )}
      <Content>
        {summary ? (
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-2">
            {exits.map((geo) => (
              <div
                key={geo.ip}
                className="flex min-w-0 items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
              >
                <CountryFlag code={geo.country_code} />
                <span className="min-w-0 flex-1">
                  <IpText ip={geo.ip} />
                </span>
                <UnderlineHover asChild>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => {
                      setDetailName(null);
                      setDetailIp(geo.ip);
                    }}
                  >
                    {rows.filter((row) => row.geo?.ip === geo.ip).length}
                    {t("個站點")}
                  </button>
                </UnderlineHover>
              </div>
            ))}
            <p className="home-note col-span-full pt-1">
              {pending ? (
                <Pending>{t("正在檢測分流出口…")}</Pending>
              ) : (
                t("已讀取 {0}/{1} 個站點的出口{2}", [
                  rows.filter((row) => row.geo).length,
                  sites.length,
                  !exits.length ? t("，暫無可顯示結果") : "",
                ])
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="split-results-heading">
              <div className="min-w-0 flex items-baseline gap-2">
                <h2>{t("網站分流出口")}</h2>
                {filter && (
                  <span>
                    {t(filter.kind === "site" ? "網站" : "IP")} · {filter.value}
                  </span>
                )}
              </div>
              <ActionButton
                size="sm"
                busy={pending}
                onClick={() => {
                  setDetailName(null);
                  setDetailIp(null);
                  setFilter(null);
                  setVisibleSites(new Set(sites.map((site) => site.name)));
                  setRound((value) => value + 1);
                }}
              >
                {pending ? t("檢測中...") : t("重新檢測")}
              </ActionButton>
            </div>
            <ExitGroups
              rows={groupedRows}
              category={category}
              onCategoryChange={(value) => {
                setCategory(value);
                setFilter(null);
              }}
              onSelect={setDetailName}
              onFilter={setFilter}
              activeFilter={filter}
            />
            <SiteEgressTable
              rows={filteredRows}
              filter={filter}
              onClearFilter={() => setFilter(null)}
            />
          </>
        )}
      </Content>
      <ResponsiveDialog
        open={detailName !== null || detailIp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailName(null);
            setDetailIp(null);
          }
        }}
        title={detail?.name ?? t("出口站點")}
        description={
          detail
            ? t("該站點觀察到的出口信息。")
            : t("使用此出口的站點，點擊名稱查看詳情。")
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <p className="break-all text-muted-foreground">
              {detail.domain ?? detail.url ?? detail.name}
            </p>
            <div>
              {t("出口 IP：")}
              {detail.geo?.ip ? (
                <IpText ip={detail.geo.ip} />
              ) : (
                t("未讀取到出口 IP")
              )}
            </div>
            <p>
              {[detail.geo?.country, detail.geo?.city, detail.geo?.isp]
                .filter(Boolean)
                .join(" · ") || t("歸屬信息暫不可用")}
            </p>
            <p className="text-muted-foreground">
              {detail.pending
                ? t("檢測中…")
                : detail.reachable === false
                  ? t("網站訪問受阻")
                  : detail.geo
                    ? t("已讀取出口")
                    : t(detail.note ?? "網站可訪問，但未能讀取出口 IP")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <IpText ip={detailIp ?? undefined} />
            <div className="flex flex-wrap gap-2">
              {rows
                .filter((row) => row.geo?.ip === detailIp)
                .map((row) => (
                  <Badge
                    key={row.name}
                    variant="secondary"
                    className="h-auto max-w-full gap-1.5 px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground [&_.site-icon]:size-3.5"
                    asChild
                  >
                    <button
                      type="button"
                      onClick={() => setDetailName(row.name)}
                    >
                      <SiteLogo src={row.icon} />
                      <span className="min-w-0 truncate">{row.name}</span>
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </Container>
  );
}
