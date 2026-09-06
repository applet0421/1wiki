import Link from "next/link";

const choices = [
  { title: "新增文章", description: "手動填寫文章資料，建立一篇新的文章。", href: "/admin/posts/new", action: "手動新增文章" },
  { title: "AI 選題", description: "貼上參考內容，分析主題並生成文章草稿。", href: "/admin/posts/generate", action: "開始 AI 選題" },
  { title: "AI 改寫文章", description: "提供既有文章，讓 AI 協助改寫與整理內容。", href: "/admin/posts/rewrite", action: "開始 AI 改寫" },
];

export default function ArticleCreationPage() {
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">新增內容</p><h1>文章生成</h1><p className="muted">選擇適合的方式建立下一篇文章。</p></div>
    <div className="article-creation-options">{choices.map((choice) => <article className="panel article-creation-option" key={choice.href}><div><h2>{choice.title}</h2><p className="muted">{choice.description}</p><Link className="button button-primary" href={choice.href}>{choice.action}</Link></div></article>)}</div>
  </section>;
}
