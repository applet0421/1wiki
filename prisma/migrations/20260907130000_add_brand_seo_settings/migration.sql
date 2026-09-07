CREATE TABLE "BrandSeoSettings" (
  "id" TEXT NOT NULL,
  "siteName" TEXT NOT NULL,
  "alternateName" TEXT,
  "icon48SourceUrl" TEXT,
  "logoSourceUrl" TEXT,
  "defaultOgSourceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandSeoSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocaleSeoSettings" (
  "locale" TEXT NOT NULL,
  "homeTitle" TEXT,
  "homeDescription" TEXT,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LocaleSeoSettings_pkey" PRIMARY KEY ("locale")
);
