"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";

const labels = {
  "zh-tw": { next: "繼續閱讀同分類文章", loading: "正在載入下一篇文章…", retry: "重試載入", error: "暫時無法載入下一篇文章。", end: "已讀完此分類的其他文章" },
  en: { next: "Read another article in this category", loading: "Loading the next article…", retry: "Retry loading", error: "The next article could not be loaded.", end: "No more articles in this category" },
  ja: { next: "同じカテゴリーの記事を続けて読む", loading: "次の記事を読み込み中…", retry: "再試行", error: "次の記事を読み込めませんでした。", end: "このカテゴリーの他の記事は以上です" },
};

type FeedEntry = { id: string; content: ReactNode };

export function ArticleFeed({ children, locale, loadMore }: { children: ReactNode; locale: Locale; loadMore: (afterId: string | null) => Promise<FeedEntry | null> }) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "end">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const stopped = useRef(false);
  const mounted = useRef(true);
  const cursor = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const text = labels[locale];

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (busy.current || stopped.current) return;
    busy.current = true;
    setStatus("loading");
    try {
      const entry = await loadMore(cursor.current);
      if (!mounted.current) return;
      if (!entry || seen.current.has(entry.id)) {
        stopped.current = true;
        setStatus("end");
        return;
      }
      seen.current.add(entry.id);
      cursor.current = entry.id;
      setEntries((current) => [...current, entry]);
      setStatus("idle");
    } catch {
      if (mounted.current) setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [loadMore]);

  useEffect(() => {
    if (status !== "idle" || !sentinel.current || typeof IntersectionObserver === "undefined") return;
    let active = true;
    const observer = new IntersectionObserver((items) => {
      if (active && items.some((item) => item.isIntersecting)) {
        active = false;
        observer.disconnect();
        void load();
      }
    }, { rootMargin: "0px 0px 600px 0px" });
    observer.observe(sentinel.current);
    return () => { active = false; observer.disconnect(); };
  }, [load, status, entries.length]);

  return <>
    {children}
    {entries.map((entry) => <div className="article-continuation" key={entry.id}>
      <div className="article-feed-separator" aria-hidden="true" />
      {entry.content}
    </div>)}
    <div className="article-feed-loader" ref={sentinel} aria-busy={status === "loading"}>
      <p role="status" aria-live="polite">{status === "loading" ? text.loading : status === "error" ? text.error : status === "end" ? text.end : ""}</p>
      {status !== "end" ? <button type="button" disabled={status === "loading"} onClick={() => void load()}>{status === "error" ? text.retry : text.next}</button> : null}
    </div>
  </>;
}
