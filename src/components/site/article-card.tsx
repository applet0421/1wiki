import Link from "next/link";
type CardPost = { slug: string; title: string; excerpt: string; publishedAt: Date | null; category: { name: string; slug: string } };
export function ArticleCard({ post }: { post: CardPost }) {
  return <article className="article-card"><Link className="card-category" href={post.category.slug === "ai" || post.category.slug === "software" || post.category.slug === "social" ? `/${post.category.slug}` : `/category/${post.category.slug}`}>{post.category.name}</Link><h2><Link href={`/articles/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(post.publishedAt) : ""}</time><Link href={`/articles/${post.slug}`}>閱讀解答 →</Link></div></article>;
}
