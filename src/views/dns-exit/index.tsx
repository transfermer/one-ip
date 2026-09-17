import { useState } from "react";
import { NumberTicker } from "@/components/number-ticker";
import { OverflowDetailText } from "@/components/overflow-detail-text";
import {
  PageHeading,
  DataTable,
  IpText,
  ActionButton,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { detectDnsExits, dnsSampleCount, type DnsProgress } from "./api";

type Resolver = DnsProgress["results"][number];
const columns: ColumnDef<Resolver>[] = [
  {
    id: "ip",
    header: t("DNS 出口 IP"),
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  {
    accessorKey: "geo",
    header: t("歸屬地 / 運營商"),
    cell: ({ row }) => (
      <OverflowDetailText text={row.original.geo} title={t("DNS 歸屬信息")} />
    ),
  },
  {
    id: "sources",
    header: t("檢測來源"),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1.5">
        {row.original.sources.map((source) => (
          <span
            key={source}
            className="whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {source}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "samples",
    header: t("觀察次數"),
    cell: ({ row }) => <NumberTicker value={row.original.samples} />,
  },
];
export default function DnsExitPage() {
  const [round, setRound] = useState(0);
  const client = useQueryClient();
  const progressKey = ["dns-exit-progress", round];
  const progress = useQuery<DnsProgress>({
    queryKey: progressKey,
    enabled: false,
    queryFn: skipToken,
  });
  const query = useQuery({
    queryKey: ["dns-exit", round],
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      detectDnsExits(signal, (state) => {
        client.setQueryData(progressKey, state);
      }),
  });
  const state = query.isFetching
    ? progress.data
    : (query.data ?? progress.data);
  return (
    <>
      <PageHeading title={t("DNS 出口查詢")} description="" />
      <div className="toolbar">
        <ActionButton
          busy={query.isFetching}
          onClick={() => setRound((n) => n + 1)}
        >
          {query.isFetching ? t("檢測中...") : t("重新檢測")}
        </ActionButton>
        <span className="small muted">
          <NumberTicker value={state?.count ?? 0} />/{dnsSampleCount}
          {t("次採樣 ·")} {state?.failed ?? 0}
          {t("次失敗")}
        </span>
      </div>
      <ErrorNotice error={query.error} />
      {state && state.failed > 0 && (
        <p className="small muted mb-3">
          {t("部分探測失敗，不代表沒有 DNS 泄漏。")}{" "}
          {Object.entries(state.failures)
            .map(([source, count]) => `${source}: ${count}`)
            .join(" · ")}
        </p>
      )}
      <Card>
        <CardContent>
          <DataTable
            className="dns-exit-table"
            data={state?.results ?? []}
            columns={columns}
            getRowId={(row) => row.ip}
            animateChanges={false}
            animateEntries
            empty={
              query.isFetching ? (
                <Pending>{t("正在等待解析結果...")}</Pending>
              ) : (
                t("未檢測到 DNS 出口")
              )
            }
          />
        </CardContent>
      </Card>
      <p className="small muted mt-3">
        {t(
          "相同出口合併顯示；出口數量取決於實際解析路徑，不代表設備配置了相同數量的 DNS。",
        )}
      </p>
    </>
  );
}
