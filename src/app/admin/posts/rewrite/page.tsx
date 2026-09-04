import { AIRewriter } from "@/components/admin/ai-rewriter";
import { prisma } from "@/lib/db/prisma";

export default async function RewritePostPage() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <section>
    <p className="eyebrow">AI 內容工作台</p>
    <h1>AI 改寫文章</h1>
    <AIRewriter categories={categories} provider={process.env.LLM_PROVIDER || "deepseek"} />
  </section>;
}
