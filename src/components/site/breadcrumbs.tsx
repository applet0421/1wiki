import Link from "next/link";
export function Breadcrumbs({ categoryName, categorySlug, title }: { categoryName: string; categorySlug: string; title: string }) {
  const categoryHref = ["ai", "software", "social"].includes(categorySlug) ? `/${categorySlug}` : `/category/${categorySlug}`;
  return <nav className="breadcrumbs" aria-label="麵包屑"><Link href="/">首頁</Link><span aria-hidden>／</span><Link href={categoryHref}>{categoryName}</Link><span aria-hidden>／</span><span aria-current="page">{title}</span></nav>;
}
