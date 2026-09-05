CREATE TABLE "Author" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL DEFAULT '',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Author_id_locale_key" ON "Author"("id", "locale");
CREATE UNIQUE INDEX "Author_locale_slug_key" ON "Author"("locale", "slug");
CREATE INDEX "Author_locale_archivedAt_name_idx" ON "Author"("locale", "archivedAt", "name");
ALTER TABLE "Post" ADD COLUMN "bylineId" TEXT;
CREATE INDEX "Post_bylineId_locale_idx" ON "Post"("bylineId", "locale");
ALTER TABLE "Post" ADD CONSTRAINT "Post_bylineId_locale_fkey" FOREIGN KEY ("bylineId", "locale") REFERENCES "Author"("id", "locale") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve each existing account byline independently in every article language.
INSERT INTO "Author" ("id", "locale", "name", "slug", "updatedAt")
SELECT DISTINCT 'c' || md5(p."authorId" || ':' || p."locale"), p."locale", u."displayName", 'author-' || p."authorId", CURRENT_TIMESTAMP
FROM "Post" p JOIN "User" u ON u."id" = p."authorId";
UPDATE "Post" SET "bylineId" = 'c' || md5("authorId" || ':' || "locale");

-- Author management uses the authenticated Next.js server via Prisma only.
ALTER TABLE "Author" ENABLE ROW LEVEL SECURITY;
