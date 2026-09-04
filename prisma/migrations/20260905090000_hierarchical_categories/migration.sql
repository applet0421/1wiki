ALTER TABLE "Category"
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Category" SET "showInNavigation" = true;

CREATE INDEX "Category_locale_parentId_sortOrder_idx"
  ON "Category"("locale", "parentId", "sortOrder");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_locale_fkey"
  FOREIGN KEY ("parentId", "locale")
  REFERENCES "Category"("id", "locale")
  ON DELETE RESTRICT ON UPDATE CASCADE;
