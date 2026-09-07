"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArticleBlock } from "@/lib/wechat-import/types";
import { assetPreviewUrl, type WeChatAssetView } from "./wechat-wizard-types";
import styles from "./wechat-wizard.module.css";

export function WeChatPreviewImage({ asset, alt }: { asset: WeChatAssetView; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className={styles.warning}>圖片無法載入，請確認暫存期限或重新整理。</p>;
  return <Image src={assetPreviewUrl(asset)} alt={alt} width={960} height={640} unoptimized className={styles.image} onError={() => setFailed(true)} />;
}

export function WeChatArticlePreview({ title, blocks, assets, fallbackHtml }: { title: string; blocks: ArticleBlock[]; assets: WeChatAssetView[]; fallbackHtml?: string | null }) {
  return <article className={styles.article}>
    <h2>{title}</h2>
    {blocks.length ? blocks.map((block, index) => {
      const key = `${block.id}-${index}`;
      if (block.type === "text") return <div className="article-content" key={key} dangerouslySetInnerHTML={{ __html: block.html }} />;
      const asset = assets.find((item) => item.id === block.assetId);
      return <figure key={key}>{asset ? <WeChatPreviewImage asset={asset} alt={block.alt || "文章圖片"} /> : <p className={styles.warning}>圖片引用不存在，請勿轉存此版本。</p>}{block.alt && <figcaption>{block.alt}</figcaption>}</figure>;
    }) : fallbackHtml ? <div className="article-content" dangerouslySetInnerHTML={{ __html: fallbackHtml }} /> : <p className="muted">目前沒有可預覽的正文。</p>}
  </article>;
}
