import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../../tests/helpers/database";
import { hashPassword } from "@/lib/auth/password";
import { generateFromIdea } from "@/lib/ai/content-generator";
import { getCurrentUser } from "@/lib/auth/session";
import { generateContentDraftAction } from "./actions";

vi.mock("@/lib/ai/content-generator", () => ({
  analyzeSource: vi.fn(),
  generateFromIdea: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("generateContentDraftAction", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.clearAllMocks();
  });

  it("creates a draft with AI review metadata and an available slug", async () => {
    const [user, category] = await Promise.all([
      prisma.user.create({ data: { username: "ai-editor", displayName: "AI 編輯", passwordHash: await hashPassword("secure-editor-2026"), mustChangePassword: false } }),
      prisma.category.create({ data: { locale: "zh-tw", name: "軟體", slug: "software" } }),
    ]);
    await prisma.post.create({ data: {
      locale: "zh-tw", title: "既有文章", slug: "line-notification-fix", authorId: user.id, categoryId: category.id,
    } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(generateFromIdea).mockResolvedValue({
      title: "LINE 收不到通知？常見原因與解決方法",
      slug: "line-notification-fix",
      contentHtml: "<h2>快速解決</h2><p>先檢查通知設定。</p>",
      excerpt: "LINE 通知問題排解步驟。",
      seoTitle: "LINE 收不到通知解決方法",
      seoDescription: "依序排除 LINE 通知問題。",
      seoKeywords: "LINE,通知",
      categoryId: category.id,
      needsVerification: ["確認最新版選單名稱"],
    });

    const idea = { type: "TROUBLESHOOTING" as const, title: "LINE 收不到通知", primaryKeyword: "LINE 收不到通知", searchIntent: "排除 LINE 通知問題", support: "STRONG" as const };
    const result = await generateContentDraftAction({ locale: "zh-tw", sourceContent: "LINE 官方通知設定說明", idea });

    if (!result.ok) throw new Error(result.error);
    const stored = await prisma.post.findUniqueOrThrow({ where: { id: result.data.postId } });
    expect(stored).toMatchObject({
      slug: "line-notification-fix-2",
      locale: "zh-tw",
      status: "DRAFT",
      categoryId: category.id,
      aiContentType: "TROUBLESHOOTING",
      primaryKeyword: "LINE 收不到通知",
      searchIntent: "排除 LINE 通知問題",
      aiSourceSupport: "STRONG",
      aiNeedsVerification: ["確認最新版選單名稱"],
    });
  });
});
