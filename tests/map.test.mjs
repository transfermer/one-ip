import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attachMapLayers,
  mapExternalUrl,
  mapTileLayers,
  normalizeMapConfig,
} from "../src/lib/map.ts";

test("map configuration enables Tianditu only with an explicit token", () => {
  assert.deepEqual(normalizeMapConfig({ provider: "osm", token: "x" }), {
    provider: "osm",
  });
  assert.deepEqual(
    normalizeMapConfig({ provider: "tianditu", token: "  key  " }),
    { provider: "tianditu", token: "key" },
  );
  assert.deepEqual(normalizeMapConfig({ provider: "tianditu" }), {
    provider: "osm",
  });
});

test("Tianditu uses the Web Mercator base and annotation layers", () => {
  const layers = mapTileLayers({ provider: "tianditu", token: "key&value" });
  assert.equal(layers.length, 2);
  assert.match(layers[0].url, /T=vec_w/);
  assert.match(layers[1].url, /T=cva_w/);
  assert.match(layers[0].url, /tk=key%26value/);
  assert.match(layers[0].options.attribution, /天地圖/);
});

test("a Tianditu tile failure switches to OpenStreetMap", () => {
  const created = [];
  const tileLayer = (url, options) => {
    const handlers = new Map();
    const layer = {
      url,
      options,
      on(event, handler) {
        handlers.set(event, handler);
        return layer;
      },
      off() {
        handlers.clear();
        return layer;
      },
      addTo() {
        return layer;
      },
      remove() {
        layer.removed = true;
        return layer;
      },
      emit(event) {
        handlers.get(event)?.();
      },
    };
    created.push(layer);
    return layer;
  };
  const errors = [];
  attachMapLayers(
    tileLayer,
    {},
    { provider: "tianditu", token: "key" },
    () => {},
    () => errors.push("error"),
  );
  created[0].emit("tileerror");
  assert.equal(created[0].removed, true);
  assert.match(created[2].url, /tile\.openstreetmap\.org/);
  created[2].emit("tileerror");
  assert.deepEqual(errors, ["error"]);
});

test("Chinese large-map links use the official AMap URI with WGS84", () => {
  const url = new URL(mapExternalUrl(31.23, 121.47, "上海"));
  assert.equal(url.origin, "https://uri.amap.com");
  assert.equal(url.searchParams.get("coordinate"), "wgs84");
  assert.equal(url.searchParams.get("position"), "121.47,31.23");
  assert.equal(url.searchParams.get("name"), "上海");
  assert.equal(
    new URL(mapExternalUrl(1.35, 103.82)).origin,
    "https://www.openstreetmap.org",
  );
});
