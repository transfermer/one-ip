import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { t, locale } from "@/i18n";
import { getStatus } from "@/views/status/api";
import services from "@/views/status/services.json";
import { useQuery } from "@tanstack/react-query";

export function ServiceStatusPage({
  name,
}: {
  name: "Claude (Anthropic)" | "OpenAI";
}) {
  const service = services.find((s) => s.name === name)!;
  const query = useQuery({
    queryKey: ["service-status", service.id],
    queryFn: ({ signal }) => getStatus(service.id, signal),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  return (
    <>
      <PageHeading
        title={t("{0} 實時服務狀態監控", [name])}
        description={t("來自官方狀態接口的當前運行狀態、組件狀態與事件")}
      />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("正在讀取官方狀態…")}</Pending>
      ) : query.data ? (
        <>
          <ToolCard title={t("當前狀態")}>
            <Facts
              rows={[
                [t("狀態"), t(query.data.status?.description ?? "未知")],
                [
                  t("更新於"),
                  new Date(query.data.fetchedAt).toLocaleString(locale),
                ],
              ]}
            />
          </ToolCard>
          <section className="reading">
            <h2>{t("服務組件")}</h2>
            <Facts
              rows={(query.data.components ?? []).map((c) => [
                c.name,
                c.status,
              ])}
            />
          </section>
          <section className="reading">
            <h2>{t("當前事件")}</h2>
            {query.data.incidents?.length ? (
              query.data.incidents.map((i) => (
                <ToolCard title={i.name} key={i.id}>
                  <p>
                    {i.status}
                    {i.updated_at &&
                      ` · ${new Date(i.updated_at).toLocaleString(locale)}`}
                  </p>
                </ToolCard>
              ))
            ) : (
              <p className="muted">{t("官方接口當前沒有未解決事件。")}</p>
            )}
          </section>
        </>
      ) : null}
      <p className="principle">
        {t("歷史可用率需要持續採樣和存儲，本頁不使用抓取快照模擬歷史監控。")}
        <UnderlineHover asChild>
          <a href={service.page} target="_blank" rel="noreferrer">
            {t("查看完整官方狀態頁 ↗")}
          </a>
        </UnderlineHover>
      </p>
    </>
  );
}
