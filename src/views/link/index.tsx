import { useEffect, useState, useRef, useCallback } from "react";
import { CountryFlag } from "@/components/country-flag";
import { LatencyBadge } from "@/components/latency-badge";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import { ActionButton, DataTable } from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { SplitResults } from "@/views/home/split-results";
import { skipToken, useQueries, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtom } from "jotai";
import { testConnectivity, type ProbeResult } from "./api";
import { connectivityRoundAtom } from "./store";
import rawtargets from "./targets.json";

const targets = rawtargets.map((item) => ({ ...item, name: t(item.name) }));

const groups = [
  ["cn", t("中國")],
  ["jp", t("日本")],
  ["us", t("美國")],
  ["gl", t("全球")],
  ["crypto", t("加密貨幣")],
  ["ecommerce", t("跨境電商")],
];
type ConnectivityRow = (typeof targets)[number] & {
  result?: ProbeResult;
  running: boolean;
  started: boolean;
  observe: (name: string, visible: boolean) => void;
};
function ObservedSite({ row }: { row: ConnectivityRow }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { name, observe } = row;
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      observe(name, entry.isIntersecting),
    );
    observer.observe(ref.current.closest("tr") ?? ref.current);
    return () => {
      observer.disconnect();
      observe(name, false);
    };
  }, [name, observe]);
  return (
    <span ref={ref} className="site-cell">
      {row.started ? (
        <SiteLogo src={row.icon} />
      ) : (
        <span className="site-icon" />
      )}
      {name}
    </span>
  );
}

const columns: ColumnDef<ConnectivityRow>[] = [
  {
    accessorKey: "name",
    header: t("網站"),
    cell: ({ row }) => <ObservedSite row={row.original} />,
  },
  {
    id: "samples",
    header: t("測試記錄"),
    cell: ({ row }) => (
      <div
        className="ping-dots"
        aria-label={t("{0}/8 次測試", [
          row.original.result?.samples.length ?? 0,
        ])}
      >
        {Array.from({ length: 8 }, (_, index) => {
          const sample = row.original.result?.samples[index];
          return (
            <span
              key={index}
              title={
                sample == null
                  ? t("等待測試")
                  : sample < 0
                    ? t("連接失敗")
                    : `${sample}ms`
              }
              className={`ping-dot ${sample == null ? "" : sample < 0 ? "dot-fail" : sample < 100 ? "dot-good" : sample < 400 ? "dot-warn" : "dot-slow"}`}
            />
          );
        })}
      </div>
    ),
  },
  {
    id: "latency",
    header: t("延遲"),
    cell: ({ row }) =>
      !row.original.started ? (
        "—"
      ) : (
        <LatencyBadge
          result={row.original.result}
          running={row.original.running}
        />
      ),
  },
];

function ConnectivityGroup({
  cc,
  label,
  showLegend = false,
}: {
  cc: string;
  label: string;
  showLegend?: boolean;
}) {
  const [rounds, setRounds] = useAtom(connectivityRoundAtom);
  const round = rounds[cc] ?? 0;
  const groupTargets = targets.filter((target) => target.cc === cc);
  const client = useQueryClient();
  const visible = useRef(new Set<string>());
  const [started, setStarted] = useState<Set<string>>(() => new Set());
  const observe = useCallback((name: string, inView: boolean) => {
    if (inView) {
      visible.current.add(name);
      setStarted((previous) =>
        previous.has(name) ? previous : new Set(previous).add(name),
      );
    } else visible.current.delete(name);
  }, []);
  const progress = useQueries({
    queries: groupTargets.map((target) => ({
      queryKey: ["link-row-progress", target.name, round],
      enabled: false,
      queryFn: skipToken,
    })),
  });
  const queries = useQueries({
    queries: groupTargets.map((target) => ({
      queryKey: ["link-row", target.name, round],
      enabled: started.has(target.name),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        testConnectivity(target.url, signal, (result) =>
          client.setQueryData(
            ["link-row-progress", target.name, round],
            result,
          ),
        ),
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const busy = queries.some((query) => query.isFetching);
  const tableRows = groupTargets.map((target, index) => ({
    ...target,
    observe,
    started: started.has(target.name),
    result: queries[index].isFetching
      ? (progress[index].data as ProbeResult | undefined)
      : queries[index].data,
    running: queries[index].isFetching,
  }));
  // Keep untouched rows in place so sorting cannot trigger extra offscreen tests.
  if (queries.every((query) => query.isSuccess || query.isError) && !busy)
    tableRows.sort(
      (a, b) => (a.result?.median ?? Infinity) - (b.result?.median ?? Infinity),
    );
  return (
    <section className="country-block connectivity-section">
      <div className="connectivity-heading">
        <h2>
          {["cn", "jp", "us", "gl"].includes(cc) && (
            <CountryFlag code={cc === "gl" ? undefined : cc} />
          )}
          {label}
        </h2>
        <div className="connectivity-actions">
          <span className="small muted">
            {t("可讀取響應")}{" "}
            <NumberTicker
              value={
                tableRows.filter(
                  (row) => row.started && row.result?.median != null,
                ).length
              }
            />
            /{groupTargets.length}
          </span>
          <ActionButton
            size="sm"
            variant="secondary"
            busy={busy}
            onClick={() => {
              setStarted(new Set(visible.current));
              setRounds((previous) => ({
                ...previous,
                [cc]: (previous[cc] ?? 0) + 1,
              }));
            }}
            aria-label={
              busy ? t("{0}測試中...", [label]) : t("重新測試{0}", [label])
            }
          >
            {busy ? t("測試中...") : t("重新測試")}
          </ActionButton>
        </div>
      </div>
      <Card>
        <CardContent>
          <DataTable
            className="connectivity-table"
            columns={columns}
            data={tableRows}
            getRowId={(row) => row.name}
            animateChanges={false}
            animateSorting
          />
          {showLegend && (
            <div className="legend connectivity-legend mt-3 border-t pt-3 text-xs">
              <i className="dot-good" />
              {t("優")}
              <i className="dot-warn" />
              {t("良")}
              <i className="dot-slow" />
              {t("慢")}
              <i className="dot-fail" />
              {t("連接失敗")}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default function LinkPage() {
  useEffect(() => {
    document.title = t("網站連通與出口 - IP 網絡工具");
  }, []);
  return (
    <>
      <h1 className="sr-only">{t("網站連通與分流出口")}</h1>
      <SplitResults />
      <div className="section-heading connectivity-page-heading">
        <h2>{t("網站連通性")}</h2>
      </div>
      {groups.map(([cc, label], index) => (
        <ConnectivityGroup
          key={cc}
          cc={cc}
          label={label}
          showLegend={index === groups.length - 1}
        />
      ))}
      <p className="principle">
        {t(
          "瀏覽器 HTTP 請求耗時，取 8 輪成功請求的中位數，非 ICMP Ping。請求被攔截或超時會顯示連接失敗。",
        )}
      </p>
    </>
  );
}
