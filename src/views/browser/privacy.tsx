import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ToolCard, Facts } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import WebRtcPage from "@/views/webrtc";
import { useQuery } from "@tanstack/react-query";
import type { BrowserNavigator } from "./environment";

export default function Privacy() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const permissions = useQuery({
    queryKey: ["browser-permissions"],
    queryFn: async () =>
      Promise.all(
        (["geolocation", "camera", "microphone", "notifications"] as const).map(
          async (name) => {
            try {
              return [
                name,
                (
                  await navigator.permissions.query({
                    name: name as PermissionName,
                  })
                ).state,
              ] as [string, string];
            } catch {
              return [name, t("不支持查詢")] as [string, string];
            }
          },
        ),
      ),
    retry: false,
  });
  async function testMedia(kind: "camera" | "microphone") {
    setBusy(true);
    setMessage(t("等待授權…"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "camera" ? { video: true } : { audio: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      if (alive.current) setMessage(t("已獲得授權，媒體流已立即關閉。"));
    } catch {
      if (alive.current) setMessage(t("未獲得媒體訪問權限或設備不可用。"));
    } finally {
      if (alive.current) {
        setBusy(false);
        void permissions.refetch();
      }
    }
  }
  function locate() {
    setBusy(true);
    setMessage(t("等待定位授權…"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        setMessage(
          t("緯度 {0}，經度 {1}，精度約 {2} 米。", [
            position.coords.latitude.toFixed(5),
            position.coords.longitude.toFixed(5),
            Math.round(position.coords.accuracy),
          ]),
        );
        setBusy(false);
        void permissions.refetch();
      },
      () => {
        if (alive.current) {
          setMessage(t("未獲得定位結果，可能未授權或位置服務不可用。"));
          setBusy(false);
          void permissions.refetch();
        }
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <>
      <ToolCard title={t("權限與能力")}>
        <Facts
          rows={[
            ...(permissions.data ?? []),
            [t("安全上下文"), isSecureContext ? t("是") : t("否")],
            ["WebGPU", "gpu" in navigator ? t("支持 API") : t("不支持")],
            ["IndexedDB", "indexedDB" in window ? t("支持 API") : t("不支持")],
            [
              "Service Worker",
              "serviceWorker" in navigator ? t("支持 API") : t("不支持"),
            ],
            ["DNT", navigator.doNotTrack ?? t("未設置")],
            [
              "GPC",
              String(
                (navigator as BrowserNavigator).globalPrivacyControl ??
                  t("未提供"),
              ),
            ],
          ]}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || !navigator.geolocation}
            onClick={locate}
          >
            {t("測試定位")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("camera")}
          >
            {t("測試攝像頭權限")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("microphone")}
          >
            {t("測試麥克風權限")}
          </Button>
        </div>
        <p className="small muted mt-2" role="status">
          {message || t("點擊後才申請權限；媒體測試結束即關閉，不錄製內容。")}
        </p>
      </ToolCard>
      <div className="mt-3">
        <WebRtcPage />
      </div>
      <p className="small muted mt-3">
        <Link to="/network/dns">{t("查看 DNS 出口 ›")}</Link>
      </p>
    </>
  );
}
