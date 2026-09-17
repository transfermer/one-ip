import { useEffect, useRef, useState } from "react";
import { ToolCard, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { attachMapLayers, loadMapConfig, mapExternalUrl } from "@/lib/map";
import type { Geo } from "@/lib/types";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, LocateFixed } from "lucide-react";

export function LocationMap({ geo }: { geo: Geo }) {
  const { latitude, longitude } = geo;
  const valid =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const location =
    [geo.country, geo.region, geo.city]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(" · ") || t("IP 歸屬位置");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [valid]);
  useEffect(() => {
    const element = container.current;
    if (!visible || !valid || !element) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let instance: LeafletMap | undefined;
    let detachLayers = () => {};
    setLoaded(false);
    setTileError(false);
    void import("leaflet")
      .then(({ default: L }) => {
        if (disposed) return;
        instance = L.map(element, {
          scrollWheelZoom: false,
          minZoom: 2,
          maxZoom: 15,
          zoomControl: false,
        }).setView([latitude, longitude], 7);
        map.current = instance;
        instance.attributionControl.setPrefix(false);
        L.control
          .zoom({
            position: "bottomright",
            zoomInTitle: t("放大地圖"),
            zoomOutTitle: t("縮小地圖"),
          })
          .addTo(instance);
        const mapInstance = instance;
        void loadMapConfig().then((config) => {
          if (disposed) return;
          detachLayers = attachMapLayers(
            L.tileLayer,
            mapInstance,
            config,
            () => setLoaded(true),
            () => setTileError(true),
          );
        });
        const label = document.createElement("span");
        label.textContent = location;
        L.circleMarker([latitude, longitude], {
          radius: 10,
          className: "ip-location-ping",
          color: "#1976d2",
          weight: 2,
          fill: false,
          fillOpacity: 0,
          interactive: false,
        }).addTo(instance);
        L.circleMarker([latitude, longitude], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: "#1976d2",
          fillOpacity: 1,
        })
          .bindTooltip(label, { direction: "top", offset: [0, -8] })
          .addTo(instance);
        observer = new ResizeObserver(() => instance?.invalidateSize());
        observer.observe(element);
      })
      .catch(() => {
        if (!disposed) setTileError(true);
      });
    return () => {
      disposed = true;
      detachLayers();
      observer?.disconnect();
      instance?.remove();
      map.current = null;
    };
  }, [visible, valid, latitude, longitude, location, attempt]);
  return (
    <ToolCard
      title={
        <span className="ip-map-heading">
          <span>{t("地理位置 · 地圖")}</span>
          {valid && (
            <span className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("回到歸屬位置")}
                title={t("回到歸屬位置")}
                onClick={() =>
                  map.current?.setView([latitude, longitude], 7, {
                    animate: false,
                  })
                }
              >
                <LocateFixed className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={mapExternalUrl(latitude, longitude, location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("查看大圖")}
                  title={t("查看大圖")}
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </span>
          )}
        </span>
      }
      className="ip-map-card"
    >
      {valid ? (
        <>
          <div className="ip-map-location">
            <span>{location}</span>
            <span>
              {latitude.toFixed(2)}, {longitude.toFixed(2)}
            </span>
          </div>
          <div className="ip-map-frame">
            <div
              ref={container}
              className="ip-location-map exit-map"
              aria-label={t("{0} 的大致地理位置", [geo.ip])}
            />
            {!loaded && !tileError && (
              <div className="ip-map-loading">
                <Pending>{t("正在加載地圖…")}</Pending>
              </div>
            )}
          </div>
          {tileError && (
            <p className="ip-map-error" role="status">
              {t("地圖底圖暫不可用，歸屬信息仍可查看。")}{" "}
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("重試")}
              </button>
            </p>
          )}
          <p className="ip-map-caption">
            {geo.source ? `${geo.source} · ` : ""}
            {t("IP 大致歸屬位置，非設備精確定位。")}
          </p>
        </>
      ) : (
        <p className="small muted">{t("暫無經緯度信息，無法顯示地圖。")}</p>
      )}
    </ToolCard>
  );
}
