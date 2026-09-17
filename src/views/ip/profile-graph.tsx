import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ToolCard } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import {
  BarChart,
  ScatterChart,
  type BarSeriesOption,
  type ScatterSeriesOption,
} from "echarts/charts";
import {
  GridComponent,
  GraphicComponent,
  type GridComponentOption,
  type GraphicComponentOption,
} from "echarts/components";
import {
  init,
  graphic,
  use as registerECharts,
  type ComposeOption,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { gsap } from "gsap";
import { Info } from "lucide-react";
import type { CoffeeIp } from "./coffee";
import type { ipProfile } from "./profile";
import { ipProfileFields } from "./profile-fields";
import { ScenarioPanel } from "./scenario-panel";
import type { useIpLatency } from "./use-ip-latency";

registerECharts([
  BarChart,
  ScatterChart,
  GridComponent,
  GraphicComponent,
  SVGRenderer,
]);

const bands = [
  { size: 45, range: "0–44", label: t("偏低") },
  { size: 30, range: "45–74", label: t("一般") },
  { size: 15, range: "75–89", label: t("良好") },
  { size: 10, range: "90–100", label: t("高信譽") },
];

export function IpReputationScale({
  profile,
}: {
  profile: ReturnType<typeof ipProfile>;
}) {
  const { resolvedTheme } = useTheme();
  const graph = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = graph.current;
    if (!element) return;
    const dark = resolvedTheme === "dark" || profile.score === 100;
    const accent = dark ? "#f3ecdf" : "#20252c";
    const spectrum = ["#cd3832", "#ed8557", "#edc647", "#64c582", "#249139"];
    const muted = dark ? "#b6ad9c" : "#64748b";
    const chart = init(element, null, { renderer: "svg" });
    const draw = () => {
      chart.resize();
      const width = element.clientWidth;
      if (!width) return;
      const option: ComposeOption<
        | BarSeriesOption
        | ScatterSeriesOption
        | GridComponentOption
        | GraphicComponentOption
      > = {
        animation: !window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
        animationDuration: 650,
        animationDurationUpdate: 260,
        animationEasing: "cubicOut",
        animationEasingUpdate: "cubicOut",
        grid: { left: 4, right: 4, top: 7, bottom: 22 },
        xAxis: { type: "value", min: 0, max: 100, show: false },
        yAxis: { type: "category", data: ["score"], show: false },
        graphic: [0, 25, 50, 75, 100].map((value) => ({
          type: "text",
          x: 4 + ((width - 8) * value) / 100,
          y: element.clientHeight - 10,
          style: {
            text:
              value === 0
                ? t("0 低信譽")
                : value === 100
                  ? t("100 高信譽")
                  : String(value),
            fill: muted,
            fontSize: 10,
            align: value === 0 ? "left" : value === 100 ? "right" : "center",
            verticalAlign: "middle",
          },
        })),
        series: [
          ...bands.map((_band, index): BarSeriesOption => ({
            type: "bar",
            stack: "reputation",
            data: [25],
            barWidth: 10,
            silent: true,
            itemStyle: {
              color: new graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: spectrum[index] },
                { offset: 1, color: spectrum[index + 1] },
              ]),
              borderRadius:
                index === 0 ? [4, 0, 0, 4] : index === 3 ? [0, 4, 4, 0] : 0,
            },
          })),
          {
            type: "scatter",
            data: profile.score === null ? [] : [[profile.score, "score"]],
            symbol: "rect",
            symbolSize: [4, 20],
            z: 5,
            silent: true,
            itemStyle: {
              color: accent,
              opacity: 1,
              borderColor: dark ? "#191d24" : "#fff",
              borderWidth: 1,
            },
            label: {
              show: false,
              position: "top",
              distance: 4,
              formatter: () => `${profile.score}`,
              color: accent,
              fontSize: 13,
              fontWeight: 700,
              align:
                (profile.score ?? 0) >= 90
                  ? "right"
                  : (profile.score ?? 0) <= 10
                    ? "left"
                    : "center",
            },
          },
        ],
      };
      chart.setOption(option);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [profile, resolvedTheme]);
  return (
    <div
      ref={graph}
      className="ip-reputation-scale"
      role="img"
      aria-label={
        profile.score === null
          ? t("信譽分未知")
          : t("信譽分 {0}/100，位於{1}區間", [
              profile.score,
              bands[profile.scoreBand!].label,
            ])
      }
    />
  );
}

export default function IpProfileGraph({
  data,
  profile,
  inbound,
}: {
  inbound: ReturnType<typeof useIpLatency>;
  data: CoffeeIp;
  profile: ReturnType<typeof ipProfile>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const fieldsRef = useRef<HTMLDListElement>(null);
  const fields = ipProfileFields(data, profile);
  const active = selected === null ? null : fields[selected];
  useLayoutEffect(() => {
    const list = fieldsRef.current;
    if (!list) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const items = list.querySelectorAll(":scope > div");
      const tween = gsap.fromTo(
        items,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.045,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
      return () => tween.kill();
    });
    return () => media.revert();
  }, [data.ip]);
  return (
    <>
      <ToolCard title={t("IP 畫像")}>
        <dl ref={fieldsRef} className="ip-profile-fields">
          {fields.map((field, index) => (
            <div key={field.label}>
              <dt>
                <span>{field.label}</span>
                <button
                  type="button"
                  aria-label={t("解釋 {0}", [field.label])}
                  onClick={() => setSelected(index)}
                >
                  <Info size={14} aria-hidden="true" />
                </button>
              </dt>
              <dd className="flex flex-wrap items-center gap-1">
                <Badge variant={field.tone ?? "info"}>{field.value}</Badge>
                {field.special && (
                  <Badge variant="outline">{t("特殊類型")}</Badge>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <ResponsiveDialog
          open={active !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={active?.label ?? ""}
          description={t("查看各類含義與當前 IP 的歸類")}
        >
          {active && (
            <>
              <div className="ip-profile-current">
                <span>{t("當前 IP")}</span>
                <strong>{active.value}</strong>
                {active.detail && <p>{active.detail}</p>}
              </div>
              <dl className="ip-profile-catalog">
                {active.options.map((option) => (
                  <div
                    key={option.label}
                    data-current={option.current || undefined}
                  >
                    <dt>
                      <strong>{option.label}</strong>
                      {option.status ? (
                        <span>{option.status}</span>
                      ) : (
                        option.current && <span>{t("當前歸類")}</span>
                      )}
                    </dt>
                    <dd>{option.description}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </ResponsiveDialog>
      </ToolCard>
      <ScenarioPanel ip={data.ip} inbound={inbound} />
    </>
  );
}
