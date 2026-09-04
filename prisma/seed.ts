import type { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { prisma } from "../src/lib/db/prisma";
import { defaultLocale } from "../src/lib/i18n/config";

const initialCategories = [
  { name: "AI 教學", slug: "ai", description: "AI 工具使用、設定與疑難排解。" },
  { name: "軟體教學", slug: "software", description: "電腦與手機軟體的操作與修復指南。" },
  { name: "社群平台", slug: "social", description: "LINE、YouTube 與社群服務的使用解答。" },
] as const;

export async function seedCategories(client: PrismaClient): Promise<void> {
  for (const category of initialCategories) {
    await client.category.upsert({
      where: { locale_slug: { locale: defaultLocale, slug: category.slug } },
      update: {
        name: category.name,
        description: category.description,
      },
      create: { ...category, locale: defaultLocale },
    });
  }
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
