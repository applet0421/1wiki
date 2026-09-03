import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { getSiteUrl } from "@/lib/config/site";
import { getPublishedPostBySlug } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { buildPostMetadata } from "@/lib/seo/metadata";
import { buildArticleJsonLd } from "@/lib/seo/structured-data";
type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(prisma, slug);
  return post ? buildPostMetadata(post) : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(prisma, slug);
  if (!post) notFound();
  return <main className="public-main article-layout"><article className="article-page"><JsonLd value={buildArticleJsonLd(post, getSiteUrl())} /><Breadcrumbs categoryName={post.category.name} categorySlug={post.category.slug} title={post.title} /><header className="article-header"><p className="eyebrow">{post.category.name}</p><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><div className="article-meta"><span>{post.author.displayName}</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(post.publishedAt) : ""}</time>{post.updatedAt > (post.publishedAt || post.createdAt) ? <span>更新於 {new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(post.updatedAt)}</span> : null}</div></header><div className="article-prose public-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} /><aside className="related-box"><strong>繼續探索 {post.category.name}</strong><p>查看更多同類型的使用教學與疑難解答。</p><a href={["ai", "software", "social"].includes(post.category.slug) ? `/${post.category.slug}` : `/category/${post.category.slug}`}>前往分類 →</a></aside></article><aside className="article-sidebar"><div className="sidebar-note"><span>1Wiki 閱讀原則</span><strong>一篇文章，解決一個問題。</strong><p>保留這篇教學，需要時快速回來查看。</p></div></aside></main>;
}
