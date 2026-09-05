import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AuthorByline } from "./author-byline";

it("links the selected author's name to the matching language profile", () => {
  render(<AuthorByline locale="ja" byline={{ name: "著者", slug: "writer" }} fallback="帳號" />);
  expect(screen.getByRole("link", { name: "著者" })).toHaveAttribute("href", "/ja/authors/writer");
  expect(screen.queryByText("帳號")).not.toBeInTheDocument();
});

it("preserves legacy account bylines for articles without a selected author", () => {
  render(<AuthorByline locale="en" byline={null} fallback="Editorial team" />);
  expect(screen.getByText("Editorial team")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
