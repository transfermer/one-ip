import { useState, type ReactNode } from "react";
import { Facts } from "@/components/toolkit";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { Info } from "lucide-react";

const definitions = new Map([
  [
    "ASN",
    t("自治系統編號，用於標識對外宣告 IP 路由的網絡組織，不等同於最終使用者。"),
  ],
  [
    "CIDR",
    t(
      "無類別域間路由記法，表示 IP 地址塊。斜槓後的數字越小，範圍越大；IPv4 /24 包含 256 個地址，/16 包含 65,536 個地址。",
    ),
  ],
  [
    "PTR",
    t(
      "反向 DNS 記錄，將 IP 地址映射爲域名。名稱由網絡運營方配置，不能單獨證明住宅或機房屬性。",
    ),
  ],
  [
    "RPKI",
    t(
      "驗證 IP 前綴與宣告 ASN 是否獲得路由授權。有效表示匹配 ROA；未聲明表示沒有相關授權記錄，不等於無效或存在威脅。",
    ),
  ],
  [
    "Bogon",
    t(
      "私有、保留或未分配等不應出現在公共互聯網路由中的地址。未命中不代表該地址一定可訪問。",
    ),
  ],
  [
    "VPN",
    t(
      "該地址是否被識別爲 VPN 出口。VPN 標記不等於惡意行爲，未檢測到也不保證沒有使用 VPN。",
    ),
  ],
  [
    "Tor",
    t(
      "該地址是否被識別爲 Tor 出口節點。此標記反映網絡出口屬性，不代表用戶身份。",
    ),
  ],
  [
    t("IP 原生性"),
    t(
      "根據註冊國家與定位國家是否一致判斷。一致時顯示原生 IP；國家不同也可能來自跨境運營或數據庫差異。",
    ),
  ],
  [
    t("ASN 自報類型"),
    t(
      "網絡組織申報的業務類型，例如 mixed 爲混合網絡、hosting 爲託管網絡；不能直接代表某一個 IP 的實際用途。",
    ),
  ],
  [
    t("ASN IPv4 總量"),
    t(
      "該 ASN 關聯的 IPv4 地址數量，不是當前地址段的大小，也不代表在線設備數量。",
    ),
  ],
  [
    t("預估帶寬"),
    t("網絡組織層面的帶寬估計或申報檔位，不是當前 IP 的實測下載速度。"),
  ],
  [
    t("ASN 註冊日期"),
    t("ASN 的註冊或分配日期，不是當前 IP 地址塊、寬帶賬戶或設備的啓用日期。"),
  ],
  [
    t("代理"),
    t("該 IP 是否被識別爲代理出口。檢測結果可能受數據庫覆蓋和更新時間影響。"),
  ],
  [
    t("HTTP 蜜罐黑名單"),
    t(
      "蜜罐記錄掃描、攻擊或自動化訪問等活動形成的威脅信號。沒有返回數據時顯示未知，不能理解爲未命中。",
    ),
  ],
  [
    t("濫用評分"),
    t(
      "反映數據源記錄的濫用信號強弱；分值及等級使用該字段自身的尺度，不等於頂部的 0–100 信譽分。",
    ),
  ],
  [
    t("評估置信度"),
    t(
      "數據源對其訪問評估的置信程度，不是服務可用率，也不是成功訪問 AI 平臺的概率。",
    ),
  ],
  [
    t("關聯網絡地址"),
    t(
      "數據源關聯到的其他網絡地址，不代表與當前 IP 屬於同一臺服務器或同一位用戶。",
    ),
  ],
  [
    t("IP 信譽分"),
    t(
      "0–100 的綜合信譽指標，越高表示數據源評估的風險越低。該分數不能保證網站可用，也不能代表任何 AI 平臺的官方判定。",
    ),
  ],
]);

export function FieldHelp({ label }: { label: string }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const description = definitions.get(label);
  if (!description) return <>{label}</>;
  const trigger = (
    <button
      type="button"
      className="ip-help-trigger"
      aria-label={t("解釋 {0}", [label])}
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <Info aria-hidden="true" size={14} />
    </button>
  );
  return (
    <span className="ip-field-label">
      {label}
      {mobile ? (
        <>
          {trigger}
          <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            title={label}
            description=""
          >
            <p className="text-sm leading-relaxed">{description}</p>
          </ResponsiveDialog>
        </>
      ) : (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              className="max-w-72 text-xs leading-relaxed"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}
export function IpFacts({ rows }: { rows: [string, ReactNode][] }) {
  const compactLabels = new Set([
    "ASN",
    "VPN",
    "Tor",
    "Bogon",
    "RPKI",
    t("IP 原生性"),
    t("標記"),
    t("註冊國家"),
    t("數據中心"),
    t("移動網絡"),
    t("企業類型"),
    t("地址類型"),
    t("地址數量"),
    t("代理"),
    t("爬蟲標記"),
    t("濫用標記"),
    t("Reddit 限制"),
    t("濫用等級"),
    t("評估置信度"),
  ]);
  const compact = new Set<string>();
  const fits = ([label, value]: [string, ReactNode]) =>
    compactLabels.has(label) &&
    (typeof value !== "string" || value.length <= 12);
  for (let i = 0; i < rows.length - 1; i++) {
    if (fits(rows[i]) && fits(rows[i + 1])) {
      compact.add(rows[i][0]);
      compact.add(rows[i + 1][0]);
      i++;
    }
  }
  const important = new Set([
    "ASN",
    "CIDR",
    t("服務商"),
    t("標記"),
    t("IP 原生性"),
    t("風險標記"),
  ]);
  return (
    <Facts
      rows={rows.map(([label, value]) => [
        label,
        important.has(label) ? (
          <span key={label} className="ip-key-value">
            {value}
          </span>
        ) : (
          value
        ),
      ])}
      renderLabel={(label) => (
        <span className={compact.has(label) ? "ip-compact-field" : undefined}>
          <FieldHelp label={label} />
        </span>
      )}
    />
  );
}
