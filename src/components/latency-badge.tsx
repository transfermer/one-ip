import { useLayoutEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import type { ProbeResult } from "@/views/link/api";
import { gsap } from "gsap";
import { AnimatedValue } from "./animated-value";
import { NumberTicker } from "./number-ticker";
import { Pending } from "./toolkit";

export function LatencyBadge({
  result,
  running,
}: {
  result?: ProbeResult;
  running: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { resolvedTheme } = useTheme();
  const latency = result?.median;
  const tone =
    latency == null || latency < 0
      ? running && !result?.samples.length
        ? "--subtle"
        : "--danger"
      : latency < 100
        ? "--success"
        : latency < 400
          ? "--good"
          : "--warning";
  const pending = running && !result?.samples.length;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(tone)
      .trim();
    const [r, g, b] = gsap.utils.splitColor(color);
    const media = gsap.matchMedia();
    media.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        normal: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const tween = gsap.to(node, {
          color,
          backgroundColor: `rgba(${r}, ${g}, ${b}, 0.09)`,
          duration: context.conditions?.reduced ? 0 : 0.3,
          overwrite: true,
        });
        return () => {
          tween.kill();
        };
      },
    );
    return () => media.revert();
  }, [tone, resolvedTheme]);
  return (
    <span
      ref={ref}
      className="ping-ms latency-badge"
      title={t(
        "瀏覽器 HTTP 請求耗時中位數；顏色與顯示的中位數一致，非 ICMP 延遲",
      )}
    >
      <AnimatedValue value={pending}>
        {pending ? (
          <Pending>···</Pending>
        ) : latency != null && latency >= 0 ? (
          <>
            <NumberTicker value={latency} />
            ms
          </>
        ) : (
          <span>{result?.samples.length ? t("未連通") : "—"}</span>
        )}
      </AnimatedValue>
    </span>
  );
}
