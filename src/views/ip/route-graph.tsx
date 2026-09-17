import { useState } from "react";
import { Pending, ToolCard } from "@/components/toolkit";
import { t } from "@/i18n";
import { endpoint, maskedIp } from "@/lib/network";
import { hideIpAtom } from "@/store/privacy";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

interface RouteItem {
  asn: string;
  name?: string;
  count: number;
  share: number;
  tier1?: boolean;
  via?: string[];
}

interface RouteEdge {
  origin: string;
  direct: string;
  count: number;
  share: number;
}

interface SecondaryEdge {
  direct: string;
  secondary: string;
  count: number;
  share: number;
}

interface RouteTopology {
  observedPaths: number;
  queryTime?: string | number;
  origins: RouteItem[];
  direct: RouteItem[];
  secondary: RouteItem[];
  edges: RouteEdge[];
  secondaryEdges: SecondaryEdge[];
}

interface IpNetwork {
  prefix?: string;
  asns?: string[];
  ptr?: string;
  routeAvailable: boolean;
  validations?: {
    asn: string;
    status: string;
  }[];
  source?: string;
  topology?: RouteTopology;
}

const GRAPH_WIDTH = 980;
const NODE_HEIGHT = 46;
const COLUMN_TOP = 30;
const COLUMN_BOTTOM_GAP = 56;
const ORIGIN_X = 20;
const ORIGIN_WIDTH = 190;
const DIRECT_X = 330;
const DIRECT_WIDTH = 176;
const SECONDARY_X = 700;
const SECONDARY_WIDTH = 200;

function validationLabel(status: string) {
  switch (status.toLowerCase()) {
    case "valid":
      return t("有效");
    case "invalid":
      return t("無效");
    case "notfound":
    case "unknown":
      return t("未聲明 ROA");
    default:
      return t("未知");
  }
}

function graphHeight(...counts: number[]) {
  const rows = Math.max(1, ...counts);
  return Math.max(260, 84 + (rows - 1) * 60);
}

function columnY(count: number, index: number, height: number) {
  if (count <= 1) return height / 2 - NODE_HEIGHT / 2;
  const last = height - COLUMN_BOTTOM_GAP - NODE_HEIGHT;
  return COLUMN_TOP + (index * (last - COLUMN_TOP)) / (count - 1);
}

function nodeCenterY(y: number) {
  return y + NODE_HEIGHT / 2;
}

function curvePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const middleX = sourceX + (targetX - sourceX) / 2;
  return `M ${sourceX} ${sourceY} C ${middleX} ${sourceY}, ${middleX} ${targetY}, ${targetX} ${targetY}`;
}

function truncateLabel(value: string, length: number) {
  const chars = Array.from(value);
  return chars.length > length
    ? `${chars.slice(0, length - 1).join("")}…`
    : value;
}

function itemName(
  item: Pick<RouteItem, "name" | "asn">,
  currentAsn?: number,
  currentAsnName?: string,
) {
  const current = currentAsn == null ? undefined : String(currentAsn);
  return (
    item.name?.trim() ||
    (item.asn === current ? currentAsnName?.trim() : undefined) ||
    t("未知")
  );
}

function asnLabel(asn: string) {
  return asn.toUpperCase().startsWith("AS") ? asn : `AS${asn}`;
}

function shareLabel(value: number) {
  return Number.isFinite(value)
    ? `${value.toFixed(1).replace(/\.0$/, "")}%`
    : "—";
}

function edgeWidth(share: number) {
  return 1.2 + Math.min(80, Math.max(0, share)) * 0.08;
}

function snapshotDate(value?: string | number) {
  if (!value) return t("當前");
  const timestamp =
    typeof value === "number" && value < 1_000_000_000_000
      ? value * 1000
      : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? t("當前")
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
}

function GraphNode({
  x,
  y,
  width,
  eyebrow,
  title,
  className = "",
}: {
  x: number;
  y: number;
  width: number;
  eyebrow: string;
  title: string;
  className?: string;
}) {
  return (
    <g
      className={`ip-route-node ${className}`}
      transform={`translate(${x},${y})`}
    >
      <rect width={width} height={NODE_HEIGHT} rx="8" />
      <text x="12" y="19" className="ip-route-node-key">
        {truncateLabel(eyebrow, 25)}
      </text>
      <text x="12" y="36" className="ip-route-node-name">
        {truncateLabel(title, width < 190 ? 24 : 28)}
      </text>
    </g>
  );
}

function RouteTopologyChart({
  topology,
  currentAsn,
  currentAsnName,
}: {
  topology: RouteTopology;
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const origins = topology.origins;
  const direct = topology.direct;
  const secondary = topology.secondary;
  const height = graphHeight(origins.length, direct.length, secondary.length);
  const originPositions = new Map(
    origins.map((item, index) => [
      item.asn,
      columnY(origins.length, index, height),
    ]),
  );
  const directPositions = new Map(
    direct.map((item, index) => [
      item.asn,
      columnY(direct.length, index, height),
    ]),
  );
  const secondaryPositions = new Map(
    secondary.map((item, index) => [
      item.asn,
      columnY(secondary.length, index, height),
    ]),
  );
  const directByAsn = new Map(direct.map((item) => [item.asn, item]));
  const current = currentAsn == null ? undefined : String(currentAsn);

  return (
    <div className="ip-route-graph-wrap">
      <svg
        className="ip-route-graph-svg"
        viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
        role="img"
        aria-label={t("{0} 的 BGP 宣告關係", [
          topology.origins.map((item) => asnLabel(item.asn)).join("、"),
        ])}
      >
        <text x={ORIGIN_X} y="16" className="ip-route-column-label">
          {t("源 AS")}
        </text>
        <text x={DIRECT_X} y="16" className="ip-route-column-label">
          {t("直接上游 · 路徑佔比")}
        </text>
        <text x={SECONDARY_X} y="16" className="ip-route-column-label">
          {t("二級上游 · 藍框 = Tier 1")}
        </text>

        <g className="ip-route-graph-edges" aria-hidden="true">
          {topology.edges.map((edge) => {
            const originY = originPositions.get(edge.origin);
            const directY = directPositions.get(edge.direct);
            if (originY == null || directY == null) return null;
            const tier1 = directByAsn.get(edge.direct)?.tier1;
            const sourceY = nodeCenterY(originY);
            const targetY = nodeCenterY(directY);
            return (
              <g key={`${edge.origin}-${edge.direct}`}>
                <path
                  className={`ip-route-edge${tier1 ? " is-tier1" : ""}`}
                  d={curvePath(
                    ORIGIN_X + ORIGIN_WIDTH,
                    sourceY,
                    DIRECT_X,
                    targetY,
                  )}
                  style={{ strokeWidth: edgeWidth(edge.share) }}
                />
                <text
                  className="ip-route-edge-label"
                  x={(ORIGIN_X + ORIGIN_WIDTH + DIRECT_X) / 2}
                  y={(sourceY + targetY) / 2 - 6}
                  textAnchor="middle"
                >
                  {shareLabel(edge.share)}
                </text>
              </g>
            );
          })}
          {topology.secondaryEdges.map((edge) => {
            const directY = directPositions.get(edge.direct);
            const secondaryY = secondaryPositions.get(edge.secondary);
            if (directY == null || secondaryY == null) return null;
            const tier1 = secondary.find(
              (item) => item.asn === edge.secondary,
            )?.tier1;
            return (
              <path
                key={`${edge.direct}-${edge.secondary}`}
                className={`ip-route-edge${tier1 ? " is-tier1" : ""}`}
                d={curvePath(
                  DIRECT_X + DIRECT_WIDTH,
                  nodeCenterY(directY),
                  SECONDARY_X,
                  nodeCenterY(secondaryY),
                )}
                style={{ strokeWidth: edgeWidth(edge.share) }}
              />
            );
          })}
        </g>

        <g>
          {origins.map((item, index) => (
            <GraphNode
              key={item.asn}
              x={ORIGIN_X}
              y={columnY(origins.length, index, height)}
              width={ORIGIN_WIDTH}
              eyebrow={asnLabel(item.asn)}
              title={itemName(item, currentAsn, currentAsnName)}
              className={`is-origin${item.asn === current ? " is-current" : ""}`}
            />
          ))}
          {direct.map((item, index) => (
            <GraphNode
              key={item.asn}
              x={DIRECT_X}
              y={columnY(direct.length, index, height)}
              width={DIRECT_WIDTH}
              eyebrow={asnLabel(item.asn)}
              title={itemName(item, currentAsn, currentAsnName)}
              className={`${item.tier1 ? "is-tier1" : ""}${item.asn === current ? " is-current" : ""}`}
            />
          ))}
          {secondary.map((item, index) => (
            <GraphNode
              key={item.asn}
              x={SECONDARY_X}
              y={columnY(secondary.length, index, height)}
              width={SECONDARY_WIDTH}
              eyebrow={asnLabel(item.asn)}
              title={itemName(item, currentAsn, currentAsnName)}
              className={`${item.tier1 ? "is-tier1" : ""}${item.asn === current ? " is-current" : ""}`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function AnnouncementChart({
  ip,
  prefix,
  asns,
  currentAsn,
  currentAsnName,
}: {
  ip: string;
  prefix: string;
  asns: string[];
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const hidden = useAtomValue(hideIpAtom);
  const displayIp = maskedIp(ip, hidden);
  const height = graphHeight(asns.length);
  const centerY = height / 2 - NODE_HEIGHT / 2;

  return (
    <div className="ip-route-graph-wrap">
      <svg
        className="ip-route-graph-svg"
        viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
        role="img"
        aria-label={t("{0} 的 BGP 宣告關係", [displayIp])}
      >
        <text x={ORIGIN_X} y="16" className="ip-route-column-label">
          {t("查詢地址")}
        </text>
        <text x={DIRECT_X} y="16" className="ip-route-column-label">
          {t("BGP 前綴")}
        </text>
        <text x={SECONDARY_X} y="16" className="ip-route-column-label">
          {t("宣告 ASN")}
        </text>
        <g className="ip-route-graph-edges" aria-hidden="true">
          <path
            className="ip-route-edge"
            d={curvePath(
              ORIGIN_X + ORIGIN_WIDTH,
              nodeCenterY(centerY),
              DIRECT_X,
              nodeCenterY(centerY),
            )}
            style={{ strokeWidth: 1.5 }}
          />
          {asns.map((asn, index) => (
            <path
              key={asn}
              className="ip-route-edge"
              d={curvePath(
                DIRECT_X + DIRECT_WIDTH,
                nodeCenterY(centerY),
                SECONDARY_X,
                nodeCenterY(columnY(asns.length, index, height)),
              )}
              style={{ strokeWidth: 1.2 }}
            />
          ))}
        </g>
        <GraphNode
          x={ORIGIN_X}
          y={centerY}
          width={ORIGIN_WIDTH}
          eyebrow={t("查詢地址")}
          title={displayIp}
          className="is-origin"
        />
        <GraphNode
          x={DIRECT_X}
          y={centerY}
          width={DIRECT_WIDTH}
          eyebrow={t("BGP 前綴")}
          title={prefix}
          className="is-prefix"
        />
        {asns.map((asn, index) => (
          <GraphNode
            key={asn}
            x={SECONDARY_X}
            y={columnY(asns.length, index, height)}
            width={SECONDARY_WIDTH}
            eyebrow={asn === String(currentAsn) ? t("當前 ASN") : t("宣告 ASN")}
            title={
              asn === String(currentAsn) && currentAsnName
                ? `${asnLabel(asn)} · ${currentAsnName}`
                : asnLabel(asn)
            }
            className={asn === String(currentAsn) ? "is-current" : ""}
          />
        ))}
      </svg>
    </div>
  );
}

function RouteList({
  topology,
  currentAsn,
  currentAsnName,
}: {
  topology: RouteTopology;
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const row = (item: RouteItem, secondary = false, showShare = true) => (
    <div
      key={`${secondary ? "secondary" : "direct"}-${item.asn}`}
      className={`ip-route-list-row${item.tier1 ? " is-tier1" : ""}${showShare ? "" : " is-origin"}`}
    >
      <div className="ip-route-list-main">
        <strong>{asnLabel(item.asn)}</strong>
        <span>
          {itemName(item, currentAsn, currentAsnName)}
          {secondary && item.via?.length ? (
            <small>{t("經 {0}", [item.via.map(asnLabel).join(" / ")])}</small>
          ) : null}
        </span>
      </div>
      {showShare && (
        <>
          <em>{shareLabel(item.share)}</em>
          <i style={{ width: `${Math.min(100, Math.max(0, item.share))}%` }} />
        </>
      )}
    </div>
  );

  return (
    <div className="ip-route-graph-list" aria-label={t("路由路徑明細")}>
      <div className="ip-route-list-heading">{t("源 AS")}</div>
      {topology.origins.map((item) => row(item, false, false))}
      <div className="ip-route-list-heading">{t("直接上游 · 路徑佔比")}</div>
      {topology.direct.map((item) => row(item))}
      {!!topology.secondary.length && (
        <>
          <div className="ip-route-list-heading">
            {t("二級上游 · 藍色 = Tier 1")}
          </div>
          {topology.secondary.map((item) => row(item, true))}
        </>
      )}
    </div>
  );
}

export default function IpRouteGraph({
  ip,
  currentAsn,
  currentAsnName,
}: {
  ip: string;
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const network = useQuery({
    queryKey: ["ip-network", ip],
    queryFn: ({ signal }) =>
      endpoint<IpNetwork>(`/ip/network/${encodeURIComponent(ip)}`, { signal }),
    staleTime: 300_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const data = network.data;
  const asns = [
    ...new Set((data?.asns ?? []).map(String).filter((asn) => asn.length > 0)),
  ];
  const topology = data?.topology;
  const title = (
    <div className="ip-route-graph-heading">
      <span className="ip-route-graph-heading-title">{t("BGP 路由拓撲")}</span>
      <button
        type="button"
        className="ip-route-graph-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t("收起") : t("展開")}
      </button>
      {topology && (
        <span className="ip-route-graph-heading-sub">
          {data?.prefix} · {topology.observedPaths.toLocaleString()}{" "}
          {t("條觀測路徑")}
        </span>
      )}
    </div>
  );

  return (
    <ToolCard title={title}>
      {expanded &&
        (network.isPending ? (
          <div className="ip-route-graph-state">
            <Pending>{t("正在讀取路由數據…")}</Pending>
          </div>
        ) : network.isError || !data?.routeAvailable || !data.prefix ? (
          <p className="ip-route-graph-state text-muted-foreground">
            {t("路由數據暫不可用")}
          </p>
        ) : topology ? (
          <>
            <div className="ip-route-graph-snapshots">
              <button
                type="button"
                className="ip-route-graph-snapshot"
                aria-current="true"
                disabled
              >
                <span>{snapshotDate(topology.queryTime)}</span>
                <small>{t("當前 · {0} 上游", [topology.direct.length])}</small>
              </button>
            </div>
            <RouteTopologyChart
              topology={topology}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            <RouteList
              topology={topology}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            {!!data.validations?.length && (
              <div className="ip-route-graph-validations">
                {data.validations.map((validation) => (
                  <span key={validation.asn}>
                    AS{validation.asn} · {validationLabel(validation.status)}
                  </span>
                ))}
              </div>
            )}
            <p className="ip-route-graph-note">
              {t(
                "當前快照來自 RIPE RIS；連線粗細 = 觀測路徑佔比，藍色 = Tier 1 骨幹。",
              )}
            </p>
          </>
        ) : (
          <>
            <div className="ip-route-graph-summary">
              <div className="min-w-0">
                <strong className="block truncate">{data.prefix}</strong>
                <span>
                  {data.source ?? "RIPE RIS / RIPEstat"}
                  {data.ptr ? ` · PTR ${data.ptr}` : ""}
                </span>
              </div>
              <span className="shrink-0">
                {asns.length} {t("個宣告 ASN")}
              </span>
            </div>
            <AnnouncementChart
              ip={ip}
              prefix={data.prefix}
              asns={asns}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            {!!data.validations?.length && (
              <div className="ip-route-graph-validations">
                {data.validations.map((validation) => (
                  <span key={validation.asn}>
                    AS{validation.asn} · {validationLabel(validation.status)}
                  </span>
                ))}
              </div>
            )}
            <p className="ip-route-graph-note">
              {t(
                "當前數據源只返回 BGP 前綴和宣告 ASN，不包含完整 AS Path；圖中展示宣告關係，不代表端到端上下游路徑。",
              )}
            </p>
          </>
        ))}
    </ToolCard>
  );
}
