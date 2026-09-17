import { Fragment, memo, useState } from "react";
import { LatencyBadge } from "@/components/latency-badge";
import { SiteLogo } from "@/components/site-logo";
import { Pending, ToolCard } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { t } from "@/i18n";
import {
  Star,
  Info,
  BrainCircuit,
  ShoppingBag,
  MessagesSquare,
  Bitcoin,
  Play,
  Gamepad2,
  Briefcase,
  Code2,
  Cloud,
  Search,
  House,
  Mail,
} from "lucide-react";
import {
  accessRating,
  averageAccessRating,
  evidenceState,
  qualityRating,
  type Evidence,
  type EvidenceState,
} from "./scenario-evidence";
import {
  scenarioGroups,
  type ScenarioGroup,
  type ScenarioTarget,
} from "./scenario-targets";
import type { useIpLatency } from "./use-ip-latency";
import { useScenarioAccess } from "./use-scenario-access";
import { useScenarioEvidence } from "./use-scenario-evidence";

const stateLabels: Record<EvidenceState, string> = {
  unmeasured: t("待檢測"),
  running: t("檢測中…"),
  complete: t("已取得證據"),
  partial: t("證據不完整"),
  failed: t("請求被拒絕"),
  "rate-limited": t("檢測限流"),
  unverifiable: t("無法覈驗"),
  mismatch: t("出口不匹配"),
  expired: t("結果已過期"),
  cancelled: t("已取消"),
};
const stateTone = (state: EvidenceState) =>
  ["unmeasured", "cancelled", "unverifiable"].includes(state)
    ? "secondary"
    : state === "complete"
      ? "success"
      : state === "failed"
        ? "danger"
        : ["partial", "mismatch", "expired", "rate-limited"].includes(state)
          ? "warning"
          : "info";
const metricLabels: Record<string, string> = {
  latency: t("空載延遲"),
  jitter: t("抖動"),
  download: t("下載速度"),
  upload: t("上傳速度"),
  downLoadedLatency: t("下載負載延遲"),
  upLoadedLatency: t("上傳負載延遲"),
  packetLoss: t("UDP 丟包率"),
  latencySamples: t("延遲樣本不足"),
  packetSamples: t("UDP 樣本不足"),
  loadedSamples: t("負載延遲樣本不足"),
  downloadSamples: t("下載樣本不足"),
  uploadSamples: t("上傳樣本不足"),
  aimScore: t("AIM 評分未產生"),
};
export function ScenarioStars({
  stars,
  showValue = true,
}: {
  stars: number;
  showValue?: boolean;
}) {
  return (
    <span
      className="ip-scenario-stars"
      data-rating={Math.floor(stars)}
      aria-label={t("評分：{0}/5", [stars])}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className="ip-scenario-star" aria-hidden="true">
          <Star size={12} />
          <span
            className="ip-scenario-star-fill"
            style={{
              width: `${Math.min(1, Math.max(0, stars - index)) * 100}%`,
            }}
          >
            <Star size={12} className="is-filled" />
          </span>
        </span>
      ))}
      {showValue && <span>{stars}/5</span>}
    </span>
  );
}
function EvidenceDetails({ evidence }: { evidence: Evidence }) {
  const readable = evidence.samples.filter(
    (sample) => sample.outcome === "readable",
  ).length;
  const opaque = evidence.samples.filter(
    (sample) => sample.outcome === "opaque",
  ).length;
  const elapsed = evidence.samples
    .filter(
      (sample) => sample.outcome === "readable" || sample.outcome === "opaque",
    )
    .map((sample) => sample.elapsedMs)
    .sort((a, b) => a - b);
  const median = elapsed.length
    ? Math.round(
        (elapsed[Math.floor((elapsed.length - 1) / 2)] +
          elapsed[Math.floor(elapsed.length / 2)]) /
          2,
      )
    : null;
  return (
    <div className="ip-measurement-detail">
      <p>
        {t("測量來源")}：{evidence.source} · {evidence.protocol} ·{" "}
        {evidence.addressFamily === "unknown"
          ? t("地址族未覈驗")
          : evidence.addressFamily}
      </p>
      <p>
        {evidence.direction === "probe-inbound"
          ? t("遠端探針 → 查詢 IP")
          : t("當前瀏覽器 → 目標服務")}
        ：<span className="break-all">{evidence.target}</span>
      </p>
      {evidence.direction === "browser-outbound" && (
        <p>
          {t("測量出口")}：{evidence.egressBefore ?? t("未知")} →{" "}
          {evidence.egressAfter ?? t("未知")}
        </p>
      )}
      <p>
        {t("檢測時間")}：{new Date(evidence.checkedAt).toLocaleTimeString()} ·{" "}
        {t("有效期 5 分鐘")}
      </p>
      {!!evidence.samples.length && (
        <>
          <p>
            {t("樣本 {0} 次，可讀響應 {1} 次，不透明響應 {2} 次", [
              evidence.samples.length,
              readable,
              opaque,
            ])}
            {median !== null && ` · ${t("HTTP 耗時中位數")} ${median} ms`}
          </p>
          <p>
            {t("HTTP 狀態")}：
            {[
              ...new Set(
                evidence.samples.map((sample) => sample.status).filter(Boolean),
              ),
            ].join(" / ") || t("無法讀取")}
          </p>
        </>
      )}
      {evidence.metrics && (
        <dl className="ip-measurement-metrics">
          {Object.entries(metricLabels)
            .filter(([key]) => key in evidence.metrics!)
            .map(([key, label]) => {
              const value =
                evidence.metrics![key as keyof typeof evidence.metrics];
              return (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {typeof value !== "number" || !Number.isFinite(value)
                      ? t("未知")
                      : key === "packetLoss"
                        ? `${(value * 100).toFixed(1)}%`
                        : key === "download" || key === "upload"
                          ? `${(value / 1e6).toFixed(1)} Mbps`
                          : `${Math.round(value)} ms`}
                  </dd>
                </div>
              );
            })}
        </dl>
      )}
      <details>
        <summary>{t("查看原始樣本")}</summary>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px]">
          {JSON.stringify(evidence.raw ?? evidence.samples, null, 2)}
        </pre>
      </details>
    </div>
  );
}
function AccessRows({
  targets,
  records,
  ip,
  now,
}: {
  targets: ScenarioTarget[];
  records: Record<string, Evidence>;
  ip: string;
  now: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="data-table connectivity-table ip-platform-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("網站")}</TableHead>
            <TableHead>{t("測試記錄")}</TableHead>
            <TableHead>{t("延遲")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((target, index) => {
            const evidence = records[target.url];
            const rating = accessRating(evidence, ip, now);
            const running = !evidence || evidence.state === "running";
            const status = rating.stale
              ? t("結果已過期")
              : evidence?.state === "cancelled"
                ? t("已取消")
                : evidence?.state === "rate-limited"
                  ? t("檢測限流")
                  : evidence?.state === "failed"
                    ? t("請求被拒絕")
                    : rating.responses
                      ? rating.fluctuating
                        ? t("本輪有波動")
                        : t("已取得響應")
                      : running
                        ? t("檢測中…")
                        : evidence?.samples.some(
                              (sample) => sample.error === "network",
                            )
                          ? t("檢測受阻")
                          : t("檢測超時");
            const open = expanded === target.url;
            const toggle = () => setExpanded(open ? null : target.url);
            return (
              <Fragment key={target.url}>
                <TableRow
                  data-alt={index % 2}
                  className="ip-platform-row"
                  onClick={toggle}
                >
                  <TableCell>
                    <button
                      type="button"
                      className="site-cell ip-platform-name"
                      aria-expanded={open}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle();
                      }}
                    >
                      <SiteLogo
                        src={target.icon}
                        website={target.website ?? target.url}
                      />
                      <span>{target.name}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div
                      className="ping-dots"
                      aria-label={t("取得響應 {0}/{1}", [
                        rating.responses,
                        rating.total,
                      ])}
                    >
                      {Array.from({ length: 8 }, (_, sampleIndex) => {
                        const sample = evidence?.samples[sampleIndex];
                        const good =
                          sample &&
                          ["readable", "opaque"].includes(sample.outcome);
                        return (
                          <span
                            key={sampleIndex}
                            className={`ping-dot ${!sample ? "" : !good ? "dot-fail" : sample.elapsedMs < 100 ? "dot-good" : sample.elapsedMs < 400 ? "dot-warn" : "dot-slow"}`}
                            title={
                              !sample
                                ? t("未採樣")
                                : good
                                  ? `${sample.elapsedMs} ms · ${sample.status ? `HTTP ${sample.status}` : t("不透明響應")}`
                                  : sample.status
                                    ? `HTTP ${sample.status}`
                                    : t("檢測受阻")
                            }
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rating.median !== null &&
                    !rating.stale &&
                    !["failed", "rate-limited", "cancelled"].includes(
                      evidence?.state ?? "",
                    ) ? (
                      <LatencyBadge
                        result={{
                          median: rating.median,
                          samples: evidence!.samples.map((sample) =>
                            ["opaque", "readable"].includes(sample.outcome)
                              ? sample.elapsedMs
                              : -1,
                          ),
                        }}
                        running={running}
                      />
                    ) : (
                      <Badge variant={running ? "secondary" : "warning"}>
                        {running ? <Pending>{status}</Pending> : status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="ip-platform-evidence">
                    <TableCell colSpan={3}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {rating.scope === "ip"
                            ? t("該 IP 實測")
                            : rating.scope === "different"
                              ? t("出口不同")
                              : t("當前網絡實測")}
                        </span>
                        <span>{status}</span>
                        {rating.stars !== null && (
                          <ScenarioStars stars={rating.stars} />
                        )}
                      </div>
                      {rating.scope === "different" && (
                        <p>
                          {t(
                            "出口與查詢 IP 不一致，星級僅描述當前網絡訪問表現。",
                          )}
                        </p>
                      )}
                      {evidence && <EvidenceDetails evidence={evidence} />}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const scenarioIcons = {
  ai: BrainCircuit,
  commerce: ShoppingBag,
  social: MessagesSquare,
  crypto: Bitcoin,
  streaming: Play,
  gaming: Gamepad2,
  remote: Briefcase,
  api: Code2,
  hosting: Cloud,
  search: Search,
  domestic: House,
  communication: Mail,
};

const platformCount = new Set(
  scenarioGroups.flatMap((group) => group.targets.map((target) => target.url)),
).size;

// Only visible rating/coverage changes rerender a row; raw sample updates stay in the dialog.
const ScenarioSummaryRow = memo(function ScenarioSummaryRow({
  group,
  average,
  rated,
  dots,
  busy,
  onSelect,
}: {
  group: ScenarioGroup;
  average: number | null;
  rated: number;
  dots: string;
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = scenarioIcons[group.id as keyof typeof scenarioIcons];
  const states = dots.split(",");
  const partial = average !== null && rated < group.targets.length;
  return (
    <TableRow
      className="ip-scenario-table-row"
      onClick={() => onSelect(group.id)}
    >
      <TableCell>
        <button
          type="button"
          className="site-cell ip-platform-name"
          aria-haspopup="dialog"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(group.id);
          }}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span>{group.label}</span>
        </button>
      </TableCell>
      <TableCell>
        <div className="ip-scenario-progress">
          <div
            className="ping-dots"
            aria-label={t("已評 {0}/{1}", [rated, group.targets.length])}
          >
            {group.targets.map((target, index) => (
              <span
                key={target.url}
                className={`ping-dot ${states[index] === "_" ? "" : states[index] === "!" ? "dot-fail" : "dot-good"}`}
                title={`${target.name} · ${states[index] === "_" ? t("檢測中…") : states[index] === "!" ? t("證據不足") : `${states[index]}/5`}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {rated}/{group.targets.length}
          </span>
          <span
            className="ip-scenario-partial"
            data-visible={partial}
            title={partial ? t("部分結果") : undefined}
            aria-label={partial ? t("部分結果") : undefined}
            aria-hidden={!partial}
          >
            <Info size={11} aria-hidden="true" />
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="ip-scenario-rating">
          {average !== null ? (
            <ScenarioStars stars={average} showValue={false} />
          ) : (
            <Badge variant="secondary">
              {busy ? <Pending>{t("檢測中…")}</Pending> : t("證據不足")}
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

export function ScenarioPanel({
  ip,
  inbound,
}: {
  ip: string;
  inbound: ReturnType<typeof useIpLatency>;
}) {
  const { records, busy, now, run, cancel } = useScenarioEvidence(ip);
  const access = useScenarioAccess(ip);
  const [selected, setSelected] = useState<string | null>(null);
  const group = scenarioGroups.find((item) => item.id === selected);
  const summary = (targets: ScenarioTarget[]) =>
    averageAccessRating(
      targets.map((target) => access.records[target.url]),
      ip,
      now,
    );
  const average = group ? summary(group.targets) : null;
  const key = group?.inbound ? "https" : "quality";
  const evidence = records[key];
  const quality = group?.quality
    ? qualityRating(evidence, ip, group.quality, now)
    : null;
  const state = quality?.state ?? evidenceState(evidence, ip, now);
  const hasTurn = Boolean(
    import.meta.env.VITE_SPEEDTEST_TURN_URI &&
    import.meta.env.VITE_SPEEDTEST_TURN_CREDENTIALS_URL,
  );
  const manual = (
    <>
      <div className="my-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(busy) || inbound.busy || access.busy}
          onClick={() => void run(key)}
        >
          {group?.inbound ? t("檢測 HTTPS 入站") : t("開始網絡質量測試")}
        </Button>
        {busy === key && (
          <Button size="sm" variant="ghost" onClick={cancel}>
            {t("取消")}
          </Button>
        )}
        <Badge variant={stateTone(state)}>
          {state === "running" ? (
            <Pending>{stateLabels[state]}</Pending>
          ) : (
            stateLabels[state]
          )}
        </Badge>
      </div>
      {state === "mismatch" && (
        <p>{t("觀察到的出口與查詢 IP 不一致，此結果不能給該 IP 評分。")}</p>
      )}
      {state === "unverifiable" && (
        <p>{t("無法讀取目標響應或確認出口歸屬，不能判爲 IP 不可用。")}</p>
      )}
      {state === "expired" && <p>{t("舊結果只供查看，請重新檢測。")}</p>}
      {!!quality?.missing.length && (
        <p>
          {t("缺少有效證據")}：
          {quality.missing.map((name) => metricLabels[name] ?? name).join("、")}
        </p>
      )}
      {evidence && <EvidenceDetails evidence={evidence} />}
      {quality?.stars != null && (
        <>
          <ScenarioStars stars={quality.stars} />
          <p>
            {t(
              "AIM 五檔對應 1–5 星，僅描述本次瀏覽器網絡測量，不能證明賬號或地區可用。",
            )}
          </p>
        </>
      )}
    </>
  );
  return (
    <ToolCard title={t("應用場景評分")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="ip-scenario-intro !mb-0">
          {t("自動檢測 {0} 類場景、{1} 個平臺，點擊場景查看詳情。", [
            scenarioGroups.length,
            platformCount,
          ])}
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={access.busy ? access.cancel : access.start}
        >
          {access.busy ? <Pending>{t("停止檢測")}</Pending> : t("重新測試")}
        </Button>
      </div>
      <div className="data-table connectivity-table ip-scenario-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("應用場景")}</TableHead>
              <TableHead>{t("檢測覆蓋")}</TableHead>
              <TableHead>{t("平均評分")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarioGroups.map((item) => {
              const result = summary(item.targets);
              const dots = item.targets
                .map((target) => {
                  const record = access.records[target.url];
                  const rating = accessRating(record, ip, now);
                  return rating.stars !== null
                    ? String(rating.stars)
                    : !record || record.state === "running"
                      ? "_"
                      : "!";
                })
                .join(",");
              return (
                <ScenarioSummaryRow
                  key={item.id}
                  group={item}
                  average={result.average}
                  rated={result.rated}
                  dots={dots}
                  busy={access.busy}
                  onSelect={setSelected}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ResponsiveDialog
        open={!!group}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={group?.label ?? t("應用場景評分")}
        description={t("當前網絡訪問評分；點擊平臺查看採樣與出口證據。")}
      >
        {group && average && (
          <div className="ip-scenario-dialog space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{t("平均訪問評分")}</span>
              {average.average !== null ? (
                <ScenarioStars stars={average.average} />
              ) : (
                <Badge variant="secondary">{t("證據不足")}</Badge>
              )}
              <p className="w-full text-muted-foreground">
                {t(
                  "已評 {0}/{1}，至少 {2} 個平臺有效才生成均分；未評分項不計入。",
                  [average.rated, average.total, average.required],
                )}
              </p>
              {average.rated < average.total && (
                <Badge variant="warning">
                  {access.busy ? (
                    <Pending>{t("檢測中…")}</Pending>
                  ) : (
                    t("部分結果")
                  )}
                </Badge>
              )}
            </div>
            <AccessRows
              key={group.id}
              targets={group.targets}
              records={access.records}
              ip={ip}
              now={now}
            />
            {group.quality && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("完整網絡質量檢測")}
                </summary>
                <p>
                  {t(
                    "網站接入評分不代表遊戲對戰、視頻會議或播放質量；完整質量需要帶寬、抖動與丟包證據。",
                  )}
                </p>
                <p>
                  {t(
                    "測試當前瀏覽器到 Cloudflare 與配置的 TURN 服務，不代表所有目標平臺的線路。",
                  )}
                </p>
                <p>
                  {t(
                    "最多約 70 MB 測量流量，最長 2 分鐘；三個性能場景共用一次結果。",
                  )}
                </p>
                {!hasTurn && (
                  <p>
                    {t(
                      "未配置 TURN 丟包檢測；可測帶寬和延遲，但缺少 UDP 證據時不生成星級。",
                    )}
                  </p>
                )}
                {manual}
              </details>
            )}
            {group.inbound && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("查詢 IP 入站檢測")}
                </summary>
                <p>
                  {t(
                    "上方評分僅代表雲平臺網站訪問，不代表查詢 IP 可以部署網站。",
                  )}
                </p>
                <p>
                  {t(
                    "遠端探針檢查此 IP 的 HTTPS 443，不使用瀏覽器出口代替；證書或 Host 不匹配也可能導致失敗。",
                  )}
                </p>
                <div className="my-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={inbound.busy || Boolean(busy) || access.busy}
                    onClick={() => void inbound.start()}
                  >
                    {t("檢測 ICMP 入站")}
                  </Button>
                  {inbound.busy && (
                    <Button size="sm" variant="ghost" onClick={inbound.cancel}>
                      {t("取消")}
                    </Button>
                  )}
                </div>
                {inbound.data && (
                  <p>
                    {t("ICMP 已返回 {0} 個探針；不回包不代表 HTTPS 不可達。", [
                      inbound.data.results.length,
                    ])}
                  </p>
                )}
                {inbound.error && (
                  <p className="text-destructive">{inbound.error}</p>
                )}
                {manual}
              </details>
            )}
            <p className="text-muted-foreground">
              {t(
                "僅檢測公開端點響應，不透明響應無法讀取 HTTP 狀態；不代表登錄、對話、播放、地區授權或賬號安全。",
              )}
            </p>
          </div>
        )}
      </ResponsiveDialog>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">{t("評分依據與檢測範圍")}</summary>
        <p className="mt-2">
          {t(
            "每個平臺至少 3 次有效響應；場景至少 3 個平臺且覆蓋 60% 後取星級均值，保留一位小數。",
          )}
        </p>
        <p>
          {t(
            "按 HTTP 響應耗時中位數評級：≤150 / 300 / 600 / 1000 / >1000 ms 對應 5 / 4 / 3 / 2 / 1 星；這是本站訪問速度參考。",
          )}
        </p>
        <p>
          {t(
            "先完成基礎採樣再補齊至最多 8 次，整輪上限 20 秒。覆蓋圓點代表各平臺，詳情圓點代表單次請求。",
          )}
        </p>
        <p>
          {t(
            "僅檢測公開端點響應，不透明響應無法讀取 HTTP 狀態；不代表登錄、對話、播放、地區授權或賬號安全。",
          )}
        </p>
      </details>
    </ToolCard>
  );
}
