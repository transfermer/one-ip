import { t } from "@/i18n";
import version from "./diagnostics-version.json";

export interface DiagnosticModule {
  name: string;
  status: string;
  detail: string;
}
export interface DiagnosticResult {
  modules: DiagnosticModule[];
  duration: number;
  commit: string;
}
export function collectDeepDiagnostics(
  signal: AbortSignal,
): Promise<DiagnosticResult> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = t("本地瀏覽器深度檢測");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    // Keep layout APIs measurable while keeping probes out of the visible page.
    frame.style.cssText = `position:fixed;left:-100000px;top:0;width:${innerWidth}px;height:${innerHeight}px;border:0;pointer-events:none`;
    const timer = setTimeout(
      () => finish(new Error(t("檢測超時，部分瀏覽器可能限制了檢測接口。"))),
      30000,
    );
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
      frame.remove();
    }
    function finish(error: Error) {
      cleanup();
      reject(error);
    }
    function onAbort() {
      finish(new DOMException(t("檢測已取消"), "AbortError"));
    }
    function onMessage(event: MessageEvent) {
      if (
        event.source !== frame.contentWindow ||
        event.origin !== location.origin ||
        event.data?.type !== "local-browser-diagnostics"
      )
        return;
      if (event.data.error) {
        finish(new Error(t("深度檢測未完成，請重試。")));
        return;
      }
      const result = event.data.result;
      if (!result?.modules || typeof result.duration !== "number") {
        finish(new Error(t("檢測結果無效。")));
        return;
      }
      const modules = Object.entries(result.modules).map(
        ([name, value]): DiagnosticModule => ({
          name,
          status:
            value === null || value === undefined ? t("無法檢測") : t("已完成"),
          detail: JSON.stringify(value, null, 2) ?? t("未提供"),
        }),
      );
      cleanup();
      resolve({ modules, duration: result.duration, commit: version.commit });
    }
    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    // Only the pinned local bundle can execute; all outbound network connections are blocked.
    const source = new URL(
      `/browser-diagnostics.js?v=${version.bundleHash}`,
      location.origin,
    ).href;
    frame.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; frame-src 'self' about:; worker-src 'none'"></head><body><script src="${source}"></script></body></html>`;
    document.body.append(frame);
  });
}
