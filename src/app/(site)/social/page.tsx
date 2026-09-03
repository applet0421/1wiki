import type { Metadata } from "next";
import { CategoryPageContent } from "@/components/site/category-page";
export const metadata: Metadata = { title: "社群平台教學", description: "LINE、YouTube 與社群服務操作及疑難排解。", alternates: { canonical: "/social" } };
export const dynamic = "force-dynamic";
export default function SocialPage() { return <CategoryPageContent slug="social" />; }
