import { t } from "@/i18n";
import { coffeeThreatLabels, type CoffeeIp } from "./coffee.ts";
import type { ipProfile } from "./profile";

type Option = {
  label: string;
  description: string;
  current?: boolean;
  status?: string;
};
type Field = {
  label: string;
  value: string;
  detail?: string;
  options: Option[];
  tone?: "success" | "warning" | "danger" | "info";
  special?: boolean;
};

export function ipProfileFields(
  data: CoffeeIp,
  profile: ReturnType<typeof ipProfile>,
): Field[] {
  const threats = coffeeThreatLabels(data);
  const riskThreats = coffeeThreatLabels(data, true);
  const typeOptions = [
    [
      t("家庭住宅 IP"),
      t(
        "分配給家庭或個人寬帶用戶的地址。住宅標記不保證獨享，也不排除被用作代理。",
      ),
    ],
    [
      t("移動網絡"),
      t(
        "由蜂窩移動網絡提供的地址，可能由多個設備共享，連接變化時出口可能改變。",
      ),
    ],
    [
      t("數據中心"),
      t(
        "服務器託管、雲服務、CDN 或 IP 租賃等網絡的地址。適合部署服務，不等於存在風險。",
      ),
    ],
    [
      t("公共服務"),
      t("公共 DNS、CDN 等服務地址，可能使用任播，不能按普通個人上網出口理解。"),
    ],
    [
      t("類型標記衝突"),
      t("數據源同時返回住宅和數據中心標記，暫不能確認具體用途。"),
    ],
    [t("未知"), t("未返回足夠的類型標記，不能把缺失數據當成住宅或安全證明。")],
  ];
  const companies = [
    [
      "isp",
      t("網絡運營商"),
      t("提供互聯網接入或網絡傳輸服務的組織；旗下地址不一定都是家庭寬帶。"),
    ],
    [
      "hosting",
      t("託管服務商"),
      t("經營服務器託管、雲計算、CDN 等業務的組織。"),
    ],
    [
      "business",
      t("商業企業"),
      t("企業自用網絡或其他商業組織，不能僅據此判斷住宅或機房。"),
    ],
    ["education", t("教育機構"), t("學校、大學和科研教育組織使用的網絡。")],
    [
      "government",
      t("政府機構"),
      t("政府及公共行政組織使用的網絡，不代表特殊訪問權限。"),
    ],
    [
      "banking",
      t("金融機構"),
      t("銀行或金融組織使用的網絡，不代表更高信譽或投資安全。"),
    ],
    [
      "other",
      t("其他類型"),
      t("數據源返回了未收錄的業務類型，保留原始值，不作高低判斷。"),
    ],
    ["unknown", t("未知"), t("數據源未提供廠商類型。")],
  ];
  const rawCompany = data.company_type?.trim().toLowerCase();
  const companyKey = !rawCompany
    ? "unknown"
    : companies.some(([key]) => key === rawCompany)
      ? rawCompany
      : "other";
  const country = data.countryCode?.trim().toUpperCase();
  const registered = data.registered_country_code?.trim().toUpperCase();
  const registration = data.is_public_service
    ? "na"
    : !country || !registered
      ? "unknown"
      : country === registered
        ? "same"
        : "different";
  const registrationOptions = [
    [
      "same",
      t("註冊地一致"),
      t("定位國家與註冊國家一致，可作歸屬參考，但不能單獨證明原生線路。"),
    ],
    [
      "different",
      t("註冊地不同"),
      t("可能來自跨境運營、地址調配或數據庫差異，不等於有風險。"),
    ],
    ["unknown", t("待確認"), t("缺少註冊國家或定位國家，暫不能比較。")],
    [
      "na",
      t("不適用"),
      t("公共服務可能在多個地區提供服務，不用單點國家比較判斷原生性。"),
    ],
  ];
  const flags: [string, string, boolean | undefined][] = [
    [
      "VPN",
      t("被數據源識別爲 VPN 出口；屬於網絡用途標記，不等同於惡意流量。"),
      data.is_vpn,
    ],
    [t("代理"), t("被識別爲代理出口，可能影響網站的訪問驗證。"), data.is_proxy],
    [
      "Tor",
      t("被識別爲 Tor 出口，部分服務可能限制這類匿名網絡。"),
      data.is_tor,
    ],
    [
      t("爬蟲標記"),
      t("被識別爲自動化抓取或爬蟲相關地址，需要結合實際用途判斷。"),
      data.is_crawler,
    ],
    [
      t("濫用標記"),
      t("數據源記錄到濫用活動或相關黑名單信號，建議覈實。"),
      data.is_abuser,
    ],
    [
      "Bogon",
      t("私有、保留或尚未分配等不應出現在公共互聯網路由中的地址。"),
      data.is_bogon,
    ],
  ];
  const fields: Field[] = [
    {
      label: t("IP 類型"),
      value: profile.checks[0].value,
      detail: t("這裏表示網絡用途，IPv4 / IPv6 表示地址協議，兩者是不同維度。"),
      options: typeOptions.map(([label, description]) => ({
        label,
        description,
        current: label === profile.checks[0].value,
      })),
    },
    {
      label: t("廠商類型"),
      value: profile.checks[1].value,
      detail: t("當前廠商：{0}", [data.company_name || data.isp || t("未知")]),
      options: companies.map(([key, label, description]) => ({
        label,
        description,
        current: key === companyKey,
      })),
    },
    {
      label: t("註冊地對照"),
      value: registrationOptions.find(([key]) => key === registration)![1],
      detail: t(
        "定位國家：{0}；註冊國家：{1}。國家一致不等於已驗證原生線路。",
        [
          data.country || country || t("未知"),
          data.registered_country || registered || t("未知"),
        ],
      ),
      options: registrationOptions.map(([key, label, description]) => ({
        label,
        description,
        current: key === registration,
      })),
    },
    {
      label: t("網絡標記"),
      value: profile.checks[3].value,
      detail: t("未檢出只表示當前數據源沒有返回該標記，未知表示缺少數據。"),
      options: [
        ...flags.map(([label, description, value]) => ({
          label,
          description,
          current: value === true,
          status:
            value === true
              ? t("已檢測到")
              : value === false
                ? t("未檢測到")
                : t("未知"),
        })),
        {
          label: t("其他情報"),
          description: threats.length
            ? threats.join(" · ")
            : t("其他威脅情報記錄，與上述六項網絡標記分別展示。"),
          status: riskThreats.length
            ? t("已檢測到")
            : threats.length
              ? t("僅信息")
              : data.intelligence?.threats
                ? t("未檢測到")
                : t("未知"),
          current: riskThreats.length > 0,
        },
      ],
    },
  ];
  fields[0].tone =
    data.isResidential && data.is_datacenter ? "warning" : "info";
  fields[1].tone = "info";
  fields[1].special = ["education", "government", "banking"].includes(
    companyKey,
  );
  fields[2].tone = registration === "same" ? "success" : "info";
  fields[3].tone =
    profile.risk?.severity === "danger"
      ? "danger"
      : profile.risk
        ? "warning"
        : profile.checks[3].passed
          ? "success"
          : "info";
  return fields;
}
