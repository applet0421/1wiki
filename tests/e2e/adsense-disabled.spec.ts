import { expect, test } from "@playwright/test";

for (const width of [360, 390, 768, 1280]) {
  test(`AdSense 關閉時 ${width}px 無廣告節點、script 或水平溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/articles/chatgpt-login-guide");

    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0);
    await expect(page.locator("ins.adsbygoogle, [data-ad-placement]")).toHaveCount(0);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows).toBe(false);
  });
}
