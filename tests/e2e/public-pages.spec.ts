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
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /科技卡住了/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ChatGPT 無法登入怎麼辦/ })).toBeVisible();

  await page.goto("/articles/chatgpt-login-guide");
  await expect(page.getByRole("heading", { level: 1, name: "ChatGPT 無法登入怎麼辦？" })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/articles\/chatgpt-login-guide$/);

  const draftResponse = await page.goto("/articles/draft-guide");
  expect(draftResponse?.status()).toBe(404);
});

test("主要分類與政策頁可導覽", async ({ page }) => {
  for (const [path, heading] of [
    ["/ai", "AI 教學"],
    ["/software", "軟體教學"],
    ["/social", "社群平台"],
    ["/about", "關於 1Wiki"],
    ["/contact", "聯絡我們"],
    ["/privacy", "隱私權政策"],
    ["/terms", "使用條款"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});
