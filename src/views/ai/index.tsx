import { CountryFlag } from "@/components/country-flag";
import {
  PrivacyToggle,
  PageHeading,
  ToolCard,
  IpText,
  Pending,
} from "@/components/toolkit";
import { t } from "@/i18n";
import { trace } from "@/lib/network";
import { getGeo, getDomesticIp } from "@/views/home/api";
import { useQuery } from "@tanstack/react-query";
import { AiNetworkCheck } from "./network-check";
import { AiPlatformLinks } from "./platform-links";
import type { AiPlatform } from "./platforms";

export default function PlatformDiagnostics({
  platform,
}: {
  platform: AiPlatform;
}) {
  const exit = useQuery({
    queryKey: [platform.id, "exit"],
    enabled: Boolean(platform.traceDomain),
    queryFn: ({ signal }) => trace(platform.traceDomain!, signal),
    staleTime: 60_000,
    retry: false,
  });
  const geo = useQuery({
    queryKey: ["geoip", exit.data?.ip],
    enabled: Boolean(exit.data?.ip),
    queryFn: ({ signal }) => getGeo(exit.data!.ip, signal),
    staleTime: 60_000,
    retry: false,
  });
  const domestic = useQuery({
    queryKey: ["domestic-ip"],
    queryFn: ({ signal }) => getDomesticIp(signal),
    retry: false,
  });
  const cf = useQuery({
    queryKey: ["cf-exit"],
    queryFn: ({ signal }) => trace("1.1.1.1", signal),
    retry: false,
  });
  return (
    <div className="ai-diagnostics">
      <PageHeading title={t("{0} 網絡檢測", [platform.name])} description="" />
      <div className="ai-overview">
        <ToolCard
          title={
            <div className="flex items-center justify-between gap-3">
              <span>
                {platform.name}
                {t("出口")}
              </span>
              <PrivacyToggle />
            </div>
          }
        >
          {platform.traceDomain ? (
            <>
              <div className="ip-value text-primary">
                {exit.isPending ? (
                  <Pending>{t("正在檢測出口…")}</Pending>
                ) : (
                  <IpText ip={exit.data?.ip} />
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {exit.isError ? (
                  t("出口查詢失敗，可能受網絡或跨域限制。")
                ) : geo.isFetching ? (
                  <Pending>{t("查詢歸屬信息…")}</Pending>
                ) : (
                  <>
                    <CountryFlag
                      code={geo.data?.country_code ?? exit.data?.country_code}
                    />{" "}
                    {[
                      geo.data?.country ?? exit.data?.country_code,
                      geo.data?.city,
                      geo.data?.isp,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("歸屬信息暫不可用")}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              {t("暫未找到可讀取此平臺出口的公開接口；以下地址僅供對照。")}
            </p>
          )}
          <div className="ai-exit-comparison">
            <span className="small muted">{t("其他出口對照")}</span>
            {[
              { query: domestic, title: t("國內 IPv4") },
              { query: cf, title: "Cloudflare" },
            ].map(({ query, title }) => (
              <div className="ai-exit-row" key={title}>
                <span className="muted">{title}</span>
                <span>
                  {query.isPending ? (
                    <Pending>{t("檢測中…")}</Pending>
                  ) : query.isError ? (
                    <span className="muted">{t("暫不可用")}</span>
                  ) : (
                    <IpText ip={query.data?.ip} />
                  )}
                </span>
              </div>
            ))}
            {(domestic.isError || cf.isError) && (
              <p className="small muted">
                {t("對照出口可能受連接或跨域限制。")}
              </p>
            )}
          </div>
        </ToolCard>
        <AiNetworkCheck domains={[platform.domain]}>
          <p className="small muted mt-3">
            {t("瀏覽器 HTTP 探測，不代表賬號可用或模型權限。")}
          </p>
          <AiPlatformLinks platform={platform} />
        </AiNetworkCheck>
      </div>
    </div>
  );
}
