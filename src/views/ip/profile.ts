import { t } from "@/i18n";
import { coffeeThreatLabels, type CoffeeIp } from "./coffee.ts";

export function ipProfile(data: CoffeeIp) {
  const score =
    typeof data.trust_score === "number" &&
    Number.isFinite(data.trust_score) &&
    data.trust_score >= 0 &&
    data.trust_score <= 100
      ? data.trust_score
      : null;
  const companyTypes: Record<string, string> = {
    isp: t("網絡運營商"),
    hosting: t("託管服務商"),
    business: t("商業企業"),
    education: t("教育機構"),
    government: t("政府機構"),
    banking: t("金融機構"),
  };
  const companyType = data.company_type?.trim().toLowerCase();
  const company = companyType
    ? (companyTypes[companyType] ?? data.company_type!)
    : t("未知");
  const conflict = data.isResidential === true && data.is_datacenter === true;
  const type = data.is_public_service
    ? t("公共服務")
    : conflict
      ? t("類型標記衝突")
      : data.is_mobile
        ? t("移動網絡")
        : data.isResidential
          ? t("家庭住宅 IP")
          : data.is_datacenter
            ? t("數據中心")
            : t("未知");
  const country = data.countryCode?.trim().toUpperCase();
  const registered = data.registered_country_code?.trim().toUpperCase();
  const sameCountry =
    country && registered && !data.is_public_service
      ? country === registered
      : null;
  const flags: [string, boolean | undefined][] = [
    ["VPN", data.is_vpn],
    [t("代理"), data.is_proxy],
    ["Tor", data.is_tor],
    [t("爬蟲標記"), data.is_crawler],
    [t("濫用標記"), data.is_abuser],
    ["Bogon", data.is_bogon],
  ];
  const detected = flags
    .filter(([, value]) => value === true)
    .map(([label]) => label);
  const unknownFlags = flags.filter(
    ([, value]) => typeof value !== "boolean",
  ).length;
  const threats = coffeeThreatLabels(data, true);
  const clear = !detected.length && !unknownFlags && !threats.length;
  const preferred =
    score !== null &&
    score >= 90 &&
    data.isResidential === true &&
    data.is_datacenter === false &&
    !data.is_mobile &&
    !data.is_public_service &&
    companyType === "isp" &&
    sameCountry === true &&
    clear;
  const seriousFlags = [
    ...(data.is_abuser ? [t("濫用標記")] : []),
    ...(data.is_bogon ? ["Bogon"] : []),
    ...threats,
  ];
  const risk = seriousFlags.length
    ? {
        severity: "danger" as const,
        title: t("發現風險信號"),
        flags: [...new Set([...detected, ...threats])],
        description: t(
          "數據源返回濫用、保留地址或威脅記錄。建議覈實網絡來源，必要時更換出口後重新檢測。",
        ),
      }
    : score !== null && score < 45 && !data.is_public_service
      ? {
          severity: "danger" as const,
          title: t("信譽分偏低"),
          flags: detected,
          description: t(
            "當前信譽分爲 {0}/100，建議結合網絡標記覈實使用風險。",
            [score],
          ),
        }
      : detected.length
        ? {
            severity: "notice" as const,
            title: t("檢測到網絡標記"),
            flags: detected,
            description: t(
              "代理、VPN、Tor 或爬蟲標記可能影響部分網站的訪問驗證；標記本身不等於惡意行爲。",
            ),
          }
        : null;
  // Levels describe the available network profile, not hardware or line speed.
  const level: "S" | "A" | "B" | "C" | null =
    data.is_public_service ||
    conflict ||
    !clear ||
    score === null ||
    type === t("未知") ||
    !companyType
      ? null
      : preferred
        ? "S"
        : score >= 90
          ? "A"
          : score >= 75
            ? "B"
            : "C";
  let grade = t("信息不足");
  let explanation = t("部分類型或風險數據缺失，暫不判斷配置檔位。");
  let tone: "good" | "warn" | "bad" | "neutral" = "neutral";
  if (data.is_public_service) {
    grade = t("公共服務網絡");
    explanation = t(
      "公共 DNS、CDN 等服務可能使用任播，不按個人住宅或機房出口評定檔位。",
    );
  } else if (conflict) {
    grade = t("類型待確認");
    explanation = t(
      "數據源同時返回住宅與數據中心標記，不能據此認定爲優質住宅。",
    );
    tone = "warn";
  } else if (detected.length || threats.length) {
    grade = t("存在網絡標記");
    explanation = t("已返回 {0}；代理、VPN 等標記本身不等於惡意行爲。", [
      [...detected, ...threats].join("、"),
    ]);
    tone = data.is_abuser || data.is_bogon || threats.length ? "bad" : "warn";
  } else if (preferred) {
    grade = t("住宅優選");
    explanation = t(
      "住宅 IP、ISP 廠商、註冊地一致、信譽分 ≥ 90，且六項網絡標記均未檢出。",
    );
    tone = "good";
  } else if (score !== null && type !== t("未知") && clear) {
    grade =
      score >= 90
        ? data.is_mobile
          ? t("高信譽網絡")
          : data.is_datacenter
            ? t("高信譽機房")
            : data.isResidential
              ? t("高信譽住宅")
              : t("高信譽網絡")
        : score >= 75
          ? t("信譽良好")
          : score >= 45
            ? t("信譽一般")
            : t("信譽偏低");
    explanation = t(
      "按數據源信譽分分檔：90–100 高信譽，75–89 良好，45–74 一般，0–44 偏低。",
    );
    tone = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
  }
  const checks: {
    label: string;
    value: string;
    requirement: string;
    passed: boolean | null;
  }[] = [
    {
      label: t("IP 類型"),
      value: type,
      requirement: t("住宅且非機房、非移動網絡"),
      passed:
        data.is_public_service ||
        conflict ||
        data.is_mobile ||
        data.isResidential === false ||
        data.is_datacenter === true
          ? false
          : data.isResidential === true && data.is_datacenter === false
            ? true
            : null,
    },
    {
      label: t("廠商類型"),
      value: company,
      requirement: t("廠商類型爲 ISP"),
      passed: companyType ? companyType === "isp" : null,
    },
    {
      label: t("註冊地對照"),
      value:
        sameCountry === null
          ? t("待確認")
          : sameCountry
            ? t("註冊地一致")
            : t("註冊地不同"),
      requirement: t("註冊國家與定位國家一致"),
      passed: sameCountry,
    },
    {
      label: t("網絡標記"),
      value:
        detected.length || threats.length
          ? t("有標記")
          : unknownFlags
            ? t("缺少 {0} 項數據", [unknownFlags])
            : t("6 項均未檢出"),
      requirement: t("六項標記均未檢出，且無已知威脅"),
      passed:
        detected.length || threats.length ? false : unknownFlags ? null : true,
    },
    {
      label: t("IP 信譽分"),
      value: score === null ? t("未知") : `${score} / 100`,
      requirement: t("信譽分 ≥ 90"),
      passed: score === null ? null : score >= 90,
    },
  ];
  const scoreBand =
    score === null
      ? null
      : score >= 90
        ? 3
        : score >= 75
          ? 2
          : score >= 45
            ? 1
            : 0;
  return {
    score,
    scoreBand,
    grade,
    explanation,
    tone,
    checks,
    preferred,
    level,
    risk,
  };
}
