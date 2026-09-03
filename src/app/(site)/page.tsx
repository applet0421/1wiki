import Link from "next/link";
import { ArticleCard } from "@/components/site/article-card";
import { listPublishedPosts } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
const categories = [{ name: "AI 教學", slug: "ai", text: "生成式 AI、ChatGPT 與常用工具。" }, { name: "軟體教學", slug: "software", text: "Windows、手機與應用程式操作。" }, { name: "社群平台", slug: "social", text: "LINE、YouTube 與社群疑難排解。" }];

export default async function HomePage() {
  const posts = await listPublishedPosts(prisma, 12);
  return <main className="public-main"><section className="home-hero"><div><p className="eyebrow">一步一步，把問題解決</p><h1>科技卡住了？<br />從這裡找到答案。</h1><p>1Wiki 用清楚、可操作的繁體中文教學，協助你處理 AI、軟體、社群與 3C 的日常問題。</p></div><div className="hero-note"><strong>快速找到解法</strong><span>每篇只處理一個具體問題</span><span>清楚步驟與常見原因</span><span>手機也能輕鬆閱讀</span></div></section><section><div className="section-title"><p className="eyebrow">探索主題</p><h2>從問題類型開始</h2></div><div className="category-grid">{categories.map((category, index) => <Link href={`/${category.slug}`} className="category-card" key={category.slug}><span>0{index + 1}</span><h3>{category.name}</h3><p>{category.text}</p><strong>查看教學 →</strong></Link>)}</div></section><section><div className="section-title"><p className="eyebrow">最新解答</p><h2>剛整理好的實用教學</h2></div>{posts.length ? <div className="article-grid">{posts.map((post) => <ArticleCard key={post.id} post={post} />)}</div> : <div className="empty-state"><h3>第一批教學準備中</h3><p>後台發布文章後，內容會自動出現在這裡。</p></div>}</section></main>;
}
