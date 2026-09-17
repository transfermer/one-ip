import { HttpError, upstream } from "./http.js";

const providers = {
  turnstile: {
    prefix: "TURNSTILE",
    name: "Cloudflare Turnstile",
    url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  },
  "turnstile-noninteractive": {
    prefix: "TURNSTILE_NONINTERACTIVE",
    name: "Cloudflare Turnstile · Non-interactive",
    url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  },
  recaptcha: {
    prefix: "RECAPTCHA",
    name: "Google reCAPTCHA v3",
    url: "https://www.google.com/recaptcha/api/siteverify",
  },
};
function settings(env, id) {
  const provider = providers[id];
  if (!provider) throw new HttpError(400, "未知驗證服務");
  const sitekey = String(env[`${provider.prefix}_SITE_KEY`] ?? "").trim();
  const secret = String(env[`${provider.prefix}_SECRET`] ?? "").trim();
  const hostnames = String(env[`${provider.prefix}_HOSTNAMES`] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  // Development hostnames must never authorize a production deployment.
  const safeHosts =
    env.LOCAL_DEV === "true"
      ? hostnames
      : hostnames.filter(
          (host) => !["localhost", "127.0.0.1", "[::1]", "::1"].includes(host),
        );
  return { ...provider, sitekey, secret, hostnames: safeHosts };
}
export function challengeConfig(env, hostname) {
  return Object.keys(providers)
    .filter(
      (id) =>
        id !== "turnstile-noninteractive" ||
        env.TURNSTILE_NONINTERACTIVE_SITE_KEY,
    )
    .map((id) => {
      const config = settings(env, id);
      const configured = Boolean(
        config.sitekey && config.secret && config.hostnames.includes(hostname),
      );
      return {
        id,
        name: config.name,
        configured,
        reason: configured
          ? undefined
          : !config.sitekey
            ? "當前運行環境缺少站點 Key。"
            : !config.secret
              ? "當前運行環境缺少服務端 Secret。"
              : "當前訪問域名不在此環境的驗證白名單中。",
        sitekey: configured ? config.sitekey : undefined,
      };
    });
}
export async function verifyChallenge(body, env, hostname) {
  if (!body || typeof body.provider !== "string")
    throw new HttpError(400, "請選擇驗證服務");
  const config = settings(env, body.provider);
  if (!config.sitekey || !config.secret || !config.hostnames.includes(hostname))
    throw new HttpError(503, "此驗證服務尚未在當前站點配置");
  if (
    typeof body.token !== "string" ||
    !body.token.trim() ||
    body.token.length > (body.provider !== "recaptcha" ? 2048 : 8192)
  )
    throw new HttpError(400, "驗證憑證無效，請重新驗證");
  let result;
  try {
    result = await upstream(
      config.url,
      {
        method: "POST",
        body: new URLSearchParams({
          secret: config.secret,
          response: body.token,
        }),
      },
      32_000,
    );
  } catch {
    throw new HttpError(502, "驗證服務暫時不可用，請稍後重試");
  }
  if (result?.success !== true)
    return { success: false, message: "驗證未通過或憑證已過期，請重新驗證。" };
  if (
    result.hostname !== hostname ||
    !config.hostnames.includes(result.hostname)
  )
    return { success: false, message: "驗證站點不匹配，請重新驗證。" };
  if (result.action !== "browser_check")
    return { success: false, message: "驗證場景不匹配，請重新驗證。" };
  if (body.provider === "recaptcha") {
    if (
      typeof result.score !== "number" ||
      !Number.isFinite(result.score) ||
      result.score < 0 ||
      result.score > 1
    )
      return { success: false, message: "驗證評分無效，請重新驗證。" };
    if (result.score < 0.5)
      return {
        success: false,
        score: result.score,
        message: "本次評分低於通過閾值。",
      };
  }
  return {
    ...(body.provider === "recaptcha" ? { score: result.score } : {}),
    success: true,
    message: "本站本次驗證通過",
    verifiedAt: new Date().toISOString(),
  };
}
