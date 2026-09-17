import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeading,
  ToolCard,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnderlineHover } from "@/components/underline-hover";
import {
  useChallengeConfig,
  type ChallengeProvider as Provider,
} from "@/hooks/use-challenge-config";
import { t } from "@/i18n";
import { useMutation } from "@tanstack/react-query";
import { verifyChallenge } from "./api";

type WidgetApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>,
  ): string | number;
  reset(id: string | number): void;
  execute?(sitekey: string, options: { action: string }): Promise<string>;
  remove?(id: string | number): void;
};
declare global {
  interface Window {
    turnstile?: WidgetApi;
    grecaptcha?: WidgetApi & { ready(callback: () => void): void };
  }
}
const scripts = new Map<string, Promise<WidgetApi>>();
function loadWidget(id: Provider["id"], sitekey: string): Promise<WidgetApi> {
  const key = id === "recaptcha" ? `${id}:${sitekey}` : "turnstile";
  const existing = scripts.get(key);
  if (existing) return existing;
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      id !== "recaptcha"
        ? "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        : `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(sitekey)}`;
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      scripts.delete(key);
      reject(new Error(t("驗證組件加載失敗，請檢查網絡或內容攔截設置。")));
    }
    script.onerror = fail;
    script.onload = () => {
      const ready = () => {
        const api = id !== "recaptcha" ? window.turnstile : window.grecaptcha;
        if (!api || (id === "recaptcha" ? !api.execute : !api.render)) {
          fail();
          return;
        }
        clearTimeout(timer);
        resolve(api);
      };
      if (id === "recaptcha" && window.grecaptcha?.ready)
        window.grecaptcha.ready(ready);
      else ready();
    };
    document.head.append(script);
  });
  scripts.set(key, promise);
  return promise;
}
function Challenge({
  provider,
  compact = false,
}: {
  provider: Provider;
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(t("加載中"));
  const [elapsed, setElapsed] = useState<number>();
  const [busy, setBusy] = useState(true);
  const [interaction, setInteraction] = useState(false);
  const [score, setScore] = useState<number>();
  const { mutateAsync } = useMutation({
    mutationFn: verifyChallenge,
    retry: false,
  });
  useEffect(() => {
    if (!round || !container.current || !provider.sitekey) return;
    let active = true;
    let api: WidgetApi | undefined;
    let widget: string | number | undefined;
    const host = container.current;
    const mount = document.createElement("div");
    if (provider.id !== "recaptcha") mount.style.minWidth = "304px";
    host.append(mount);
    const abort = new AbortController();
    const started = performance.now();
    setBusy(true);
    setInteraction(false);
    setScore(undefined);
    const finish = () => {
      clearTimeout(timer);
      setBusy(false);
      setElapsed(Math.round((performance.now() - started) / 1000));
    };
    const timer = setTimeout(() => {
      if (!active) return;
      active = false;
      abort.abort();
      setStatus(t("校驗超時"));
      setMessage(t("校驗未及時完成，請檢查網絡後重試。"));
      finish();
      if (api && widget !== undefined) api.remove?.(widget);
    }, 45000);
    setStatus(t("加載中"));
    setMessage("");
    setElapsed(undefined);
    void loadWidget(provider.id, provider.sitekey)
      .then(async (loaded) => {
        if (!active) return;
        api = loaded;
        setStatus(t("等待驗證"));
        const options = {
          sitekey: provider.sitekey,
          action: "browser_check",
          size: "flexible",
          callback: async (token: string) => {
            if (!active) return;
            setStatus(t("確認結果中"));
            try {
              const result = await mutateAsync({
                provider: provider.id,
                token,
                signal: abort.signal,
              });
              if (!active) return;
              setStatus(result.success ? t("驗證通過") : t("未通過"));
              setMessage(t(result.message));
              setScore(result.score);
              finish();
            } catch (error) {
              if (active) {
                finish();
                setStatus(t("未完成"));
                setMessage(
                  error instanceof Error ? error.message : t("驗證請求失敗"),
                );
              }
            }
          },
          retry: "never",
          "refresh-expired": "manual",
          "refresh-timeout": "manual",
          "before-interactive-callback": () => {
            if (active) {
              setInteraction(true);
              setStatus(t("需要交互"));
            }
          },
          "after-interactive-callback": () => {
            if (active) setStatus(t("等待驗證"));
          },
          "timeout-callback": () => {
            if (active) {
              finish();
              setStatus(t("校驗超時"));
              setMessage(t("請重新開始驗證。"));
            }
          },
          "expired-callback": () => {
            if (active) {
              finish();
              setStatus(t("已過期"));
              setMessage(t("請重新開始驗證。"));
            }
          },
          "error-callback": () => {
            if (active) {
              finish();
              setStatus(t("未完成"));
              setMessage(
                t("Turnstile 無法完成驗證，請檢查網絡連接及站點允許的域名。"),
              );
            }
          },
        };
        if (provider.id === "recaptcha") {
          const token = await api.execute!(provider.sitekey!, {
            action: "browser_check",
          });
          if (active) await options.callback(token);
        } else {
          widget = api.render(mount, options);
        }
      })
      .catch((error) => {
        if (active) {
          finish();
          setStatus(t("加載失敗"));
          setMessage(error.message);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
      if (api && widget !== undefined) {
        try {
          if (api.remove) api.remove(widget);
          else api.reset(widget);
        } catch {
          /* Widget may have already removed itself. */
        }
      }
      host.replaceChildren();
    };
  }, [round, provider.id, provider.sitekey, mutateAsync]);
  if (compact)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" role="status">
            {busy ? <Pending>{status}</Pending> : status}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            aria-busy={busy}
            onClick={() => setRound((value) => value + 1)}
          >
            {t("重新校驗")}
          </Button>
        </div>
        <div ref={container} className="max-w-full overflow-x-auto" />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    );
  return (
    <ToolCard title={provider.name}>
      <div className="row-between gap-3">
        <Badge variant="secondary">
          {provider.configured ? status : t("未配置")}
        </Badge>
        <Button
          disabled={!provider.configured || busy}
          aria-busy={busy}
          className="min-w-24"
          onClick={() => setRound((value) => value + 1)}
        >
          {busy ? <Pending>{t("校驗中…")}</Pending> : t("重新開始")}
        </Button>
      </div>
      {score !== undefined && (
        <p className="mt-3 text-sm tabular-nums">
          {t("可信評分")} {score.toFixed(2)} / 1.00 · {t("本站通過閾值")} 0.50
        </p>
      )}
      {provider.id !== "recaptcha" && (
        <p className="small muted mt-3">
          {interaction
            ? t("本次出現交互校驗")
            : busy
              ? t("等待交互結果")
              : status === t("驗證通過")
                ? t("本次無需交互")
                : t("交互結果未確定")}
        </p>
      )}
      <div
        ref={container}
        className={
          round && provider.id !== "recaptcha"
            ? "mt-4 min-h-20 w-full min-w-0 overflow-x-auto pb-1"
            : ""
        }
      />
      <p className="small muted mt-3" role="status">
        {!provider.configured
          ? provider.reason
            ? t(provider.reason)
            : t("當前站點尚未啓用此驗證。")
          : message || t("頁面已自動加載校驗，按提示完成操作。")}
        {elapsed !== undefined && t(" · 用時 {0} 秒", [elapsed])}
      </p>
    </ToolCard>
  );
}
export function HumanVerification({
  compact = false,
}: { compact?: boolean } = {}) {
  const query = useChallengeConfig();
  const configured =
    query.data?.filter((provider) => provider.configured) ?? [];
  const providers = compact
    ? [
        configured.find((provider) => provider.id === "turnstile") ??
          configured[0],
      ].filter((provider): provider is Provider => !!provider)
    : configured;
  return (
    <>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("正在讀取驗證服務…")}</Pending>
      ) : (
        <div className={compact ? "" : "grid gap-3 lg:grid-cols-2"}>
          {providers.map((provider) => (
            <Challenge
              key={provider.id}
              provider={provider}
              compact={compact}
            />
          ))}
        </div>
      )}
      {!query.isPending &&
        !query.isError &&
        !query.data?.some((provider) => provider.configured) && (
          <p className="text-sm text-muted-foreground">
            {t(
              "當前環境沒有可用的驗證配置，請檢查正式 Worker 的站點 Key、Secret 和域名白名單。",
            )}
          </p>
        )}
      {query.isError && (
        <Button variant="outline" onClick={() => query.refetch()}>
          {t("重試")}
        </Button>
      )}
      {!compact && !!query.data?.some((provider) => provider.configured) && (
        <div className="mt-3">
          <ToolCard title={t("結果怎麼看？")}>
            <p className="small muted">
              {t(
                "通過僅表示本站本次驗證成功，不代表其他網站也會通過。Turnstile 體驗不等同於 Cloudflare 整站防護挑戰。",
              )}
            </p>
            <p className="small muted mt-2">
              {t("FingerprintJS 用於計算瀏覽器標識，不提供驗證碼通過結論。")}
              <UnderlineHover asChild>
                <Link to="/browser/fingerprint">{t("查看指紋檢測 ›")}</Link>
              </UnderlineHover>
            </p>
          </ToolCard>
        </div>
      )}
    </>
  );
}

export default function ChallengesPage() {
  return (
    <>
      <PageHeading title={t("人機校驗")} description="" />
      <HumanVerification />
    </>
  );
}
