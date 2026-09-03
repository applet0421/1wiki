import { notFound } from "next/navigation";
import { getPublishedCategory } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { ArticleCard } from "./article-card";

export async function CategoryPageContent({ slug }: { slug: string }) {
  const category = await getPublishedCategory(prisma, slug);
  if (!category) notFound();
  return <main className="public-main"><header className="page-hero"><p className="eyebrow">主題分類</p><h1>{category.name}</h1><p>{category.description}</p></header>{category.posts.length ? <div className="article-grid">{category.posts.map((post) => <ArticleCard key={post.id} post={post} />)}</div> : <div className="empty-state"><h2>內容準備中</h2><p>這個分類的教學正在整理，很快就會更新。</p></div>}</main>;
}
