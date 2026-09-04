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

async function main() {
  await seedCategories(prisma);
  process.stdout.write("已建立 1Wiki 初始分類。\n");
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
