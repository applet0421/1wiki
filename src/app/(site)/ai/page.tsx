import type { Metadata } from "next";
import { CategoryPageContent } from "@/components/site/category-page";
export const metadata: Metadata = { title: "AI 使用教學", description: "AI 工具、ChatGPT 使用與疑難排解。", alternates: { canonical: "/ai" } };
export const dynamic = "force-dynamic";
export default function AIPage() { return <CategoryPageContent slug="ai" />; }
