import { endpoint } from "@/lib/network";
import type { Map as LeafletMap, TileLayer, TileLayerOptions } from "leaflet";

export type MapProvider = "osm" | "tianditu";

export interface MapConfig {
  provider: MapProvider;
  token?: string;
}

export interface MapTileLayerSpec {
  url: string;
  options: TileLayerOptions;
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TIANDITU_ATTRIBUTION =
  '&copy; <a href="https://www.tianditu.gov.cn/">天地圖</a>';
const TIANDITU_SUBDOMAINS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"];

let mapConfigPromise: Promise<MapConfig> | undefined;

export function normalizeMapConfig(value: unknown): MapConfig {
  if (!value || typeof value !== "object") return { provider: "osm" };
  const config = value as { provider?: unknown; token?: unknown };
  const token = typeof config.token === "string" ? config.token.trim() : "";
  return config.provider === "tianditu" && token
    ? { provider: "tianditu", token }
    : { provider: "osm" };
}

export function loadMapConfig() {
  return (mapConfigPromise ??= endpoint<unknown>("/map/config")
    .then(normalizeMapConfig)
    .catch(() => ({ provider: "osm" as const })));
}

export function mapTileLayers(config: MapConfig): MapTileLayerSpec[] {
  if (config.provider === "tianditu" && config.token) {
    const token = encodeURIComponent(config.token);
    const options: TileLayerOptions = {
      maxZoom: 19,
      subdomains: TIANDITU_SUBDOMAINS,
    };
    const url = (type: "vec_w" | "cva_w") =>
      `https://{s}.tianditu.gov.cn/DataServer?T=${type}&x={x}&y={y}&l={z}&tk=${token}`;
    return [
      {
        url: url("vec_w"),
        options: { ...options, attribution: TIANDITU_ATTRIBUTION },
      },
      { url: url("cva_w"), options: { ...options } },
    ];
  }
  return [
    {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: { maxZoom: 19, attribution: OSM_ATTRIBUTION },
    },
  ];
}

type TileLayerFactory = typeof import("leaflet").tileLayer;

interface MapLayerSet {
  layers: TileLayer[];
}

export function attachMapLayers(
  tileLayer: TileLayerFactory,
  map: LeafletMap,
  config: MapConfig,
  onTileLoad: () => void,
  onTileError: () => void,
) {
  let disposed = false;
  let generation = 0;
  let current: MapLayerSet | undefined;

  const removeCurrent = () => {
    const layers = current?.layers ?? [];
    current = undefined;
    for (const layer of layers) {
      layer.off();
      layer.remove();
    }
  };

  const activate = (nextConfig: MapConfig) => {
    if (disposed) return;
    const currentGeneration = ++generation;
    const layers = mapTileLayers(nextConfig).map(({ url, options }) =>
      tileLayer(url, options),
    );
    current = { layers };
    for (const layer of layers) {
      layer.on("tileload", () => {
        if (!disposed && currentGeneration === generation) onTileLoad();
      });
      layer.on("tileerror", () => {
        if (disposed || currentGeneration !== generation) return;
        if (nextConfig.provider === "tianditu") {
          removeCurrent();
          activate({ provider: "osm" });
        } else {
          onTileError();
        }
      });
      layer.addTo(map);
    }
  };

  activate(config);
  return () => {
    disposed = true;
    generation++;
    removeCurrent();
  };
}

function isChinaCoordinate(latitude: number, longitude: number) {
  return (
    latitude >= 3.8 &&
    latitude <= 53.6 &&
    longitude >= 73.5 &&
    longitude <= 135.1
  );
}

export function mapExternalUrl(
  latitude: number,
  longitude: number,
  label?: string,
) {
  if (isChinaCoordinate(latitude, longitude)) {
    const params = new URLSearchParams({
      position: `${longitude},${latitude}`,
      coordinate: "wgs84",
      src: "one-ip",
    });
    if (label) params.set("name", label);
    return `https://uri.amap.com/marker?${params}`;
  }
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=7/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
}
