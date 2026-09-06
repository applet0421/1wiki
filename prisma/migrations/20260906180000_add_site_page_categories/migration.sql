-- AlterTable
ALTER TABLE "SitePage" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "SitePage_categoryId_locale_status_idx" ON "SitePage"("categoryId", "locale", "status");

-- AddForeignKey
ALTER TABLE "SitePage" ADD CONSTRAINT "SitePage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
