<img src="public/icon.svg" alt="One IP Logo" width="96" height="96" />

# One IP

<p align="left">
  <img src="https://img.shields.io/badge/React-19-282C34?logo=react&amp;logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&amp;logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&amp;logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&amp;logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Lucide-F56565?logo=lucide&amp;logoColor=white" alt="Lucide" />
  <img src="https://img.shields.io/badge/Jotai-000000" alt="Jotai" />
  <img src="https://img.shields.io/badge/TanStack_Query-FF4154?logo=reactquery&amp;logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflareworkers&amp;logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Leaflet-199900?logo=leaflet&amp;logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&amp;logoColor=white" alt="pnpm 10" />
  <img src="https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&amp;logoColor=black" alt="Prettier" />
</p>

IP 查詢、網絡診斷、瀏覽器檢測與 AI 服務狀態工具箱。

**中文** · [English](README.en.md)

[在線體驗](https://ip.huzhihui.com/) · [GitHub](https://github.com/zhihui-hu/one-ip)

點擊下方按鈕，一鍵部署到 Cloudflare。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzhihui-hu%2Fone-ip)

## Cloudflare 部署教程

1. [Fork 本項目](https://github.com/zhihui-hu/one-ip/fork)到你的 GitHub 賬號。
2. 登錄 [Cloudflare 控制檯](https://dash.cloudflare.com/)，進入 **Workers & Pages**，創建 Worker，選擇導入 Git 倉庫。
3. 連接 GitHub，選擇你的 `one-ip` Fork，生產分支填 `main`。
4. 構建命令填 `pnpm build`，部署命令填 `pnpm deploy`。使用 Node.js 24 和 pnpm 10.32.1，根目錄保持默認。
5. 點擊部署，完成後打開 `workers.dev` 地址。自定義域名在 Worker 設置中綁定。

項目使用 **Cloudflare Workers + Static Assets**，`/api/*` 接口需要 Worker。基礎功能無需應用環境變量或 API Key。Turnstile 和 reCAPTCHA 的配置見“驗證體驗”。

國內網絡訪問地圖時，建議在 Worker → Settings → Variables and Secrets 配置 `TIANDITU_TOKEN`（也可以用 `pnpm exec wrangler secret put TIANDITU_TOKEN`）。配置後地圖優先使用天地圖，失敗時回退到 OpenStreetMap；未配置時保持 OpenStreetMap。

Workers Builds 會在 `main` 收到提交時構建和部署。上方按鈕使用原項目地址；需要保留 Fork 關係和更新工作流時，請按教程導入你的 Fork。

## 功能

| 模塊             | 支持的功能                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| 首頁概覽         | 國內與外部 IPv4 探測、歸屬地、運營商、信譽分與類型標籤                                                    |
| IP 詳情          | IPv4 / IPv6 查詢、ASN、CIDR、註冊信息、網絡屬性、風險標記、地圖、多源位置對比與關聯地址；字段取決於數據源 |
| 網站分流與連通性 | 檢查不同網站的出口 IP，按地址彙總；多輪 HTTP 採樣、中位耗時與排序                                         |
| 全球 Ping        | Globalping 全球探針、地區與城市選擇、延遲與丟包、分批返回結果                                             |
| DNS / CDN        | DNS 解析出口、CDN 命中節點及可讀取的緩存信息                                                              |
| WHOIS            | 域名、IP、ASN 的 RDAP 註冊資料與原始響應                                                                  |
| 瀏覽器檢測       | 環境信息、FingerprintJS 指紋、環境一致性、CreepJS 深度檢測、自動化特徵、權限與 WebRTC                     |
| AI 訪問          | ChatGPT、Claude、Grok、Perplexity、Gemini、DeepSeek、通義千問、Kimi 的資源連通性與部分平臺出口對照        |
| 服務狀態         | 聚合官方運行狀態、故障、維護、組件與事件詳情                                                              |
| 使用體驗         | 中英文、深淺主題、移動端佈局與底部抽屜、查詢歷史、二維碼分享與複製鏈接                                    |
| 可選驗證體驗     | Cloudflare Turnstile、Google reCAPTCHA v3；入口需要配置和域名匹配                                         |

第三方服務的限流和跨域限制會影響查詢結果。HTTP 耗時與 ICMP Ping 的測量方式不同。IP 類型和信譽分供參考，不代表 AI 平臺的官方判斷。

## 終端與 API

部署此版本後，可通過 `GET /api/ip/health` 查詢 IP 健康度，無需 API Key。

```bash
# 當前請求的公網出口 IP，終端文本
curl -fsS 'https://ip.huzhihui.com/api/ip/health?format=text'

# 默認返回 JSON，便於腳本處理
curl -fsS 'https://ip.huzhihui.com/api/ip/health'

# 指定公網 IPv4 或 IPv6
curl -fsS 'https://ip.huzhihui.com/api/ip/health?ip=1.1.1.1'
curl -fsS 'https://ip.huzhihui.com/api/ip/health?ip=2606:4700:4700::1111&format=text'
```

自部署時替換域名。本地開發使用 `http://127.0.0.1:8787`，必須指定 `ip`。省略 `ip` 時使用 Cloudflare 識別的本次請求出口；經過代理時會查詢代理出口。

返回 `ip`、`checked_at`、`score`、`status`、位置、ISP、ASN 和 `flags`（住宅、數據中心、移動網絡、VPN、代理、Tor、爬蟲、濫用標記）。信譽分範圍 0–100，越高越好；與網頁相同，75–100 爲 `good`、45–74 爲 `moderate`、低於 45 爲 `poor`。缺失或無效分數返回 `score: null`、`status: "unknown"`；缺失標記返回 `null`，不視爲 `false`。

`format` 支持 `json`（默認）和 `text`。錯誤始終返回 JSON `{ "error": "…" }`：無效參數爲 400、限流爲 429、無法識別訪客 IP 爲 503、數據源故障或地址不匹配爲 502。接口沿用現有請求限流，響應不緩存。健康度僅表示第三方 IP 信譽，不包含終端網絡測速、瀏覽器檢測或 AI 賬號可用性判斷。

## 界面預覽

截圖遮蓋了 IP、具體位置及運營商 / ASN，數值不是實時結果。

![桌面首頁（已打碼）](docs/screenshots/desktop-home-redacted.png)

<table>
  <tr><th>手機 · 淺色</th><th>手機 · 深色</th></tr>
  <tr>
    <td><img src="docs/screenshots/mobile-home-light-redacted.png" alt="手機淺色首頁（已打碼）" width="360" /></td>
    <td><img src="docs/screenshots/mobile-home-dark-redacted.png" alt="手機深色首頁（已打碼）" width="360" /></td>
  </tr>
</table>

## Fork 更新

在 GitHub 倉庫頁面點擊 **Sync fork → Update branch**。有代碼改動時檢查差異，通過合併處理衝突。

定時同步使用 `Sync upstream` 工作流：

1. 在 Fork 的 Actions 頁面啓用工作流。
2. 在 Settings → Secrets and variables → Actions → **Variables** 添加 `AUTO_SYNC_UPSTREAM=true`。
3. 工作流在每天 UTC 04:23 檢查更新。Actions 頁面提供運行入口。

支持範圍是從 `zhihui-hu/one-ip` 創建的 Fork，無需個人訪問令牌（PAT）。工作流通過 GitHub 的 `merge-upstream` 接口合併更新，遇到衝突時停止，保留你的提交。需要審覈更新時，使用 GitHub 的 Sync fork。

- **Workers Builds**：連接 Fork 的生產分支，在 Cloudflare 構建歷史中檢查同步提交的部署記錄。
- **GitHub Actions 部署**：同步產生更新時，工作流觸發部署任務。`GITHUB_TOKEN` 產生的推送不會觸發普通 `push` 工作流。
- 分支保護阻止合併時，通過 PR 處理。
- Fork 的定時工作流需要啓用。公開倉庫 60 天無活動可能導致 GitHub 停用定時任務，恢復入口在 Actions 頁面。

參考：[同步 Fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)、[GITHUB_TOKEN 觸發規則](https://docs.github.com/en/actions/concepts/security/github_token)、[定時工作流停用規則](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)。

## GitHub Actions 部署（可選）

Workers Builds 和 GitHub Actions 選擇一種部署方式，避免重複發佈。Actions 默認執行構建和測試；開啓部署需要在倉庫的 Actions 設置中添加：

| 類型     | 名稱                    | 用途                       |
| -------- | ----------------------- | -------------------------- |
| Variable | `ENABLE_CF_DEPLOY=true` | 開啓部署                   |
| Secret   | `CLOUDFLARE_API_TOKEN`  | 目標賬戶的 Worker 部署憑證 |
| Secret   | `CLOUDFLARE_ACCOUNT_ID` | 目標 Cloudflare 賬戶 ID    |

推送到 `main`，或運行 `Build and deploy one-ip`。構建和測試通過後進入部署。外部 PR 執行測試，不獲得部署憑證。這些憑證用於 CI。

## 本地開發與部署

```bash
pnpm install --frozen-lockfile
pnpm worker:dev
```

打開 `http://127.0.0.1:8787`。命令啓動 Vite 和本地 Worker，支持熱更新。啓動腳本爲本地進程設置 `LOCAL_DEV=true`，無需修改 Wrangler 配置。

```bash
pnpm build
pnpm test
pnpm lint

# 登錄 Cloudflare 並部署
pnpm exec wrangler login
pnpm deploy
```

`pnpm deploy` 使用 `dist` 中的構建產物，運行前需要執行 `pnpm build`。`make deploy` 包含版本更新、構建和部署，無需密鑰文件。

## 驗證體驗（可選）

選擇 Turnstile 或 reCAPTCHA，填寫 Site Key、Secret 和允許訪問的域名。配置齊全且訪問域名匹配時，頁面顯示“驗證體驗”入口；缺少配置時隱藏入口。

| 提供商       | 配置項                                                          |
| ------------ | --------------------------------------------------------------- |
| Turnstile    | `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET`、`TURNSTILE_HOSTNAMES` |
| reCAPTCHA v3 | `RECAPTCHA_SITE_KEY`、`RECAPTCHA_SECRET`、`RECAPTCHA_HOSTNAMES` |

本地開發：把[配置示例](docs/config/challenges.env.example)複製到根目錄 `.dev.vars`，填寫密鑰並重啓。文件存在時編輯原文件。域名用逗號分隔，填寫格式爲 `example.com`，提供商控制檯需要允許對應域名。

線上部署：在 Worker → Settings → Variables and Secrets 填寫配置，或執行 `pnpm exec wrangler secret put 名稱`。使用配置文件時，把 `.secrets.example` 複製爲 `.secrets.production.env`，填寫後運行：

```bash
node scripts/sync-worker-secrets.mjs production --check
node scripts/sync-worker-secrets.mjs production
```

腳本上傳非空項，保留已有 Secret，跳過缺失的可選文件。敏感文件在 Git 忽略列表中。Secret 應放在 Worker 配置中，不能放進 `VITE_*`。`/api/browser/challenges` 的 `configured` 字段用於檢查配置結果。

reCAPTCHA 使用 v3 評分型密鑰。服務端校驗 hostname、`browser_check` action 和 score，通過閾值爲 0.5。v2 複選框和 Enterprise assessment 不在支持範圍內，生產環境不接受 localhost。

## 項目結構與數據來源

- `src/app.css`：界面樣式；`src/components/ui`：shadcn/ui 組件。
- `src/views`：網絡、瀏覽器、AI 與狀態頁面；`public/worker`：Worker API。
- Net.Coffee：IP 詳情，展示字段取決於接口返回。
- Globalping：全球測量；IANA / RDAP：註冊資料；各平臺官方狀態源：運行狀態。
- FingerprintJS 與 CreepJS：瀏覽器檢測，模塊說明見 [vendor/browser-diagnostics](vendor/browser-diagnostics/README.md)。

歡迎提交 Issue 和改進建議。分享截圖前，請遮蓋 IP、位置和指紋標識等隱私信息。

### 人機校驗與 Claude 環境對照

人機校驗在頁面打開後自動運行，展示校驗階段、Turnstile 是否出現交互、reCAPTCHA v3 分數及本站閾值（0.50）。單輪最多等待 45 秒，可重新開始；結果僅代表本站本次校驗。

可選的第二個 Turnstile 組件使用 `TURNSTILE_NONINTERACTIVE_SITE_KEY`、`TURNSTILE_NONINTERACTIVE_SECRET`、`TURNSTILE_NONINTERACTIVE_HOSTNAMES`。需在 Cloudflare 爲該獨立組件選擇 **Non-interactive** 模式，域名須匹配；未配置時不顯示。原有 `TURNSTILE_*` 組件保持其控制檯配置。前端參數不能把同一個 Key 切換成另一種組件模式。

Claude 頁面自動比較 `claude.ai` 與 `claude.com` 出口，並展示 DNS、WebRTC 和語言、時區等瀏覽器信息。檢測失敗、不同出口或中文偏好均不直接代表賬號風險。未接入 Cloudflare 企業版 Bot Management；不展示推算的企業版分數。

Claude 頁面還內嵌自動人機校驗，並本地檢測簡繁中文字體、廠商字體、UA / Client Hints、Intl 區域及 Canvas 國旗渲染。檢測字典參考 LinXiaoTao/FuckClaude，來源摘要與 MIT 許可證位於 `vendor/claude-environment/`。不使用其風險分數；不把字體、廠商或中文偏好解釋爲國籍或封禁概率。頁面僅展示簡潔人機狀態和逐項更新的檢測日誌，不提供評分卡或文本輸入。

社區友鏈：[LINUX DO](https://linux.do/) · 真誠、友善、團結、專業。
