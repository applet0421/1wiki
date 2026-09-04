import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55432/onewiki_test";

export default async function globalSetup() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    await prisma.session.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();

    const [ownerPasswordHash, editorPasswordHash] = await Promise.all([
      hashPassword("Owner-password-2026"),
      hashPassword("Editor-password-2026"),
    ]);
    const [owner, editor] = await Promise.all([
      prisma.user.create({
        data: {
          username: "owner",
          displayName: "站長",
          passwordHash: ownerPasswordHash,
          role: "OWNER",
          mustChangePassword: false,
        },
      }),
      prisma.user.create({
        data: {
          username: "editor",
          displayName: "編輯",
          passwordHash: editorPasswordHash,
          role: "EDITOR",
          mustChangePassword: false,
        },
      }),
    ]);
    const [ai] = await Promise.all([
      prisma.category.create({ data: { locale: "zh-tw", name: "AI 教學", slug: "ai", description: "AI 工具使用教學" } }),
      prisma.category.create({ data: { locale: "zh-tw", name: "軟體教學", slug: "software", description: "軟體疑難解答" } }),
      prisma.category.create({ data: { locale: "zh-tw", name: "社群平台", slug: "social", description: "社群平台教學" } }),
      prisma.category.create({ data: { locale: "en", name: "AI", slug: "ai", description: "AI guides" } }),
    ]);

    const longSection = "遇到登入問題時，先確認網路、瀏覽器時間與帳號資料是否正確，再依序清除快取並重新登入。".repeat(24);
    await prisma.post.createMany({
      data: [
        {
          locale: "zh-tw",
          title: "ChatGPT 無法登入怎麼辦？",
          slug: "chatgpt-login-guide",
          excerpt: "整理 ChatGPT 無法登入的常見原因與逐步解法。",
          contentHtml: `<p>先從最常見的狀況開始檢查，通常幾分鐘內就能排除問題。</p><h2>確認帳號與網路</h2><p>${longSection}</p><h2>清除瀏覽器資料</h2><p>${longSection}</p><h2>仍然無法登入</h2><p>${longSection}</p>`,
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-04T00:00:00.000Z"),
          categoryId: ai.id,
          authorId: owner.id,
          seoTitle: "ChatGPT 無法登入：完整排解步驟｜1Wiki",
          seoDescription: "依序排除 ChatGPT 無法登入的帳號、網路與瀏覽器問題。",
        },
        {
          locale: "zh-tw",
          title: "尚未發布的內部草稿",
          slug: "draft-guide",
          excerpt: "這篇內容不應出現在公開網站。",
          contentHtml: "<p>草稿內容</p>",
          status: "DRAFT",
          categoryId: ai.id,
          authorId: editor.id,
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}
