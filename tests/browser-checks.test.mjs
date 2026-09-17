import assert from "node:assert/strict";
import { test } from "node:test";
import {
  comparePlatforms,
  compareContexts,
} from "../src/views/browser/consistency.ts";

test("platform comparisons account for normal Android, ChromeOS and iPad compatibility values", () => {
  assert.equal(
    comparePlatforms("Mozilla Android", "Linux armv8", 5).status,
    "一致",
  );
  assert.equal(
    comparePlatforms("Mozilla CrOS", "Linux x86_64", 0).status,
    "一致",
  );
  assert.equal(comparePlatforms("Mozilla iPad", "MacIntel", 5).status, "一致");
  assert.equal(
    comparePlatforms("Mozilla Windows NT", "MacIntel", 0).status,
    "存在差異",
  );
  assert.equal(comparePlatforms("redacted", "", 0).status, "無法檢測");
});
test("context comparison distinguishes missing fields from contradictory values", () => {
  const data = {
    userAgent: "UA",
    platform: "MacIntel",
    language: "zh-TW",
    languages: ["zh-TW"],
    hardwareConcurrency: 8,
    timezone: "Asia/Shanghai",
  };
  assert.equal(compareContexts(data, { ...data }, "test").status, "一致");
  assert.equal(
    compareContexts(data, { ...data, language: "en-US" }, "test").status,
    "存在差異",
  );
  assert.equal(compareContexts(data, {}, "test").status, "無法檢測");
});
