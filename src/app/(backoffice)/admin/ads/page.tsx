import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateArticleAdSettings, hasArticleAdSettingsModel } from "@/lib/adsense/article-ad-settings";
import { saveArticleAdSettingsAction } from "./actions";

export default async function ArticleAdsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "OWNER") redirect("/admin");

  const settingsAvailable = hasArticleAdSettingsModel(prisma);
  const [settings, query] = await Promise.all([getOrCreateArticleAdSettings(prisma), searchParams]);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">廣告 · 僅 OWNER</p><h1>文章廣告</h1><p className="muted">設定長文內文的中段廣告節奏；首篇與往下自動載入的續篇會套用同一份規則。</p></div>
    {settingsAvailable && query.error ? <p className="form-error" role="alert">{query.error}</p> : null}
    {!settingsAvailable ? <p className="form-error" role="alert">廣告設定尚未就緒；請先完成資料庫 migration 並重啟開發伺服器。</p> : null}
    {query.success ? <p className="form-success" role="status">文章廣告設定已儲存。</p> : null}
    <form action={saveArticleAdSettingsAction} className="form-grid">
      <label>每幾個 H2 插入一則中段廣告
        <input aria-label="每幾個 H2 插入一則中段廣告" name="middleAdInterval" type="number" min="1" max="6" step="1" defaultValue={settings.middleAdInterval} required />
        <span className="muted">可填 1–6；預設每 2 個 H2 插入一則。</span>
      </label>
      <label>每篇最多中段廣告數
        <input aria-label="每篇最多中段廣告數" name="maxMiddleAds" type="number" min="0" max="5" step="1" defaultValue={settings.maxMiddleAds} required />
        <span className="muted">可填 0–5；設為 0 可關閉中段廣告。</span>
      </label>
      <p className="muted">只有內文至少 1,200 字元的文章會插入中段廣告；既有的開頭後與文末廣告位維持不變。</p>
      <div><button type="submit" className="button button-primary" disabled={!settingsAvailable}>儲存廣告設定</button></div>
    </form>
  </section>;
}
