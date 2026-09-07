import { WeChatImportStarter } from "@/components/admin/wechat-import-starter";

export default function WeChatImportPage() {
  return <section className="admin-grid"><div className="section-heading"><p className="eyebrow">文章生成</p><h1>微信公眾號改寫</h1><p className="muted">抓取公開文章、預覽後以 AI 改寫，確認後才將圖片轉存並交給文章編輯器。</p></div><WeChatImportStarter /></section>;
}
