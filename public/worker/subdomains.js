import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { HttpError, target, upstream } from "./http.js";

export function subdomainTarget(value) {
  // Reject URL syntax before IDN conversion, which can otherwise normalize it.
  if (typeof value !== "string" || /[\s/:@%*?#\\]/.test(value.trim()))
    throw new HttpError(400, "請輸入公網域名，不包含協議、路徑或端口");
  const domain = domainToASCII(value.trim().replace(/\.$/, ""));
  if (isIP(domain))
    throw new HttpError(400, "請輸入公網域名，不包含協議、路徑或端口");
  return target(domain);
}

export function certificateNames(records, domain) {
  if (
    !Array.isArray(records) ||
    records.some((r) => !r || typeof r.name_value !== "string")
  )
    throw new HttpError(502, "證書日誌數據格式異常");
  const names = new Set();
  for (const record of records) {
    for (const raw of record.name_value.split(/\r?\n/)) {
      const wildcard = raw.trim().startsWith("*.");
      let host;
      try {
        host = subdomainTarget(wildcard ? raw.trim().slice(2) : raw.trim());
      } catch {
        continue;
      }
      if (host.endsWith(`.${domain}`) || (wildcard && host === domain))
        names.add(`${wildcard ? "*." : ""}${host}`);
    }
  }
  return [...names].sort();
}

export async function lookupSubdomains(value) {
  const domain = subdomainTarget(value);
  const url = new URL("https://crt.sh/");
  url.searchParams.set("q", `%.${domain}`);
  url.searchParams.set("output", "json");
  const records = await upstream(
    url.href,
    {
      cf: { cacheTtl: 300, cacheEverything: true },
    },
    8_000_000,
  );
  return {
    domain,
    source: "crt.sh",
    sourceUrl: url.href,
    names: certificateNames(records, domain),
    checkedAt: new Date().toISOString(),
  };
}
