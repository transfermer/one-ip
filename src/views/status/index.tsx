import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatedValue } from "@/components/animated-value";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import {
  PageHeading,
  Pending,
  ToolCard,
  DataTable,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { t, locale } from "@/i18n";
import { useQueries } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getStatus } from "./api";
import { statusOrder } from "./order";
import rawservices from "./services.json";

const services = rawservices.map((item) => ({
  ...item,
  name: t(item.name),
  note: item.note ? t(item.note) : item.note,
}));

const componentLabels: Record<string, string> = {
  operational: t("正常運行"),
  degraded_performance: t("性能下降"),
  partial_outage: t("部分故障"),
  major_outage: t("嚴重故障"),
  under_maintenance: t("維護中"),
};
const labels: Record<string, string> = {
  none: t("正常運行"),
  minor: t("輕微故障"),
  major: t("嚴重故障"),
  critical: t("重大故障"),
  maintenance: t("維護中"),
};
export default function StatusPage() {
  const mobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(() => {
    const id = params.get("service");
    return services.some((service) => service.id === id) ? id : null;
  });
  const filter = params.get("group") ?? "全部";
  const queries = useQueries({
    queries: services.map((s) => ({
      queryKey: ["service-status", s.id],
      enabled: Boolean(s.url),
      queryFn: ({ signal }: { signal: AbortSignal }) => getStatus(s.id, signal),
      retry: false,
      staleTime: 60_000,
      refetchInterval: 120_000,
    })),
  });
  const pending = queries.some((q) => q.isFetching);
  const rows = services
    .map((service, i) => ({ ...service, query: queries[i] }))
    .filter((s) => filter === "全部" || s.group === filter);
  const sections = [
    [
      t("故障 / 維護"),
      rows
        .filter((s) => statusOrder(s.query.data?.status?.indicator) === 0)
        .sort((a, b) => {
          const severity = ["critical", "major", "minor", "maintenance"];
          return (
            severity.indexOf(a.query.data!.status.indicator) -
            severity.indexOf(b.query.data!.status.indicator)
          );
        }),
    ],
    [
      t("運行中"),
      rows.filter((s) => s.query.data?.status?.indicator === "none"),
    ],
    [
      t("待確認"),
      rows.filter((s) => statusOrder(s.query.data?.status?.indicator) === 2),
    ],
  ] as const;
  const tableRows = sections.flatMap(([, items]) =>
    items.map((service) => ({
      id: service.id,
      name: service.name,
      group: service.group,
      page: service.page,
      icon: service.icon,
      data: service.query.data,
      loading: Boolean(service.url) && service.query.isPending,
      integrated: Boolean(service.url),
      officialStatus: service.officialStatus !== false,
      statusSource:
        "statusSource" in service ? service.statusSource : undefined,
      note: service.note,
      fetching: service.query.isFetching,
      error: service.query.error?.message,
    })),
  );
  const columns: ColumnDef<(typeof tableRows)[number]>[] = [
    {
      accessorKey: "name",
      header: t("服務"),
      cell: ({ row }) => (
        <button
          type="button"
          className="service-name text-left text-primary focus-visible:outline-ring"
          onClick={() => setDetailId(row.original.id)}
          aria-label={t("查看 {0} 詳情", [row.original.name])}
        >
          <SiteLogo src={row.original.icon} website={row.original.page} />
          <UnderlineHover className="truncate">
            {row.original.name}
          </UnderlineHover>
          {!!row.original.data?.incidents?.length && (
            <Badge variant="secondary" className="shrink-0">
              {row.original.data.incidents.length}
              {t("個事件")}
            </Badge>
          )}
        </button>
      ),
    },
    {
      accessorKey: "group",
      header: t("分類"),
      cell: ({ row }) => (
        <Badge variant="secondary">{t(row.original.group)}</Badge>
      ),
    },
    {
      id: "status",
      header: t("狀態"),
      cell: ({ row }) => {
        const service = row.original;
        const indicator = service.data?.status?.indicator;
        return (
          <button
            type="button"
            onClick={() => setDetailId(service.id)}
            aria-label={t("查看 {0} 狀態詳情", [service.name])}
            className={`service-table-state service-card service-${indicator ?? "unknown"}`}
          >
            <i
              className={`service-dot ${service.fetching ? "service-dot-loading" : ""}`}
            />
            <AnimatedValue value={`${service.loading}-${indicator}`}>
              {service.loading ? (
                <Pending>{t("查詢中...")}</Pending>
              ) : !service.integrated ? (
                t("未接入")
              ) : (
                (labels[indicator ?? ""] ?? t("未知"))
              )}
            </AnimatedValue>
          </button>
        );
      },
    },
    {
      id: "updated",
      header: t("更新時間"),
      cell: ({ row }) => (
        <span className="small muted">
          {row.original.data?.fetchedAt
            ? new Date(row.original.data.fetchedAt).toLocaleTimeString(locale)
            : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <UnderlineHover asChild>
          <a
            href={row.original.page}
            target="_blank"
            rel="noreferrer"
            className="small"
          >
            {row.original.statusSource
              ? t("第三方 · {0} ↗", [row.original.statusSource])
              : row.original.officialStatus
                ? t("官方狀態 ↗")
                : t("平臺官網 ↗")}
          </a>
        </UnderlineHover>
      ),
    },
  ];
  const detail = tableRows.find((service) => service.id === detailId);
  return (
    <div className="service-status-page">
      <PageHeading
        title={t("服務狀態")}
        description={t("各服務運行狀態與故障事件，第三方來源單獨標註")}
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {["全部", "AI", "VPS", "雲服務", "開發", "社區"].map((group) => (
            <Button
              size="sm"
              variant={group === filter ? "secondary" : "ghost"}
              key={t(group)}
              onClick={() => setParams(group === "全部" ? {} : { group })}
            >
              {t(group)}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending}
          onClick={() => {
            void Promise.all(
              queries
                .filter((_, index) => services[index].url)
                .map((q) => q.refetch()),
            );
          }}
        >
          {pending ? <Pending>{t("刷新中…")}</Pending> : t("刷新狀態")}
        </Button>
      </div>
      <div className="service-summary">
        {sections.map(([label, items], index) => (
          <ToolCard
            key={label}
            title={
              <span className="block truncate" title={label}>
                {locale === "en"
                  ? ["Issues", "Healthy", "Unknown"][index]
                  : label}
              </span>
            }
            className={`service-summary-card summary-${index}`}
          >
            <div className="service-summary-number">
              <NumberTicker value={items.length} />
              <span>{t("個服務")}</span>
            </div>
          </ToolCard>
        ))}
      </div>
      {mobile ? (
        <div className="space-y-3">
          {sections.map(
            ([label, items]) =>
              items.length > 0 && (
                <Card key={label}>
                  <CardContent>
                    <h2 className="mb-1 text-xs font-medium text-muted-foreground">
                      {label} · {items.length}
                    </h2>
                    <div className="divide-y divide-border/50">
                      {items.map((service) => {
                        const indicator = service.query.data?.status?.indicator;
                        const incident = service.query.data?.incidents?.[0];
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => setDetailId(service.id)}
                            className="block w-full py-3 text-left"
                            aria-label={t("查看 {0} 詳情", [service.name])}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                                <SiteLogo
                                  src={service.icon}
                                  website={service.page}
                                />
                                <span className="truncate">
                                  {service.name.replace(" (Anthropic)", "")}
                                </span>
                              </span>
                              <span
                                className={`service-card service-${indicator ?? "unknown"} shrink-0 text-xs`}
                              >
                                {service.query.isFetching && !service.query.data
                                  ? t("查詢中")
                                  : !service.url
                                    ? t("未接入")
                                    : (labels[indicator ?? ""] ?? t("待確認"))}
                              </span>
                            </span>
                            {incident && (
                              <span className="mt-1 block truncate text-xs text-muted-foreground">
                                {incident.name}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ),
          )}
        </div>
      ) : (
        <div className="service-table">
          <Card>
            <CardContent>
              <DataTable
                data={tableRows}
                columns={columns}
                getRowId={(row) => row.id}
                animateChanges={false}
                empty={t("暫無服務")}
              />
            </CardContent>
          </Card>
        </div>
      )}
      <p className="small muted">
        {t("每 2 分鐘自動檢查。未知或查詢失敗不等於服務故障。")}
      </p>
      <ResponsiveDialog
        title={t("{0} · 服務詳情", [detail?.name ?? t("服務")])}
        description={
          detail?.loading
            ? t("正在查詢服務狀態…")
            : t(
                detail?.error ??
                  detail?.note ??
                  detail?.data?.status?.description ??
                  t("暫無說明"),
              )
        }
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        {detail && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {!detail.integrated
                ? t("未接入")
                : (labels[detail.data?.status?.indicator ?? ""] ?? t("未知"))}
            </Badge>
            <span>{t(detail.group)}</span>
            {detail.statusSource && (
              <span>{t("第三方 · {0} ↗", [detail.statusSource])}</span>
            )}
            {detail.data?.checkedAt && (
              <time>
                {t("來源檢測時間：{0}", [
                  new Date(detail.data.checkedAt).toLocaleString(locale),
                ])}
              </time>
            )}
            {detail.data?.fetchedAt && (
              <time>
                {t("更新於")}
                {new Date(detail.data.fetchedAt).toLocaleString(locale)}
              </time>
            )}
          </div>
        )}
        {!!detail?.data?.components?.length && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("服務組件")}</h3>
            <dl className="divide-y divide-border text-sm">
              {detail.data.components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <dt className="min-w-0 break-words">{component.name}</dt>
                  <dd className="shrink-0 text-muted-foreground">
                    {componentLabels[component.status] ?? component.status}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <h3 className="text-sm font-medium">{t("當前事件")}</h3>
        {!detail?.loading &&
          !detail?.error &&
          detail?.data &&
          Array.isArray(detail.data.incidents) &&
          !detail.data.incidents.length && (
            <p className="text-sm text-muted-foreground">
              {t("數據源未報告當前事件。")}
            </p>
          )}
        {detail?.data && !detail.data.incidents && (
          <p className="text-sm text-muted-foreground">
            {t("此數據源僅提供彙總狀態，事件詳情請查看來源頁面。")}
          </p>
        )}
        {detail?.data?.incidents?.map((incident) => (
          <section
            key={incident.id}
            className="space-y-2 rounded-lg bg-muted/50 p-3"
          >
            <h3 className="font-medium">{incident.name}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{incident.status}</Badge>
              {incident.updated_at && (
                <time>
                  {new Date(incident.updated_at).toLocaleString(locale)}
                </time>
              )}
            </div>
          </section>
        ))}
        {detail && (
          <a
            className="text-sm underline underline-offset-4"
            href={detail.page}
            target="_blank"
            rel="noreferrer"
          >
            {detail.statusSource
              ? t("第三方 · {0} ↗", [detail.statusSource])
              : detail.officialStatus
                ? t("查看官方狀態頁 ↗")
                : t("前往平臺官網 ↗")}
          </a>
        )}
      </ResponsiveDialog>
    </div>
  );
}
