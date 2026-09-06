-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "canonicalUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_locale_slug_key" ON "SitePage"("locale", "slug");

-- CreateIndex
CREATE INDEX "SitePage_locale_status_publishedAt_idx" ON "SitePage"("locale", "status", "publishedAt");

-- Preserve the existing built-in information pages as editable content.
INSERT INTO "SitePage" ("id", "locale", "title", "slug", "excerpt", "contentHtml", "status", "publishedAt", "updatedAt") VALUES
('site-page-zh-tw-about', 'zh-tw', '關於 1Wiki', 'about', '我們把複雜的科技問題，整理成容易理解、可以照著操作的繁體中文教學。', '<h2>我們在做什麼</h2><p>1Wiki 專注於 AI、軟體、社群平台與 3C 產品的使用教學及疑難解答。</p>', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('site-page-zh-tw-contact', 'zh-tw', '聯絡我們', 'contact', '如果你發現教學需要更新、內容有誤，或想回報網站問題，歡迎與我們聯絡。', '<h2>聯絡方式</h2><p>請透過網站公開的聯絡方式回報內容問題，並附上文章網址與需要更正的段落。</p>', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('site-page-zh-tw-privacy', 'zh-tw', '隱私權政策', 'privacy', '本政策說明你使用 1Wiki 時，網站可能處理哪些資料以及這些資料的用途。', '<h2>資料處理</h2><p>網站可能記錄 IP 位址、瀏覽器類型、造訪時間與請求頁面，用於維持服務、安全防護與問題排查。</p>', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('site-page-zh-tw-terms', 'zh-tw', '使用條款', 'terms', '造訪或使用 1Wiki，即表示你同意以下基本規則。', '<h2>內容用途</h2><p>本站內容提供一般資訊與操作參考，不構成法律、醫療、財務或其他專業建議。</p>', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
