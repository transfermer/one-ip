import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { latencyCountries, selectLatencyNodes } from "./latency-presets";
import { sameIp } from "./scenario-evidence";
import {
  getPingNodes,
  runPing,
  type PingResponse,
  type PingNode,
} from "../ping/api";

export function useIpLatency(ip: string) {
  const [busy, setBusy] = useState(false);
  const [nodes, setNodes] = useState<{ cc: string; node?: PingNode }[]>(
    latencyCountries.map((cc) => ({ cc })),
  );
  const [data, setData] = useState<PingResponse>();
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const names: Record<string, string> = {
    us: t("美國"),
    de: t("德國"),
    gb: t("英國"),
    fr: t("法國"),
    jp: t("日本"),
    ca: t("加拿大"),
    cn: t("中國"),
    kr: t("韓國"),
  };
  const start = useCallback(async () => {
    controller.current?.abort();
    const run = new AbortController();
    controller.current = run;
    setBusy(true);
    setCatalogLoaded(false);
    setStarted(true);
    setError("");
    setData(undefined);
    setNodes(latencyCountries.map((cc) => ({ cc })));
    try {
      const selected = selectLatencyNodes(await getPingNodes(run.signal));
      if (run.signal.aborted) return;
      setNodes(selected);
      setCatalogLoaded(true);
      const ids = selected.flatMap((item) => (item.node ? [item.node.id] : []));
      if (!ids.length) throw new Error(t("暫無可用優選探針"));
      await runPing(
        { host: ip, nodes: ids, preferred: true },
        run.signal,
        (result) => {
          if (!run.signal.aborted) setData(result);
        },
      );
    } catch (error) {
      if (!run.signal.aborted)
        setError(error instanceof Error ? error.message : t("查詢失敗"));
    } finally {
      if (!run.signal.aborted) setBusy(false);
    }
  }, [ip]);
  useEffect(() => () => controller.current?.abort(), []);
  const cancel = () => {
    controller.current?.abort();
    setBusy(false);
    setError(t("已取消"));
  };
  return {
    ip,
    busy,
    nodes,
    data: data && sameIp(data.target, ip) ? data : undefined,
    error,
    started,
    catalogLoaded,
    names,
    start,
    cancel,
  };
}
