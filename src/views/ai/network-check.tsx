import { type ReactNode, useState } from "react";
import { LatencyBadge } from "@/components/latency-badge";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending } from "@/components/toolkit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { trace } from "@/lib/network";
import { withDetectionAnimation } from "@/views/browser/with-feedback";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiPlatforms } from "./platforms";
import { probeAiDomain } from "./probe";

export function AiNetworkCheck({
  domains,
  children,
}: {
  domains: string[];
  children?: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["ai-network", "v3", ...domains],
    queryFn: ({ signal }) =>
      Promise.all(domains.map((domain) => probeAiDomain(domain, signal))),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const platforms = domains.map((domain) =>
    aiPlatforms.find((platform) => platform.domain === domain),
  );
  const exits = useQueries({
    queries: platforms.map((platform, index) => ({
      queryKey: [platform?.id ?? domains[index], "exit"],
      enabled: Boolean(platform?.traceDomain),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        trace(platform!.traceDomain!, signal),
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const busy =
    refreshing || query.isFetching || exits.some((exit) => exit.isFetching);
  const orderedDomains = domains.map((domain, index) => ({
    domain,
    result: query.data?.[index],
    exit: exits[index],
  }));
  if (!busy && query.data)
    orderedDomains.sort(
      (a, b) => (a.result?.median ?? Infinity) - (b.result?.median ?? Infinity),
    );
  const sortRef = useSortAnimation(
    orderedDomains.map(({ domain }) => domain).join("|"),
  );
  return (
    <Card className="ai-network-check">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("網絡連通性")}</CardTitle>
          <button
            type="button"
            className="shrink-0 text-xs font-normal text-primary enabled:hover:underline underline-offset-4"
            disabled={busy}
            onClick={async () => {
              setRefreshing(true);
              try {
                const [next] = await withDetectionAnimation(() =>
                  Promise.all([
                    query.refetch({ throwOnError: true }),
                    ...exits
                      .filter((_, index) => platforms[index]?.traceDomain)
                      .map((exit) => exit.refetch()),
                  ]),
                );
                if (next.data?.every((result) => result.median != null))
                  toast.success(t("網絡檢測完成"));
                else toast.warning(t("檢測完成，部分站點未獲取到響應"));
              } catch {
                toast.error(t("網絡檢測失敗，請重試"));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {busy ? <Pending>{t("檢測中…")}</Pending> : t("重新檢測")}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={sortRef}>
          <Table className="ai-connectivity-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("域名")}</TableHead>
                <TableHead>{t("出口")} IP</TableHead>
                <TableHead className="text-right">{t("延遲")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedDomains.map(({ domain, result, exit }) => (
                <TableRow key={domain} data-sort-id={domain}>
                  <TableCell className="ai-connectivity-site">
                    <span className="flex min-w-0 items-center gap-2">
                      <SiteLogo website={`https://${domain}`} />
                      <span>{domain}</span>
                    </span>
                  </TableCell>
                  <TableCell className="ai-connectivity-exit text-muted-foreground">
                    <span className="sm:hidden">{t("出口 IP：")} </span>
                    {exit.isFetching ? (
                      <Pending>{t("檢測中…")}</Pending>
                    ) : exit.data?.ip ? (
                      <IpText ip={exit.data.ip} />
                    ) : (
                      <span title={t("未獲取到出口，可能受跨域或連接限制。")}>
                        {t("暫不可用")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="ai-connectivity-latency text-right">
                    {query.isFetching ? (
                      <Pending>{t("檢測中…")}</Pending>
                    ) : result?.median != null ? (
                      <span title={result.description}>
                        <LatencyBadge result={result} running={false} />
                      </span>
                    ) : (
                      <span
                        className="text-xs text-muted-foreground"
                        title={result?.description}
                      >
                        {result?.status === "restricted"
                          ? t("檢測受限")
                          : t("未確認")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="small muted mt-2">
          {t(
            "檢測的是站點資源響應，不等於登錄或對話可用；跨站限制和超時不會判爲“未連通”。",
          )}
        </p>
        {query.error && (
          <p className="small text-destructive">
            {t("網絡檢測失敗，請重試。")}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
