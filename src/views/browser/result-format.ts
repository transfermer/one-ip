import { t } from "@/i18n";

export const labels: Record<string, string> = {
  navigator: t("瀏覽器環境"),
  canvas: t("Canvas 繪圖"),
  audio: t("音頻指紋"),
  webgl: t("WebGL 圖形"),
  fonts: t("字體列表"),
  clientRects: t("元素佈局"),
  ClientRects: t("元素佈局"),
  screen: t("屏幕信息"),
  timezone: t("時區"),
  headless: t("無頭瀏覽器特徵"),
  prototypeLies: t("原型接口異常"),
  lies: t("數據一致性異常"),
  errors: t("讀取錯誤"),
  userAgentData: t("瀏覽器客戶端提示"),
  domBlockers: t("內容攔截特徵"),
  fontPreferences: t("字體渲染偏好"),
  screenFrame: t("屏幕邊距"),
  osCpu: t("系統與處理器"),
  languages: t("語言列表"),
  colorDepth: t("色深"),
  deviceMemory: t("內存提示"),
  screenResolution: t("屏幕分辨率"),
  hardwareConcurrency: t("邏輯處理器"),
  sessionStorage: t("會話存儲"),
  localStorage: t("本地存儲"),
  indexedDB: t("IndexedDB 數據庫"),
  openDatabase: t("Web SQL 數據庫"),
  cpuClass: t("處理器類別"),
  platform: t("系統平臺"),
  plugins: t("瀏覽器插件"),
  touchSupport: t("觸控能力"),
  vendor: t("廠商"),
  vendorFlavors: t("瀏覽器廠商特徵"),
  cookiesEnabled: t("Cookie 支持"),
  colorGamut: t("色域"),
  invertedColors: t("反色偏好"),
  forcedColors: t("強制顏色模式"),
  monochrome: t("單色色階"),
  contrast: t("對比度偏好"),
  reducedMotion: t("減少動畫"),
  reducedTransparency: t("減少透明度"),
  hdr: t("高動態範圍"),
  math: t("數學運算指紋"),
  pdfViewerEnabled: t("內置 PDF 閱讀器"),
  architecture: t("架構特徵"),
  applePay: t("Apple Pay 狀態"),
  privateClickMeasurement: t("私密點擊歸因狀態"),
  audioBaseLatency: t("音頻基礎延遲"),
  dateTimeLocale: t("日期時間區域"),
  webGlBasics: t("WebGL 基礎信息"),
  webGlExtensions: t("WebGL 擴展與參數"),
  brands: t("瀏覽器品牌"),
  brand: t("品牌"),
  version: t("版本"),
  mobile: t("移動設備"),
  bitness: t("架構位數"),
  model: t("設備型號"),
  platformVersion: t("系統版本"),
  userAgent: t("用戶代理"),
  appVersion: t("應用版本"),
  language: t("首選語言"),
  maxTouchPoints: t("最大觸控點數"),
  touchEvent: t("觸控事件"),
  touchStart: t("觸控事件入口"),
  renderer: t("渲染器"),
  unmaskedRenderer: t("顯卡渲染器"),
  unmaskedVendor: t("顯卡廠商"),
  shadingLanguageVersion: t("着色語言版本"),
  width: t("寬度"),
  height: t("高度"),
  availWidth: t("可用寬度"),
  availHeight: t("可用高度"),
  pixelDepth: t("像素深度"),
  lied: t("檢測到數據差異"),
  chromium: t("Chromium 內核"),
  likeHeadless: t("類似無頭環境的信號"),
  stealth: t("接口異常信號"),
  data: t("記錄"),
  totalLies: t("異常記錄數"),
  trustedName: t("錯誤類型"),
  trustedMessage: t("錯誤說明"),
  permissions: t("權限狀態"),
  parameters: t("圖形參數"),
  extensions: t("擴展列表"),
  systemFonts: t("系統字體特徵"),
  platformEstimate: t("平臺推測數據"),
  fontsOS: t("字體對應系統"),
  emojiSet: t("表情渲染樣本"),
  sampleSum: t("音頻採樣總和"),
  noise: t("音頻噪聲特徵"),
  values: t("採樣參數"),
  dataURI: t("繪圖樣本"),
  dataURI2: t("第二繪圖樣本"),
  pixels: t("像素數據"),
  pixels2: t("第二組像素數據"),
  winding: t("路徑填充支持"),
  geometry: t("幾何圖形樣本"),
  text: t("文字繪圖樣本"),
  noChrome: t("缺少 Chrome 全局對象"),
  hasPermissionsBug: t("通知權限狀態不一致"),
  noPlugins: t("插件列表爲空"),
  noMimeTypes: t("MIME 類型列表爲空"),
  notificationIsDenied: t("通知權限被拒絕"),
  hasKnownBgColor: t("命中特定背景顏色"),
  prefersLightColor: t("偏好淺色外觀"),
  uaDataIsBlank: t("客戶端提示爲空"),
  pdfIsDisabled: t("內置 PDF 閱讀器未啓用"),
  screenIsAwry: t("屏幕參數存在差異"),
  noTaskbar: t("未觀察到任務欄預留空間"),
  noWebShare: t("未提供 Web Share"),
  noContentIndex: t("未提供內容索引"),
  noContactsManager: t("未提供聯繫人接口"),
  noDownlinkMax: t("未提供最大下行帶寬"),
  webDriverIsOn: t("WebDriver 狀態或接口異常"),
  hasHeadlessUA: t("UA 含 Headless 標記"),
  hasIframeProxy: t("iframe 接口存在異常"),
  hasHighChromeIndex: t("Chrome 對象出現位置異常"),
  hasBadChromeRuntime: t("Chrome Runtime 行爲異常"),
  hasToStringProxy: t("函數字符串轉換異常"),
};
export function fieldLabel(key: string) {
  return labels[key] ?? key;
}
export function parseDetail(detail: string | undefined): unknown {
  if (detail === undefined) return undefined;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function valueText(value: unknown): string {
  if (value === null || value === undefined) return t("未提供");
  if (typeof value === "boolean") return value ? t("是") : t("否");
  if (typeof value === "string") {
    if (!value) return t("空值");
    if (value.startsWith("data:image/")) return t("繪圖樣本（可查看預覽）");
    return value.length > 160
      ? t("{0}…（共 {1} 字符）", [value.slice(0, 160), value.length])
      : value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return t("空列表（0 項）");
    if (value.every((item) => item === null || typeof item !== "object"))
      return (
        value.map(valueText).slice(0, 5).join("、") +
        (value.length > 5 ? t(" 等 {0} 項", [value.length]) : "")
      );
    return t("{0} 項記錄", [value.length]);
  }
  if (typeof value === "object")
    return t("{0} 個字段", [Object.keys(value).length]);
  return String(value);
}
export function fingerprintSummary(name: string, value: unknown) {
  if (value === null || value === undefined) return t("未提供");
  const data = asRecord(value);
  if (name === "userAgentData")
    return [
      valueText(data.brands),
      data.platform,
      data.architecture,
      data.bitness ? t("{0} 位", [data.bitness]) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  if (name === "languages" && Array.isArray(value))
    return value.flat().map(valueText).join("、");
  if (name === "screenResolution" && Array.isArray(value))
    return value.join(" × ");
  if (name === "deviceMemory" && typeof value === "number")
    return t("{0} GB（近似值）", [value]);
  if (name === "hardwareConcurrency") return t("{0} 個邏輯處理器", [value]);
  if (name === "fonts" && Array.isArray(value))
    return t("{0} 種字體 · {1}", [value.length, value.slice(0, 3).join("、")]);
  if (name === "canvas") return t("已生成文字與幾何繪圖樣本");
  if (name === "webGlBasics")
    return String(
      data.unmaskedRenderer || data.renderer || t("已讀取圖形接口信息"),
    );
  if (name === "audio" && typeof value === "number" && value < 0)
    return t("未取得有效音頻指紋（點擊查看狀態碼）");
  return valueText(value);
}
export type ModuleReport = {
  status: string;
  summary: string;
  signal: boolean;
  unavailable: boolean;
  issues: string[];
};
export function moduleReport(name: string, value: unknown): ModuleReport {
  const result = (
    status: string,
    summary: string,
    issues: string[] = [],
    unavailable = false,
  ): ModuleReport => ({
    status,
    summary,
    issues,
    signal: issues.length > 0,
    unavailable,
  });
  if (value === null || value === undefined)
    return result(
      t("無法檢測"),
      t("未取得結果，可能不支持該接口或讀取受限。"),
      [],
      true,
    );
  const data = asRecord(value);
  if (name === "prototypeLies" || name === "lies") {
    const records = name === "lies" ? asRecord(data.data) : data;
    const issues = Object.entries(records)
      .filter(([, entries]) => Array.isArray(entries) && entries.length)
      .map(([key, entries]) =>
        t("{0}：{1} 條異常記錄", [key, (entries as unknown[]).length]),
      );
    return result(
      issues.length ? t("發現異常信號") : t("未發現異常信號"),
      issues.length
        ? t("{0} 個接口有異常記錄，點擊查看具體原因。", [issues.length])
        : t("本次檢查未記錄接口異常，不代表所有接口都已驗證。"),
      issues,
    );
  }
  if (name === "headless") {
    const issues = ["headless", "likeHeadless", "stealth"].flatMap((group) =>
      Object.entries(asRecord(data[group]))
        .filter(([, hit]) => hit === true)
        .map(([key]) => fieldLabel(key)),
    );
    return result(
      issues.length ? t("發現相關信號") : t("未發現相關信號"),
      issues.length
        ? t("{0} 項信號：{1}。普通瀏覽器設置也可能觸發。", [
            issues.length,
            issues.slice(0, 3).join("、"),
          ])
        : t("已執行的檢查未命中無頭或接口異常特徵。"),
      issues,
    );
  }
  if (name === "errors") {
    const errors = Array.isArray(data.data) ? data.data : [];
    return result(
      errors.length ? t("存在讀取錯誤") : t("無讀取錯誤"),
      errors.length
        ? t("{0} 條讀取錯誤，相關檢測可能不完整；這不是僞裝結論。", [
            errors.length,
          ])
        : t("採集過程中未記錄讀取錯誤。"),
    );
  }
  if (data.lied === true || (typeof data.lied === "number" && data.lied > 0))
    return result(
      t("發現差異"),
      t("模塊記錄了數據或接口差異，請結合詳情覈對。"),
      [t("檢測模塊的差異標記已觸發")],
    );
  const observed =
    name === "fonts" && Array.isArray(data.fonts)
      ? t("讀取到 {0} 種字體。", [data.fonts.length])
      : name === "webgl"
        ? String(
            asRecord(data.parameters).UNMASKED_RENDERER_WEBGL ??
              t("已讀取圖形參數。"),
          )
        : name === "timezone"
          ? String(data.location ?? data.zone ?? t("已讀取時區信息。"))
          : t("已取得檢測數據。");
  return result(
    data.lied === false || data.lied === 0 ? t("未發現差異") : t("已讀取"),
    observed +
      (data.lied === false || data.lied === 0
        ? t(" 本模塊未標記差異。")
        : t(" 未提供明確的差異判定。")),
  );
}

export function hasResultValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
