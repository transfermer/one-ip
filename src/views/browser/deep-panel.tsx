import { useCallback, useEffect, useRef, useState } from "react";
import {
  DataTable,
  ErrorNotice,
  Facts,
  Pending,
  ToolCard,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { toast } from "sonner";
import {
  collectDeepDiagnostics,
  type DiagnosticModule,
  type DiagnosticResult,
} from "./deep-diagnostics";
import { FormattedResult } from "./formatted-result";
import { fieldLabel, moduleReport, parseDetail } from "./result-format";
import { withDetectionAnimation } from "./with-feedback";

export function DeepPanel() {
  const [result, setResult] = useState<DiagnosticResult>();
  const [detail, setDetail] = useState<DiagnosticModule | null>(null);
  const [error, setError] = useState<Error>();
  const [busy, setBusy] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const run = useCallback(async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(undefined);
    setDetail(null);
    setResult(undefined);
    try {
      const next = await withDetectionAnimation(() =>
        collectDeepDiagnostics(active.signal),
      );
      if (!active.signal.aborted) {
        setResult(next);
        toast.success(t("深度檢測完成"));
      }
    } catch (error) {
      if (!active.signal.aborted) {
        setError(error instanceof Error ? error : new Error(t("檢測失敗")));
        toast.error(t("深度檢測失敗，請重試"));
      }
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [run]);
  const reports = result?.modules.map((module) => ({
    ...module,
    report: moduleReport(module.name, parseDetail(module.detail)),
  }));
  const flagged = reports?.filter((module) => module.report.signal) ?? [];
  const readErrors = reports?.find(
    (module) =>
      module.name === "errors" && module.report.status === t("存在讀取錯誤"),
  );
  const unavailable =
    reports?.filter((module) => module.report.unavailable) ?? [];
  return (
    <div className="mt-3">
      <ToolCard title={t("瀏覽器深度檢測")}>
        <div className="row-between gap-3">
          <p className="small muted">
            {t("基於")}{" "}
            <a
              href="https://github.com/abrahamjuliot/creepjs"
              target="_blank"
              rel="noreferrer"
            >
              {t("CreepJS 開源檢測模塊")}
            </a>
            {t("，由本站本地運行。")}
          </p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>{t("檢測中…")}</Pending>
            ) : result ? (
              t("重新檢測")
            ) : (
              t("開始深度檢測")
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <>
            <div className="my-3 rounded-lg bg-muted/50 p-3" role="status">
              <p className="font-medium">
                {flagged.length
                  ? t("{0} 個模塊發現需要覈對的信號", [flagged.length])
                  : unavailable.length || readErrors
                    ? t("已完成的檢查未發現異常信號，但檢測結果不完整")
                    : t("本次檢測未發現異常信號")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {flagged.length
                  ? flagged
                      .map((module) => fieldLabel(module.name))
                      .join("、") +
                    t("。多個模塊可能記錄同一個原因，不代表存在多個獨立問題。")
                  : t(
                      "此結論僅覆蓋本次已執行的檢查，不是瀏覽器真實性或安全性證明。",
                    )}
              </p>
              {readErrors && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {readErrors.report.summary}
                </p>
              )}
              {unavailable.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("無法檢測：")}
                  {unavailable
                    .map((module) => fieldLabel(module.name))
                    .join("、")}
                </p>
              )}
              {flagged.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {flagged.map((module) => (
                    <li key={module.name}>
                      {fieldLabel(module.name)}：{module.report.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Facts
              rows={[
                [t("源碼版本"), result.commit.slice(0, 12)],
                [t("檢測耗時"), `${result.duration} ms`],
                [
                  t("已返回數據的模塊"),
                  `${result.modules.filter((module) => module.status === t("已完成")).length}/${result.modules.length}`,
                ],
              ]}
            />
            <DataTable
              data={reports ?? []}
              columns={[
                {
                  accessorKey: "name",
                  header: t("檢測模塊"),
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        aria-label={t("查看 {0} 深度檢測詳情", [
                          row.original.name,
                        ])}
                        onClick={() => setDetail(row.original)}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  id: "status",
                  header: t("檢測結果"),
                  cell: ({ row }) => row.original.report.status,
                },
                {
                  id: "summary",
                  header: t("結果說明"),
                  cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                      {row.original.report.summary}
                    </span>
                  ),
                },
              ]}
            />
          </>
        )}
        <p className="small muted mt-3">
          {t(
            "結果來自同源獨立檢測上下文，可能與主頁面或官方站點不同。異常信號不能證明使用了指紋瀏覽器。未包含官方聯網評分和 Worker 檢測。",
          )}
        </p>
      </ToolCard>
      <ResponsiveDialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={t("{0} · 詳情", [
          detail ? fieldLabel(detail.name) : t("深度檢測"),
        ])}
        description={
          detail
            ? moduleReport(detail.name, parseDetail(detail.detail)).summary
            : t("本次檢測結果")
        }
      >
        {detail && (
          <>
            {moduleReport(detail.name, parseDetail(detail.detail)).issues
              .length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {moduleReport(
                  detail.name,
                  parseDetail(detail.detail),
                ).issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <FormattedResult
              key={detail.name}
              value={parseDetail(detail.detail)}
            />
          </>
        )}
      </ResponsiveDialog>
    </div>
  );
}
