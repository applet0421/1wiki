"use client";

import { Fragment } from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import type { AdSlotConfig } from "@/lib/adsense/config";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { ArticleCard } from "./article-card";

type FeedPost = { id: string; slug: string; title: string; excerpt: string; publishedAt: string | Date | null; category: { name: string; slug: string; parent?: { name: string; slug: string; parent?: { name: string; slug: string } | null } | null } };

export function ArticleFeedList({ posts, locale, dictionary, inlineAdConfig, adInterval = 10, testId }: { posts: FeedPost[]; locale: Locale; dictionary: SiteDictionary; inlineAdConfig: AdSlotConfig | null; adInterval?: number; testId?: string }) {
  return <ol className="category-article-list" aria-label="文章列表" data-testid={testId}>{posts.map((post, index) => <Fragment key={post.id}><li className="category-article-item"><ArticleCard post={{ ...post, publishedAt: post.publishedAt ? new Date(post.publishedAt) : null }} locale={locale} dictionary={dictionary} /></li>{(index + 1) % adInterval === 0 && index + 1 < posts.length ? <li className="category-feed-ad"><AdSlot placement={inlineAdConfig?.placement ?? "category_inline"} config={inlineAdConfig} /></li> : null}</Fragment>)}</ol>;
}
