import type { Metadata } from "next";
import { CategoryPageContent } from "@/components/site/category-page";
export const metadata: Metadata = { title: "軟體使用教學", description: "Windows、手機與常用軟體操作及修復指南。", alternates: { canonical: "/software" } };
export const dynamic = "force-dynamic";
export default function SoftwarePage() { return <CategoryPageContent slug="software" />; }
