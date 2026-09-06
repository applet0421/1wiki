import type { Locale } from "@/lib/i18n/config";
import { revalidatePath } from "next/cache";

export type PublicInvalidationInput = {
  locale: Locale;
  articleSlugs?: string[];
  categoryPaths?: string[];
  authorSlugs?: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function buildPublicInvalidationPaths(input: PublicInvalidationInput): string[] {
  const locale = `/${input.locale}`;
  const paths = [locale];

  paths.push(...unique(input.articleSlugs ?? []).map((slug) => `${locale}/articles/${slug}`));
  paths.push(...unique(input.categoryPaths ?? []).map((path) => `${locale}/category/${path}`));
  paths.push(...unique(input.authorSlugs ?? []).map((slug) => `${locale}/authors/${slug}`));
  paths.push("/sitemap.xml");

  return unique(paths);
}

export function revalidatePublicContent(input: PublicInvalidationInput): string[] {
  const paths = buildPublicInvalidationPaths(input);
  for (const path of paths) revalidatePath(path);
  return paths;
}
