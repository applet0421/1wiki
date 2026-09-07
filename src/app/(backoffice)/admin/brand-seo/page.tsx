import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getLocaleConfig, supportedLocales } from "@/lib/i18n/config";
import { resolveBrandSeo } from "@/lib/brand-seo/repository";
import { saveBrandSeoAction } from "./actions";
import { BrandSeoForm } from "@/components/admin/brand-seo-form";

export default async function BrandSeoPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "OWNER") redirect("/admin");
  const [settings, query] = await Promise.all([resolveBrandSeo(prisma), searchParams]);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">SEO · 僅 OWNER</p><h1>品牌與 SEO</h1><p className="muted">管理共用品牌與各語言首頁的搜尋呈現。</p></div>
    {query.error ? <p className="form-error" role="alert">{query.error}</p> : null}{query.success ? <p className="form-success" role="status">品牌設定已儲存。</p> : null}
    <BrandSeoForm initial={settings} action={saveBrandSeoAction} />
  </section>;
}
