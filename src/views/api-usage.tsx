import { t } from "@/i18n";
import { ApiCodeBlock } from "./api-code-block";

const example = JSON.stringify(
  {
    ip: "203.0.113.10",
    source: "Net.Coffee",
    checked_at: "2026-09-11T08:00:00.000Z",
    score: 85,
    status: "good",
    country: "Singapore",
    region: null,
    city: "Singapore",
    isp: "Example ISP",
    asn: 64496,
    flags: {
      residential: true,
      datacenter: false,
      mobile: false,
      vpn: false,
      proxy: false,
      tor: false,
      crawler: false,
      abuser: false,
    },
  },
  null,
  2,
);

export default function ApiUsagePage() {
  const endpoint = `${window.location.origin}/api/ip/health`;
  const command = `curl -fsS '${endpoint}'`;
  return (
    <article className="api-usage mx-auto max-w-4xl space-y-6 py-4 sm:py-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("我的 IP 信息 API")}
      </h1>
      <p className="leading-7 text-muted-foreground">
        {t(
          "One IP 提供公開 API，可查詢請求出口的 IP、位置信息、ASN、信譽分和風險標記，無需 API Key。",
        )}
      </p>
      <p className="break-words leading-7">
        {t("接口地址：")}{" "}
        <a
          className="text-primary underline underline-offset-4"
          href={endpoint}
          target="_blank"
          rel="noreferrer"
        >
          {endpoint}
        </a>
      </p>
      <ApiCodeBlock code={command} language="bash" />
      <a
        className="inline-block text-sm text-primary hover:underline"
        href="https://huzhihui.com/blog/one-ip-guide"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("完整使用文檔")} ↗
      </a>
      <p className="text-sm leading-6 text-muted-foreground">
        {t(
          "添加 ?ip=1.1.1.1 可查詢指定公網 IPv4 / IPv6；添加 ?format=text 返回終端文本。",
        )}
      </p>
      <section className="space-y-4 pt-6">
        <h2 className="text-2xl font-semibold">{t("示例輸出")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("以下爲示意數據，並非實時查詢結果。")}
        </p>
        <ApiCodeBlock code={example} language="json" />
        <p className="text-sm leading-6 text-muted-foreground">
          {t(
            "信譽分越高越好；未知字段爲 null。接口有頻率限制，收到 429 後請稍後重試。",
          )}
        </p>
      </section>
    </article>
  );
}
