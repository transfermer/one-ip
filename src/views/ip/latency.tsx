import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton, Pending, ToolCard } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { ArrowUpRight, Play, RotateCw } from "lucide-react";
import type { useIpLatency } from "./use-ip-latency";

export function IpLatency({
  measurement,
}: {
  measurement: ReturnType<typeof useIpLatency>;
}) {
  const { ip, busy, nodes, data, error, started, catalogLoaded, names, start } =
    measurement;
  return (
    <ToolCard
      className="ip-latency-card"
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("全球延遲測試")}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to={`/network/ping/?host=${encodeURIComponent(ip)}`}>
                {t("完整測試")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <ActionButton
              size="sm"
              className="min-w-22 text-xs"
              variant="default"
              busy={busy}
              onClick={start}
            >
              {!busy &&
                (started ? (
                  <RotateCw aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                ))}
              {busy ? t("檢測中…") : started ? t("重新檢測") : t("開始測試")}
            </ActionButton>
          </span>
        </span>
      }
    >
      {(!error || Boolean(data?.results.length)) && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-4">
          {nodes.map(({ cc, node }) => {
            const result = data?.results.find(
              (item) => item.probe.country.toLowerCase() === cc,
            );
            const stats = result?.result.stats;
            const latency =
              stats && stats.loss < 100 && Number.isFinite(stats.avg)
                ? stats.avg
                : undefined;
            return (
              <div
                key={cc}
                className="ip-latency-item"
                title={
                  node
                    ? `${node.city} · ${node.preferredNetwork ?? ""} · AS${node.preferredAsn}${stats ? ` · ${t("丟包")} ${stats.loss}%` : ""}`
                    : undefined
                }
              >
                <div className="flex min-w-0 items-center gap-1 text-[11px]">
                  <CountryFlag code={cc} />
                  <span className="truncate">{names[cc]}</span>
                </div>
                <div
                  className="ip-latency-value"
                  style={{
                    color:
                      latency == null
                        ? undefined
                        : latency < 100
                          ? "var(--success)"
                          : latency < 250
                            ? "var(--good)"
                            : "var(--warning)",
                  }}
                >
                  {latency != null ? (
                    <>
                      <NumberTicker value={latency} />
                      <span className="ml-0.5 text-[10px] font-normal">ms</span>
                    </>
                  ) : busy &&
                    (!result || result.result.status === "in-progress") ? (
                    <Pending>···</Pending>
                  ) : (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {!started
                        ? t("待檢測")
                        : !node
                          ? catalogLoaded
                            ? t("暫無優選探針")
                            : t("查詢失敗")
                          : t("無響應")}
                    </span>
                  )}
                </div>
                {stats && stats.loss > 0 && (
                  <span
                    className="ip-latency-loss text-[10px] text-destructive"
                    title={t("丟包")}
                  >
                    <NumberTicker value={stats.loss} />%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </ToolCard>
  );
}
