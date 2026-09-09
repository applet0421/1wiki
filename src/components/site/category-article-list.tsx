"use client";

import { useEffect, useRef, useState } from "react";
import type { AdSlotConfig } from "@/lib/adsense/config";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { ArticleFeedList } from "./article-feed-list";

type CategoryPost = { id: string; slug: string; title: string; excerpt: string; publishedAt: string | Date | null; category: { name: string; slug: string; parent?: { name: string; slug: string; parent?: { name: string; slug: string } | null } | null } };

export function CategoryArticleList({ initialPosts, locale, dictionary, path, inlineAdConfig, adInterval = 10 }: { initialPosts: CategoryPost[]; locale: Locale; dictionary: SiteDictionary; path: string; inlineAdConfig: AdSlotConfig | null; adInterval?: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading || !hasMore) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/categories/posts?locale=${encodeURIComponent(locale)}&path=${encodeURIComponent(path)}&offset=${posts.length}&limit=10`);
        if (!response.ok) throw new Error("load failed");
        const result = await response.json() as { posts: CategoryPost[]; hasMore: boolean };
        setPosts((current) => [...current, ...result.posts]);
        setHasMore(result.hasMore);
      } finally { setLoading(false); }
    }, { rootMargin: "500px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, locale, path, posts.length]);

  return <>
    <ArticleFeedList posts={posts} locale={locale} dictionary={dictionary} adInterval={adInterval} inlineAdConfig={inlineAdConfig} />
    <div ref={sentinel} className="category-load-sentinel" aria-live="polite">{loading ? "載入更多文章…" : ""}</div>
  </>;
}
