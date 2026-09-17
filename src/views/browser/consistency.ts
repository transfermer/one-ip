import { t } from "@/i18n";

export interface Check {
  name: string;
  status: "一致" | "存在差異" | "檢測到特徵" | "未發現特徵" | "無法檢測";
  detail: string;
}
export function platformFamily(value: string) {
  if (/Android/i.test(value)) return "Android";
  if (/iPhone|iPad|iPod|iOS/i.test(value)) return "iOS";
  if (/Windows|Win32|Win64/i.test(value)) return "Windows";
  if (/CrOS/i.test(value)) return "ChromeOS";
  if (/Mac/i.test(value)) return "macOS";
  if (/Linux/i.test(value)) return "Linux";
  return null;
}
export function comparePlatforms(
  ua: string,
  platform: string,
  touchPoints: number,
): Check {
  const left = platformFamily(ua),
    right = platformFamily(platform);
  // Android exposes Linux; iPad desktop mode can report MacIntel.
  const compatible =
    left === right ||
    (left === "Android" && right === "Linux") ||
    (left === "ChromeOS" && right === "Linux") ||
    (left === "iOS" && right === "macOS" && touchPoints > 1);
  return {
    name: t("UA / 平臺"),
    status: !left || !right ? "無法檢測" : compatible ? "一致" : "存在差異",
    detail: t("{0} / {1}。兼容模式和隱私設置也可能影響這些值。", [
      left ?? t("未知"),
      right ?? t("未知"),
    ]),
  };
}
export function compareContexts(
  main: Record<string, unknown>,
  other: Record<string, unknown>,
  name: string,
): Check {
  const keys = [
    "userAgent",
    "platform",
    "language",
    "languages",
    "hardwareConcurrency",
    "timezone",
  ];
  const missing = keys.filter(
    (key) => main[key] === undefined || other[key] === undefined,
  );
  const differences = keys.filter(
    (key) =>
      !missing.includes(key) &&
      JSON.stringify(main[key]) !== JSON.stringify(other[key]),
  );
  return {
    name,
    status: differences.length
      ? "存在差異"
      : missing.length
        ? "無法檢測"
        : "一致",
    detail: differences.length
      ? t("不同字段：{0}", [differences.join("、")])
      : missing.length
        ? t("未提供：{0}", [missing.join("、")])
        : t("已讀取的語言、平臺、UA、處理器與時區一致。"),
  };
}
