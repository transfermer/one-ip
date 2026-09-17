import { useSearchParams } from "react-router-dom";
import { LookupFaq } from "@/components/lookup-faq";
import { LookupForm } from "@/components/lookup-form";
import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t, locale } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { Registration } from "./api";
import { lookupWhois } from "./api";

export default function WhoisPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const history = useLookupHistory<Registration>("ip-tools:whois-history:v1");
  const cached = history.find(q);
  const query = useQuery({
    queryKey: ["whois", q],
    enabled: !!q,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const result = await lookupWhois(q, signal);
      history.save(q, result);
      return result;
    },
    retry: false,
  });
  const data = query.data?.data;
  return (
    <div className="lookup-page">
      <div className="lookup-search-card">
        <PageHeading
          title={t("WHOIS 查詢")}
          description={t("查詢域名、IP 或 ASN 註冊信息")}
        />
        <LookupForm
          grouped
          value={q}
          placeholder={t("輸入域名、IP 地址或 AS 號")}
          busy={query.isFetching}
          onSubmit={(value) =>
            value === q ? void query.refetch() : setParams({ q: value })
          }
        />
      </div>
      <Card className="mt-3">
        <CardContent>
          <div className="examples lookup-history">
            <span>
              {history.entries.length ? t("最近查詢") : t("推薦查詢")}
            </span>
            {(history.entries.length
              ? history.entries.map((entry) => entry.query)
              : ["qq.com", "1.1.1.1", "AS15169"]
            ).map((value) => (
              <Badge key={value} variant="secondary" asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-2 py-1 h-auto hover:bg-accent"
                  onClick={() => setParams({ q: value })}
                >
                  {value}
                </button>
              </Badge>
            ))}
          </div>
          {cached && (
            <p className="small muted">
              {t("已保存的查詢結果 ·")}{" "}
              {new Date(cached.savedAt).toLocaleString(locale)}
              {t("，點擊查詢可更新")}
            </p>
          )}
        </CardContent>
      </Card>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="status-line">
          <Pending>{t("正在向註冊局查詢…")}</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <h2 className="whois-result-name">
            {data.ldhName ?? data.name ?? q}
          </h2>
          <div className="whois-grid">
            <ToolCard title={t("基礎信息")}>
              <Facts
                rows={[
                  [
                    t("查詢協議"),
                    query.data?.source ? t(query.data.source) : undefined,
                  ],
                  [t("對象類型"), data.objectClassName],
                  [t("標識符"), data.handle],
                  [t("國家 / 地區"), data.country],
                  ...(data.startAddress
                    ? [
                        [
                          t("地址範圍"),
                          `${data.startAddress} – ${data.endAddress}`,
                        ] as [string, string],
                      ]
                    : []),
                ]}
              />
            </ToolCard>
            {data.events?.length ? (
              <ToolCard title={t("註冊時間")}>
                <Facts
                  rows={data.events.map((event) => [
                    event.eventAction,
                    new Date(event.eventDate).toLocaleString(locale),
                  ])}
                />
              </ToolCard>
            ) : null}
            {data.status?.length ? (
              <ToolCard title={t("域名狀態")}>
                <div className="whois-tags">
                  {data.status.map((status) => (
                    <Badge variant="secondary" key={status}>
                      {status}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.nameservers?.length ? (
              <ToolCard title={t("DNS 服務器")}>
                <div className="whois-tags">
                  {data.nameservers.map((server, index) => (
                    <Badge variant="secondary" key={index}>
                      {server.ldhName}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.entities?.map((entity, index) => (
              <ToolCard
                key={index}
                title={entity.roles?.join(" / ") ?? t("註冊實體")}
              >
                <Facts rows={[[t("標識符"), entity.handle ?? t("隱私保護")]]} />
              </ToolCard>
            ))}
          </div>
          <details className="raw-details">
            <summary>{t("查看原始 RDAP 數據")}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
      <LookupFaq
        items={[
          {
            title: t("可以查詢哪些內容？"),
            text: t(
              "支持域名、公網 IPv4、IPv6 和 AS 號（例如 AS15169）。域名只需填寫名稱，不要包含 https://、端口或路徑。\n\n例如 qq.com、1.1.1.1、AS15169。查詢 www.qq.com 等子域名不一定能得到獨立註冊記錄；通常應輸入實際註冊的域名 qq.com。",
            ),
          },
          {
            title: t("WHOIS 和 RDAP 有什麼區別？"),
            text: t(
              "兩者都用於查詢註冊信息。本頁使用返回結構化數據的 RDAP；域名由註冊局提供數據，IP 和 ASN 由區域互聯網註冊機構提供數據。\n\n頁面會按響應展示標識符、狀態、名稱服務器、事件時間及實體信息，不同註冊機構提供的字段可能不同。原始 RDAP 數據入口可用於覈對完整響應。",
            ),
          },
          {
            title: t("爲什麼查詢失敗或沒有結果？"),
            text: t(
              "域名後綴可能尚無可用 RDAP 服務，也可能遇到未註冊域名、上游限流或連接超時。查詢失敗不代表域名可以註冊，請以註冊商結果爲準。\n\n先檢查拼寫和輸入格式，再嘗試原條件重新查詢。若僅某個後綴失敗，可能是該註冊局服務不支持或暫不可用；不要通過反覆高頻點擊來繞過上游限流。",
            ),
          },
          {
            title: t("爲什麼看不到註冊人或國家信息？"),
            text: t(
              "上游可能未公開相關字段，或對聯繫人信息作了隱私處理。“未知”僅表示此次響應沒有提供數據。\n\n域名記錄中的國家通常屬於註冊或聯繫信息，不能用來判斷網站服務器所在地。聯繫人標識符也未必是姓名；隱私代理或註冊商實體可能代替註冊人出現在響應中。",
            ),
          },
          {
            title: t("域名狀態與 DNS 服務器代表什麼？"),
            text: t(
              "transfer prohibited 表示限制轉移，delete prohibited 表示限制刪除，hold 表示暫停解析。DNS 服務器字段列出註冊信息中的權威名稱服務器，不代表當前網站服務器 IP。\n\nclient 前綴一般表示註冊商設置的限制，server 前綴一般表示註冊局設置的限制。轉移鎖並不表示網站不可訪問；名稱服務器列表也不直接表示你當前使用的遞歸 DNS。",
            ),
          },
          {
            title: t("最近查詢會自動更新嗎？"),
            text: t(
              "本瀏覽器分別保留最近 10 條 IP 和 WHOIS 成功查詢。點擊歷史優先顯示已保存結果及時間；需要最新信息時，再點擊“查詢”。清除站點數據會刪除本地歷史。\n\n同一查詢成功更新後會覆蓋舊結果並排到前面，超過 10 條會移除最早保存的記錄。緩存不會後臺自動更新，註冊狀態、DNS 或到期日期發生變化時應主動重新查詢。",
            ),
          },
        ]}
      />
    </div>
  );
}
