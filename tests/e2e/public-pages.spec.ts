import { expect, test } from "@playwright/test";

test("根網址與舊網址永久轉址到繁體中文並保留 query", async ({ request }) => {
  const root = await request.get("/?source=bookmark", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(root.headers().location).toContain("/zh-tw?source=bookmark");

  const article = await request.get("/articles/chatgpt-login-guide?ref=old", { maxRedirects: 0 });
  expect(article.status()).toBe(308);
  expect(article.headers().location).toContain("/zh-tw/articles/chatgpt-login-guide?ref=old");
});

test("不支援的語系回傳 404", async ({ request }) => {
  expect((await request.get("/fr", { maxRedirects: 0 })).status()).toBe(404);
});

test("公開網站呈現已發布文章，且草稿不可存取", async ({ page }) => {
  await page.goto("/zh-tw");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
  await expect(page.getByRole("heading", { name: /科技卡住了/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ChatGPT 無法登入怎麼辦/ })).toBeVisible();

  await page.goto("/zh-tw/articles/chatgpt-login-guide");
  await expect(page.getByRole("heading", { level: 1, name: "ChatGPT 無法登入怎麼辦？" })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(4);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/zh-tw\/articles\/chatgpt-login-guide$/);

  const draftResponse = await page.goto("/zh-tw/articles/draft-guide");
  expect(draftResponse?.status()).toBe(404);
});

test("語言選擇器進入英文與日文空白首頁", async ({ page }) => {
  await page.goto("/zh-tw/articles/chatgpt-login-guide");
  await page.getByRole("button", { name: "選擇語言：繁體中文" }).click();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Content coming soon" })).toBeVisible();
  await expect(page.getByText("ChatGPT 無法登入怎麼辦？")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.getByRole("button", { name: "Choose language：English" }).click();
  await page.getByRole("link", { name: "日本語" }).click();
  await expect(page).toHaveURL(/\/ja$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 1, name: "コンテンツを準備中です" })).toBeVisible();
});

test("頂部分類可展開下層分類並前往階層網址", async ({ page }) => {
  await page.goto("/zh-tw");
  const trigger = page.getByRole("button", { name: "AI 教學" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const navigation = page.getByRole("navigation", { name: "主要導覽" });
  await expect(navigation.getByRole("link", { name: "全部 AI 教學" })).toHaveAttribute("href", "/zh-tw/category/ai");
  await navigation.getByRole("link", { name: "Prompt 撰寫" }).click();
  await expect(page).toHaveURL(/\/zh-tw\/category\/ai\/chatgpt\/prompt$/);
});

test("階層分類會彙整後代文章並顯示完整麵包屑", async ({ page }) => {
  await page.goto("/zh-tw/category/ai/chatgpt/prompt");
  await expect(page.getByRole("heading", { level: 1, name: "Prompt 撰寫" })).toBeVisible();
  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumbs.getByRole("link", { name: "AI 教學" })).toHaveAttribute("href", "/zh-tw/category/ai");
  await expect(breadcrumbs.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");

  await page.goto("/zh-tw/category/ai");
  await expect(page.getByRole("heading", { name: "ChatGPT 無法登入怎麼辦？" })).toBeVisible();
});

test("已有公開內容的分類與繁中政策頁可導覽", async ({ page }) => {
  for (const [path, heading] of [
    ["/zh-tw/category/ai", "AI 教學"],
    ["/zh-tw/about", "關於 1Wiki"],
    ["/zh-tw/contact", "聯絡我們"],
    ["/zh-tw/privacy", "隱私權政策"],
    ["/zh-tw/terms", "使用條款"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("沒有公開文章的分類不會成為公開頁面", async ({ request }) => {
  expect((await request.get("/zh-tw/category/software", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/zh-tw/category/social", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/en/category/ai", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/zh-tw/ai", { maxRedirects: 0 })).status()).toBe(404);
});

test("sitemap 僅收錄已有公開內容的語系", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const body = await sitemap.text();
  expect(body).toContain("/zh-tw/articles/chatgpt-login-guide");
  expect(body).toContain("/zh-tw/category/ai/chatgpt/prompt");
  expect(body).not.toContain("/zh-tw/ai");
  expect(body).not.toContain("/en");
  expect(body).not.toContain("/ja");
});
