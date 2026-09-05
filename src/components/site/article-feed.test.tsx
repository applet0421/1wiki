import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ArticleFeed } from "./article-feed";

let intersect: IntersectionObserverCallback;
vi.stubGlobal("IntersectionObserver", class {
  constructor(callback: IntersectionObserverCallback) { intersect = callback; }
  observe() {}
  disconnect() {}
});
afterEach(() => vi.clearAllMocks());
const nearBottom = () => act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

it("loads one article near the bottom, avoids concurrent requests, and stops when exhausted", async () => {
  let finish!: (value: { id: string; content: React.ReactNode }) => void;
  const loadMore = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(null);
  render(<ArticleFeed locale="zh-tw" loadMore={loadMore}><article>Original article</article></ArticleFeed>);
  expect(loadMore).not.toHaveBeenCalled();
  nearBottom();
  nearBottom();
  expect(loadMore).toHaveBeenCalledTimes(1);
  await act(async () => finish({ id: "next", content: <article>Next full article</article> }));
  expect(screen.getByText("Original article")).toBeInTheDocument();
  expect(screen.getByText("Next full article")).toBeInTheDocument();
  nearBottom();
  await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
  expect(loadMore).toHaveBeenLastCalledWith("next");
  nearBottom();
  expect(loadMore).toHaveBeenCalledTimes(2);
});

it("keeps existing content after failure and allows an explicit retry", async () => {
  const loadMore = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "next", content: <article>Recovered article</article> });
  render(<ArticleFeed locale="zh-tw" loadMore={loadMore}><article>Original article</article></ArticleFeed>);
  nearBottom();
  await screen.findByRole("button", { name: "重試載入" });
  nearBottom();
  expect(loadMore).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "重試載入" }));
  expect(await screen.findByText("Recovered article")).toBeInTheDocument();
  expect(screen.getByText("Original article")).toBeInTheDocument();
});

it("does not append a repeated article from a stale response", async () => {
  const loadMore = vi.fn().mockResolvedValue({ id: "same", content: <article>Only once</article> });
  render(<ArticleFeed locale="zh-tw" loadMore={loadMore}><article>Original</article></ArticleFeed>);
  nearBottom();
  await screen.findByText("Only once");
  nearBottom();
  await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
  expect(screen.getAllByText("Only once")).toHaveLength(1);
});
