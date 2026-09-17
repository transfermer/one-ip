import { useLayoutEffect, useRef, useState } from "react";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/i18n";
import { hideIpAtom } from "@/store/privacy";
import { useQueries } from "@tanstack/react-query";
import { gsap } from "gsap";
import { useAtomValue } from "jotai";
import { detectSignal, summarizeSignals } from "./score";
import { SIGNALS } from "../../../vendor/claude-environment/signals";

const labels = [
  "系統時區",
  "瀏覽器語言",
  "已安裝中文字體",
  "廠商及軟件字體",
  "WebRTC 地址暴露",
  "瀏覽器 / WebView 標記",
  "設備廠商標記",
  "日期格式區域",
  "時區偏移",
  "Emoji 渲染風格",
];

export function EnvironmentScore() {
  const content = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hidden = useAtomValue(hideIpAtom);
  const queries = useQueries({
    queries: SIGNALS.map((definition) => ({
      queryKey: ["claude-upstream-signal", definition.id],
      queryFn: () => detectSignal(definition),
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const busy = queries.some((query) => query.isFetching);
  const result = summarizeSignals(
    queries.map((query) =>
      query.isFetching || query.isError ? undefined : query.data,
    ),
  );
  const completed = queries.filter(
    (query) => !query.isFetching && !query.isPending,
  ).length;
  useLayoutEffect(() => {
    if (!content.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          "[data-scan-enter]",
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.035,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
          },
        );
      }, content);
      return () => context.revert();
    });
    return () => media.revert();
  }, [busy]);
  const hits = SIGNALS.flatMap((definition, i) =>
    !queries[i].isFetching &&
    !queries[i].isError &&
    (queries[i].data?.score ?? 0) >= 0.25
      ? [
          {
            definition,
            i,
            points:
              Math.round(queries[i].data!.score * definition.weight * 10) / 10,
          },
        ]
      : [],
  );
  const band = { low: t("低風險"), medium: t("中風險"), high: t("高風險") }[
    result.band
  ];
  const color = {
    low: "text-emerald-600",
    medium: "text-amber-600",
    high: "text-destructive",
  }[result.band];
  const recommendations = [
    ...(hits.some(
      ({ definition }) =>
        definition.id === "timezone" ||
        definition.id === "timezoneOffset" ||
        definition.id === "language" ||
        definition.id === "intlLocale",
    )
      ? [t("覈對系統時區、瀏覽器語言和區域格式是否符合實際使用環境。")]
      : []),
    ...(hits.some(({ definition }) => definition.id === "webrtcLeak")
      ? [
          t(
            "檢測到 ICE 地址候選，請在 WebRTC 頁面覈對公網地址及 UDP 路由；候選地址不一定代表泄露。",
          ),
        ]
      : []),
    ...(hits.some(({ definition }) =>
      ["fonts", "vendorFonts", "cnBrowser", "deviceVendor", "emoji"].includes(
        definition.id,
      ),
    )
      ? [
          t(
            "字體、設備和 Emoji 屬於弱環境線索，正常系統也可能命中，不建議僅爲降低分數修改或刪除它們。",
          ),
        ]
      : []),
    ...(!result.complete
      ? [
          t(
            "部分檢測未完成，請查看日誌定位失敗項，檢查網絡或瀏覽器限制後重試。",
          ),
        ]
      : []),
    t(
      "結合上方網絡卡片確認連通情況；這些環境信號不能確定 Claude 如何識別用戶，也不能預測賬號狀態。",
    ),
  ];
  function renderLogs() {
    return (
      <div
        role="log"
        aria-label={t("檢測日誌")}
        aria-live="polite"
        className="max-h-72 overflow-auto font-mono text-xs leading-6"
      >
        {SIGNALS.map((definition, i) => {
          const query = queries[i];
          const pending = query.isFetching || query.isPending;
          const unavailable =
            !pending &&
            (query.isError ||
              /unknown|unavailable/i.test(query.data?.raw ?? "unknown"));
          return (
            <div
              key={definition.id}
              className="flex items-start gap-2 border-b border-border/40 py-1 last:border-0"
            >
              <span className="shrink-0 text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  pending
                    ? "shrink-0 text-muted-foreground"
                    : unavailable
                      ? "shrink-0 text-amber-600"
                      : "shrink-0 text-emerald-600"
                }
              >
                [{pending ? t("檢測中") : unavailable ? t("未完成") : t("完成")}
                ]
              </span>
              <div className="min-w-0 flex-1 break-words">
                <span>{t(labels[i])}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {pending
                    ? t("等待結果…")
                    : query.isError
                      ? t("檢測失敗或超時")
                      : definition.id === "webrtcLeak" && hidden
                        ? t("IP 已隱藏")
                        : query.data?.raw}
                </span>
              </div>
              {!pending && !unavailable && (
                <span className="shrink-0 tabular-nums">
                  +
                  {Math.round(
                    (query.data?.score ?? 0) * definition.weight * 10,
                  ) / 10}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("Claude 中國用戶檢測")}</CardTitle>
          <ActionButton
            size="sm"
            variant="ghost"
            busy={busy}
            onClick={() => queries.forEach((query) => void query.refetch())}
          >
            {busy ? t("檢測中…") : t("重新檢測")}
          </ActionButton>
        </div>
      </CardHeader>
      <CardContent ref={content} className="space-y-3">
        <div
          className="grid gap-5 py-2 md:grid-cols-[220px_minmax(0,1fr)]"
          aria-live="polite"
        >
          <div className="space-y-2 md:border-r md:pr-5">
            <div className="flex items-baseline gap-3">
              <div className={`text-4xl font-medium tabular-nums ${color}`}>
                <NumberTicker value={result.total} />
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / 100
                </span>
              </div>
              <span className={`text-sm font-medium ${color}`}>
                {busy ? t("檢測中…") : result.complete ? band : t("檢測不完整")}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {busy
                ? t("正在檢測環境特徵…")
                : result.complete
                  ? t("環境信號評分，非 Claude 官方判定")
                  : t("當前分數僅包含已完成項目，不作完整風險分檔。")}
            </p>
          </div>
          <div
            data-scan-enter
            className="grid content-center gap-x-8 gap-y-2 sm:grid-cols-2"
          >
            {hits.map(({ definition, i, points }) => (
              <div
                key={definition.id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border/50 py-2 text-sm"
              >
                <span className="text-muted-foreground">{t(labels[i])}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  +{points}
                </span>
              </div>
            ))}
            {!busy && !hits.length && (
              <span className="text-sm text-muted-foreground">
                {t("本次無命中信號")}
              </span>
            )}
            {busy && (
              <p
                className="col-span-full text-xs text-muted-foreground"
                role="status"
              >
                {t("檢測進度：{0}/{1}", [completed, SIGNALS.length])}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <details className="min-w-0 flex-1 text-sm">
            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
              {t("建議與檢測說明")}
            </summary>
            <div className="mt-3 space-y-3 pr-3 text-xs leading-6 text-muted-foreground">
              {!busy && (
                <ul className="list-disc space-y-1 pl-4">
                  {recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <p>
                {t(
                  "採用開源項目的 10 項檢測與原始權重。分數爲項目啓發式規則，不是 Claude 官方判定或封禁概率；Emoji 項使用 UA 推測。",
                )}
              </p>
              <a
                href="https://github.com/LinXiaoTao/FuckClaude"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {t("檢測源碼：FuckClaude（MIT）")}
              </a>
            </div>
          </details>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 self-start text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            {t("查看檢測日誌")}
          </Button>
        </div>
        <ResponsiveDialog
          open={open}
          onOpenChange={setOpen}
          title={t("檢測日誌")}
          description={t("本次檢測結果與各項環境信號詳情。")}
        >
          {renderLogs()}
        </ResponsiveDialog>
      </CardContent>
    </Card>
  );
}
