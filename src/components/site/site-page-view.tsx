import type { ReactNode } from "react";

export function SitePageView({ title, excerpt, contentHtml, children }: { title: string; excerpt: string; contentHtml: string; children?: ReactNode }) {
  return <main className="public-main info-page"><header className="page-hero"><p className="eyebrow">1Wiki</p><h1>{title}</h1>{excerpt ? <p>{excerpt}</p> : null}</header><div className="info-content">{contentHtml ? <div className="article-prose public-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} /> : children}</div></main>;
}
