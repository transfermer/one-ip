import { useEffect, useRef, useState } from "react";
import { CompactText } from "@/components/compact-text";
import {
  DataTable,
  Facts,
  ToolCard,
  PageHeading,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { FingerprintAlgorithm } from "./collect";
import { consistencyChecks, automationChecks, fingerprint } from "./collect";
import type { Check } from "./consistency";
import { DeepPanel } from "./deep-panel";
import { environmentRows } from "./environment";
import { FormattedResult } from "./formatted-result";
import Privacy from "./privacy";
import {
  fieldLabel,
  fingerprintSummary,
  parseDetail,
  hasResultValue,
} from "./result-format";
import { TlsFingerprint } from "./tls-fingerprint";
import { withDetectionAnimation } from "./with-feedback";

const columns: ColumnDef<Check>[] = [
  { accessorKey: "name", header: t("項目") },
  {
    accessorKey: "status",
    header: t("結果"),
    cell: ({ row }) => t(row.original.status),
  },
  {
    accessorKey: "detail",
    header: t("說明"),
    cell: ({ row }) => <CompactText text={row.original.detail} />,
  },
];
const titles: Record<string, string> = {
  environment: t("環境信息"),
  fingerprint: t("指紋檢測"),
  consistency: t("環境一致性"),
  automation: t("自動化特徵"),
  privacy: t("權限與隱私"),
};
function FingerprintPanel() {
  const [algorithm, setAlgorithm] = useState<FingerprintAlgorithm | "tls">(
    "modern",
  );
  return (
    <>
      <div className="mb-3 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {t("算法")}：
              {algorithm === "modern"
                ? "FingerprintJS (5.2.0)"
                : algorithm === "tls"
                  ? "JA3/JA4"
                  : t("FingerprintJS2（舊版）")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={algorithm}
              onValueChange={(value) => {
                if (value === "modern" || value === "legacy" || value === "tls")
                  setAlgorithm(value);
              }}
            >
              <DropdownMenuRadioItem value="modern">
                FingerprintJS (5.2.0)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="legacy">
                {t("FingerprintJS2（舊版）")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tls">
                JA3/JA4 Fingerprint
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {algorithm === "tls" ? (
        <TlsFingerprint />
      ) : (
        <FingerprintResults key={algorithm} algorithm={algorithm} />
      )}
    </>
  );
}
function FingerprintResults({
  algorithm,
}: {
  algorithm: FingerprintAlgorithm;
}) {
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof fingerprint>>>();
  const [previous, setPrevious] = useState<typeof result>();
  const [detail, setDetail] = useState<
    Awaited<ReturnType<typeof fingerprint>>["components"][number] | null
  >(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<Error>();
  const initialRun = useRef<ReturnType<typeof fingerprint> | null>(null);
  useEffect(() => {
    let active = true;
    initialRun.current ??= fingerprint(algorithm);
    void initialRun.current.then(
      (next) => {
        if (active) {
          setResult(next);
          setBusy(false);
        }
      },
      () => {
        if (active) {
          setError(new Error(t("指紋檢測未完成，請檢查瀏覽器限制後重試。")));
          setBusy(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [algorithm]);
  async function run() {
    setBusy(true);
    setError(undefined);
    try {
      const next = await withDetectionAnimation(() => fingerprint(algorithm));
      setPrevious(result);
      setResult(next);
      toast.success(t("指紋檢測完成"));
    } catch {
      toast.error(t("指紋檢測失敗，請重試"));
      setError(new Error(t("指紋檢測未完成，請檢查瀏覽器限制後重試。")));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ToolCard title={t("瀏覽器指紋")}>
        <div className="row-between gap-3">
          <p className="small muted">
            {t("在本地計算，僅比較當前頁面內的結果。")}
          </p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>{t("檢測中…")}</Pending>
            ) : result ? (
              t("再次檢測")
            ) : (
              t("開始檢測")
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <Facts
            rows={[
              [t("FingerprintJS 版本"), result.version],
              ["Visitor ID", result.visitorId],
              [
                t("與上次比較"),
                previous
                  ? previous.visitorId === result.visitorId
                    ? t("相同")
                    : t("發生變化")
                  : t("尚無上次結果"),
              ],
            ]}
          />
        )}
        <p className="small muted mt-2">
          {t("標識相同不代表同一設備；指紋不是驗證碼，也沒有“通過”結論。")}
        </p>
      </ToolCard>
      {result && (
        <div className="mt-3">
          <ToolCard title={t("指紋組成")}>
            <DataTable
              className="fingerprint-table"
              getRowId={(row) => row.name}
              data={result.components.filter((component) =>
                hasResultValue(parseDetail(component.detail)),
              )}
              columns={[
                {
                  accessorKey: "name",
                  header: t("項目"),
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        onClick={() => setDetail(row.original)}
                        aria-label={t("查看 {0} 詳情", [row.original.name])}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  accessorKey: "value",
                  header: t("檢測數據"),
                  cell: ({ row }) => (
                    <CompactText
                      text={fingerprintSummary(
                        row.original.name,
                        parseDetail(row.original.detail),
                      )}
                    />
                  ),
                },
                {
                  id: "change",
                  header: t("與上次比較"),
                  cell: ({ row }) => {
                    const before = previous?.components.find(
                      (item) => item.name === row.original.name,
                    );
                    return before
                      ? before.value === row.original.value
                        ? t("相同")
                        : t("變化")
                      : "—";
                  },
                },
              ]}
            />
          </ToolCard>
        </div>
      )}
      <ResponsiveDialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={t("{0} · 詳情", [detail ? fieldLabel(detail.name) : t("指紋")])}
        description={t("本次檢測讀取的指紋組成數據。")}
      >
        {detail && (
          <FormattedResult
            key={detail.name}
            value={parseDetail(detail.detail)}
            hash={detail.value}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}
function Checks({ page }: { page: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["browser-checks", page],
    queryFn: () =>
      page === "consistency"
        ? consistencyChecks()
        : Promise.resolve(automationChecks()),
    retry: false,
  });
  return (
    <ToolCard
      title={
        <div className="flex items-center justify-between gap-3">
          <span>{titles[page]}</span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={query.isFetching || refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await withDetectionAnimation(() =>
                  query.refetch({ throwOnError: true }),
                );
                toast.success(t("{0}檢測完成", [titles[page]]));
              } catch {
                toast.error(t("檢測失敗，請重試"));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {query.isFetching || refreshing ? (
              <Pending>{t("檢測中…")}</Pending>
            ) : (
              t("重新檢測")
            )}
          </Button>
        </div>
      }
    >
      <ErrorNotice error={query.error} />
      <DataTable
        data={query.data ?? []}
        columns={columns}
        empty={
          query.isFetching ? <Pending>{t("檢測中…")}</Pending> : t("暫無結果")
        }
      />
      <p className="small muted mt-3">
        {t(
          "僅展示可觀察到的信號，不能據此判斷瀏覽器品牌、真人身份或驗證碼通過率。",
        )}
      </p>
    </ToolCard>
  );
}
export default function BrowserPage({ page }: { page: string }) {
  return (
    <div className="browser-diagnostics">
      <PageHeading title={titles[page]} description="" />
      {page === "environment" ? (
        <ToolCard title={t("瀏覽器環境")}>
          <Facts
            rows={environmentRows().map(([name, value]) => [
              name,
              typeof value === "string" ? (
                <CompactText key={name} text={value} />
              ) : (
                value
              ),
            ])}
          />
        </ToolCard>
      ) : page === "fingerprint" ? (
        <FingerprintPanel />
      ) : page === "privacy" ? (
        <Privacy />
      ) : (
        <>
          <Checks page={page} />
          {page === "consistency" && <DeepPanel />}
        </>
      )}
    </div>
  );
}
