# 公開快取與 Cloudflare 監控

最後更新：2026-09-06

## 架構

公開內容採 Static-first：匿名 GET 先由 Cloudflare HTML cache 回應，未命中時由 Next.js ISR 產生頁面，再查 PostgreSQL。後台、登入、API、AI 與 Worker 控制永遠維持動態。

文章、分類或作者變更後，Server Action 會立即失效本機 Next ISR，並寫入 `PublicInvalidation` Outbox。`cache-invalidator` 會處理事件：

1. 呼叫 `/api/internal/cache/revalidate` 清除 Next ISR。
2. 若設定 `CLOUDFLARE_ZONE_ID` 與 `CLOUDFLARE_API_TOKEN`，清除對應公開 URL 的 Cloudflare HTML cache。
3. 失敗時以遞增間隔重試，10 次後標記為 `FAILED`。

成功事件完成後會從 `PublicInvalidation` outbox 移除；`PENDING` 不會自動刪除，`FAILED` 則依 `/admin/database-backups` 的「資料清理保留期限」設定保留，預設 180 天。資料清理由 `database-backup-worker` 每 24 小時最多執行一次。

這個流程不使用長時間 TTL 掩蓋失效問題；快取命中是速度策略，Outbox 是內容正確性保障。

## OWNER 監控

開啟 `/admin/cache` 可查看：

- Pending、Failed 與目前保留的失效事件數量
- 最早待處理事件
- Cloudflare purge 憑證是否已設定
- 最近 20 筆事件、嘗試次數、路徑數與錯誤
- 重新排入所有失敗事件

若 Failed 持續增加，先檢查：

1. `cache-invalidator` container 是否運作。
2. `CACHE_REVALIDATE_SECRET` 是否與 web 相同。
3. web 是否通過 `/api/internal/cache/revalidate` health request。
4. Cloudflare token 是否具備指定 zone 的 Cache Purge 權限。
5. `NEXT_PUBLIC_SITE_URL`、`CLOUDFLARE_ZONE_ID` 是否正確。

## VM 環境變數

```dotenv
CACHE_REVALIDATE_SECRET=至少32字元的隨機密鑰
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=具備CachePurge權限的token
```

Cloudflare token 只放在 VM 的 `.env.production`，不可放入瀏覽器、Git 或公開環境變數。若暫時不設定 Cloudflare purge，origin ISR 仍可運作，但正式環境應保持短 TTL 並觀察 `/admin/cache`。

## 反向代理與部署模式

正式環境二選一：

- 原生 Docker Compose：使用 `docker-compose.vm.yml`，由 Caddy 負責 80／443、HTTPS 與 `web:3000` 反向代理。
- Coolify：使用 `docker-compose.coolify.yml`，由 Coolify Proxy 負責 80／443、HTTPS 與網域轉發；Coolify 網域應綁定 `web` 的 container port `3000`。

兩個 Compose 檔不可同時啟動。Coolify 方案不會改變快取失效流程；`cache-invalidator` 仍會先清除 Next ISR，再依設定清除 Cloudflare HTML cache。Coolify Proxy 本身不是 HTML 快取層，公開頁面的速度仍取決於 Cloudflare cache、ISR 命中率、資料庫查詢與圖片 CDN。

## 驗收

```bash
docker compose -f docker-compose.vm.yml ps
# Coolify 部署則在 Coolify resource 的 Logs／服務狀態查看，不要在同一台 VM 再啟動 Caddy。
curl -i -X POST "$SITE_URL/api/internal/cache/revalidate" \
  -H "Authorization: Bearer $CACHE_REVALIDATE_SECRET" \
  -H 'Content-Type: application/json' \
  --data '{"paths":["/zh-tw","/sitemap.xml"]}'
```

預期內部 endpoint 回傳 `summary`、`success`、`failure`，未帶 bearer secret 必須回傳 401。發布文章後，`/admin/cache` 應出現新的失效事件並在正常情況下轉為 `SUCCESS`。
