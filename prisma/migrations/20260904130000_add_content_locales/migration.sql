-- AlterTable
ALTER TABLE "Category" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'zh-tw';
ALTER TABLE "Post" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'zh-tw';

-- Replace global slug constraints and the category foreign key with locale-aware constraints
ALTER TABLE "Post" DROP CONSTRAINT "Post_categoryId_fkey";
DROP INDEX "Category_slug_key";
DROP INDEX "Post_slug_key";
CREATE UNIQUE INDEX "Category_id_locale_key" ON "Category"("id", "locale");
CREATE UNIQUE INDEX "Category_locale_slug_key" ON "Category"("locale", "slug");
CREATE UNIQUE INDEX "Post_locale_slug_key" ON "Post"("locale", "slug");
CREATE INDEX "Post_locale_status_publishedAt_idx" ON "Post"("locale", "status", "publishedAt");
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_locale_fkey" FOREIGN KEY ("categoryId", "locale") REFERENCES "Category"("id", "locale") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Locale values must always be supplied explicitly after existing rows are backfilled
ALTER TABLE "Category" ALTER COLUMN "locale" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "locale" DROP DEFAULT;
