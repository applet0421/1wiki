import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../../tests/helpers/database";
import AuthorPage, { generateMetadata } from "./page";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
beforeEach(resetDatabase);

it("renders an archived author's biography and published articles without exposing drafts or other languages", async () => {
  const author = await prisma.author.create({ data: { locale: "en", name: "Test Writer", slug: "writer", contentHtml: "<p>Writes practical technology guides.</p>", archivedAt: new Date() } });
  const user = await prisma.user.create({ data: { username: "editor", displayName: "Editor", passwordHash: "test" } });
  const category = await prisma.category.create({ data: { name: "AI", slug: "ai", locale: "en" } });
  const data = { locale: "en", title: "Visible article", slug: "visible", authorId: user.id, categoryId: category.id, bylineId: author.id };
  await prisma.post.create({ data: { ...data, status: "PUBLISHED", publishedAt: new Date("2026-01-01") } });
  await prisma.post.create({ data: { ...data, title: "Private draft", slug: "draft" } });
  render(await AuthorPage({ params: Promise.resolve({ locale: "en", slug: "writer" }) }));
  expect(screen.getByRole("heading", { name: "Test Writer" })).toBeInTheDocument();
  expect(screen.getByText("Writes practical technology guides.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Visible article" })).toHaveAttribute("href", "/en/articles/visible");
  expect(screen.queryByText("Private draft")).not.toBeInTheDocument();
  expect(await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "writer" }) })).toMatchObject({ title: "Test Writer", description: "Writes practical technology guides." });
  await expect(AuthorPage({ params: Promise.resolve({ locale: "ja", slug: "writer" }) })).rejects.toThrow("NOT_FOUND");
  await expect(AuthorPage({ params: Promise.resolve({ locale: "xx", slug: "writer" }) })).rejects.toThrow("NOT_FOUND");
});
