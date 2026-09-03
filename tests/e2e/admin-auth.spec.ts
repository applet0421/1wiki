import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("帳號").fill(username);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "登入" }).click();
}

test("未登入時會導向登入頁，OWNER 可管理帳號", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);

  await login(page, "owner", "Owner-password-2026");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();
  await page.getByRole("link", { name: "帳號" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "後台帳號", exact: true })).toBeVisible();
});

test("EDITOR 可進入後台但不能開啟帳號管理", async ({ page }) => {
  await login(page, "editor", "Editor-password-2026");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "帳號" })).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/);
});
