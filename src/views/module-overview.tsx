import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { PageHeading, ToolCard } from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { t } from "@/i18n";
import { toolGroups } from "@/layout/routes";
import { AiNetworkCheck } from "@/views/ai/network-check";
import { aiPlatforms } from "@/views/ai/platforms";
import { BrowserSummary } from "@/views/browser/summary";
import { ArrowUpRight } from "lucide-react";

const descriptions: Record<string, string> = {
  "/network/ip": t("查詢歸屬地、運營商、ASN 和地圖位置"),
  "/network/subdomains": t("查詢證書透明度日誌中記錄的子域名"),
  "/network/whois": t("查看域名、IP 和 AS 註冊資料"),
  "/network/connectivity": t("查看地圖、網站分流出口、連通性和訪問延遲"),
  "/network/ping": t("從全球探針測量延遲與丟包"),
  "/network/dns": t("查看域名解析經過的出口網絡"),
  "/network/cdn": t("查看內容分發網絡的接入節點"),
  "/browser/environment": t("瀏覽器、系統、語言、屏幕和硬件信息"),
  "/browser/fingerprint": t("查看指紋組成，比較重複檢測的變化"),
  "/browser/consistency": t("覈對環境差異，運行瀏覽器深度檢測"),
  "/browser/automation": t("查看可觀察到的自動化相關信號"),
  "/browser/privacy": t("檢查 WebRTC 出口與網站訪問權限"),
  "/browser/challenges": t("體驗第三方驗證碼並查看本次結果"),
};
const titles = {
  network: t("網絡檢測概述"),
  browser: t("瀏覽器檢測概述"),
  ai: t("AI 檢測概述"),
};
export default function ModuleOverview({
  group,
}: {
  group: keyof typeof toolGroups;
}) {
  const tools = useAvailableTools(group);
  return (
    <div className="space-y-3">
      <PageHeading title={titles[group]} description="" />
      {group === "network" && (
        <ToolCard title={t("當前網絡響應")}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {homeTargets.map((target) => (
              <ConnectivityTile key={target.name} target={target} />
            ))}
          </div>
        </ToolCard>
      )}
      {group === "browser" && <BrowserSummary />}
      {group === "ai" && (
        <AiNetworkCheck
          domains={aiPlatforms.map((platform) => platform.domain)}
        />
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.path}>
            <CardContent>
              <Link to={tool.path} className="group block">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span>{tool.label}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </span>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {descriptions[tool.path] ??
                    t("查看 {0} 網絡響應、出口對照與相關入口", [tool.label])}
                </p>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
