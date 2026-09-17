import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { X } from "lucide-react";

const descriptions: Record<string, string> = {
  "/browser/environment": t(
    "查看瀏覽器向網站提供的系統、語言、屏幕和硬件信息。",
  ),
  "/browser/fingerprint": t(
    "查看瀏覽器指紋及各項組成，重複檢測可比較本次會話內的變化。",
  ),
  "/browser/consistency": t(
    "對照瀏覽器聲明與不同上下文的環境信息，查看存在差異的項目。差異不代表使用了指紋瀏覽器。",
  ),
  "/browser/automation": t(
    "檢查瀏覽器暴露的自動化相關特徵；未發現特徵不代表沒有自動化。",
  ),
  "/browser/challenges": t(
    "體驗當前瀏覽器完成第三方驗證的過程，查看本站本次驗證的實際結果。",
  ),

  "/network/whois": t(
    "查詢域名、IP 或 AS 號的註冊信息，瞭解註冊主體、所屬機構及相關日期。",
  ),
  "/network/ping": t(
    "從全球不同地區測試目標的網絡延遲和丟包情況，比較各地的連接質量。",
  ),
  "/network/cdn": t(
    "查看當前網絡訪問各 CDN 的節點位置，瞭解內容服務的接入地區。",
  ),
  "/network/dns": t(
    "查看 DNS 解析的出口地址和歸屬地，瞭解域名查詢經過的網絡。",
  ),
  "/browser/privacy": t(
    "查看網站可訪問的權限、瀏覽器能力與 WebRTC 出口，瞭解可能暴露的信息。",
  ),
  "/ai/gpt": t("檢查訪問 GPT 相關服務的網絡出口和連通性，輔助排查訪問問題。"),
  "/ai/claude": t(
    "檢查訪問 Claude 相關服務的網絡出口和連通性，輔助排查訪問問題。",
  ),
  "/status": t("查看各服務的官方運行狀態和故障事件，瞭解服務是否受到影響。"),
  "/status/openai": t(
    "查看 OpenAI 各項服務的官方運行狀態和故障事件，瞭解受影響的功能。",
  ),
  "/status/claude": t(
    "查看 Claude 各項服務的官方運行狀態和故障事件，瞭解受影響的功能。",
  ),
};

function DismissibleHelp({ page, text }: { page: string; text: string }) {
  const key = `ip-tools:page-help:v1:${page}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "dismissed";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  return (
    <Alert
      className="page-help-alert mb-3 flex items-start gap-2 border-0 py-2"
      role="note"
    >
      <AlertDescription className="min-w-0 flex-1 text-xs leading-5">
        {text}
      </AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mt-1 shrink-0"
        aria-label={t("關閉功能說明")}
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(key, "dismissed");
          } catch {
            /* Keep closing usable when storage is unavailable. */
          }
        }}
      >
        <X className="size-3.5" />
      </Button>
    </Alert>
  );
}

export function PageHelpAlert() {
  const { pathname } = useLocation();
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const page = /^\/network\/ip\/[^/]+$/.test(normalized)
    ? "/network/ip"
    : normalized;
  const text = descriptions[page];
  return text ? <DismissibleHelp key={page} page={page} text={text} /> : null;
}
