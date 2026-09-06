import type { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { prisma } from "../src/lib/db/prisma";

const initialCategories = [
  { locale: "zh-tw", name: "AI 教學", slug: "ai", description: "AI 工具使用、設定與疑難排解。", sortOrder: 0 },
  { locale: "zh-tw", name: "軟體教學", slug: "software", description: "電腦與手機軟體的操作與修復指南。", sortOrder: 1 },
  { locale: "zh-tw", name: "社群平台", slug: "social", description: "LINE、YouTube 與社群服務的使用解答。", sortOrder: 2 },
  { locale: "en", name: "AI", slug: "ai", description: "AI tools, setup, and troubleshooting.", sortOrder: 0 },
  { locale: "en", name: "Software", slug: "software", description: "Practical software guides and fixes.", sortOrder: 1 },
  { locale: "en", name: "Social", slug: "social", description: "Guides for social platforms and services.", sortOrder: 2 },
  { locale: "ja", name: "AI", slug: "ai", description: "AIツールの設定とトラブル解決。", sortOrder: 0 },
  { locale: "ja", name: "ソフトウェア", slug: "software", description: "ソフトウェアの操作と修復ガイド。", sortOrder: 1 },
  { locale: "ja", name: "SNS", slug: "social", description: "SNSサービスの実用ガイド。", sortOrder: 2 },
] as const;

export async function seedCategories(client: PrismaClient): Promise<void> {
  for (const category of initialCategories) {
    await client.category.upsert({
      where: { locale_slug: { locale: category.locale, slug: category.slug } },
      update: {
        name: category.name,
        description: category.description,
        parentId: null,
        showInNavigation: true,
        sortOrder: category.sortOrder,
      },
      create: { ...category, showInNavigation: true },
    });
  }

  const ai = await client.category.findUniqueOrThrow({ where: { locale_slug: { locale: "zh-tw", slug: "ai" } } });
  const chatgpt = await client.category.upsert({
    where: { locale_slug: { locale: "zh-tw", slug: "chatgpt" } },
    update: { name: "ChatGPT", description: "ChatGPT 功能、設定與疑難排解。", parentId: ai.id, showInNavigation: false, sortOrder: 0 },
    create: { locale: "zh-tw", name: "ChatGPT", slug: "chatgpt", description: "ChatGPT 功能、設定與疑難排解。", parentId: ai.id, sortOrder: 0 },
  });
  await client.category.upsert({
    where: { locale_slug: { locale: "zh-tw", slug: "prompt" } },
    update: { name: "Prompt 撰寫", description: "Prompt 撰寫方法與範例。", parentId: chatgpt.id, showInNavigation: false, sortOrder: 0 },
    create: { locale: "zh-tw", name: "Prompt 撰寫", slug: "prompt", description: "Prompt 撰寫方法與範例。", parentId: chatgpt.id, sortOrder: 0 },
  });
}

const initialSitePages = [
  { slug: "about", title: "關於 1Wiki", excerpt: "我們把複雜的科技問題，整理成容易理解、可以照著操作的繁體中文教學。", contentHtml: "<h2>我們在做什麼</h2><p>1Wiki 專注於 AI、軟體、社群平台與 3C 產品的使用教學及疑難解答。</p>" },
  { slug: "contact", title: "聯絡我們", excerpt: "如果你發現教學需要更新、內容有誤，或想回報網站問題，歡迎與我們聯絡。", contentHtml: "<h2>聯絡方式</h2><p>請透過網站公開的聯絡方式回報內容問題，並附上文章網址與需要更正的段落。</p>" },
  { slug: "privacy", title: "隱私權政策", excerpt: "本政策說明你使用 1Wiki 時，網站可能處理哪些資料以及這些資料的用途。", contentHtml: "<h2>資料處理</h2><p>網站可能記錄 IP 位址、瀏覽器類型、造訪時間與請求頁面，用於維持服務、安全防護與問題排查。</p>" },
  { slug: "terms", title: "使用條款", excerpt: "造訪或使用 1Wiki，即表示你同意以下基本規則。", contentHtml: "<h2>內容用途</h2><p>本站內容提供一般資訊與操作參考，不構成法律、醫療、財務或其他專業建議。</p>" },
] as const;

export async function seedSitePages(client: PrismaClient): Promise<void> {
  for (const page of initialSitePages) {
    const existing = await client.sitePage.findUnique({ where: { locale_slug: { locale: "zh-tw", slug: page.slug } }, select: { id: true } });
    if (!existing) await client.sitePage.create({ data: { locale: "zh-tw", ...page, status: "PUBLISHED", publishedAt: new Date() } });
  }
}

async function main() {
  await seedCategories(prisma);
  await seedSitePages(prisma);
  process.stdout.write("已建立 1Wiki 初始分類與網站頁面。\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "分類初始化失敗";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
