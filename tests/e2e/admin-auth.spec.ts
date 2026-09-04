import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("帳號").fill(username);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("未登入時會導向登入頁，OWNER 可管理帳號", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);

  await login(page, "owner", "Owner-password-2026");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prompt 管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "LLM 用量" })).toBeVisible();
  await page.getByRole("link", { name: "Prompt 管理" }).click();
  await expect(page.getByRole("heading", { name: "Prompt 管理" })).toBeVisible();
  await page.getByRole("link", { name: "LLM 用量" }).click();
  await expect(page.getByRole("heading", { name: "LLM 用量管理" })).toBeVisible();
  await page.getByRole("link", { name: "帳號" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "後台帳號", exact: true })).toBeVisible();
});

test("OWNER 可以修改帳號顯示名稱", async ({ page }) => {
  await login(page, "owner", "Owner-password-2026");
  await page.goto("/admin/users");
  const displayName = page.getByLabel("顯示名稱（owner）");
  const ownerRow = page.getByRole("row").filter({ has: displayName });
  await displayName.fill("新站長");
  await ownerRow.getByRole("button", { name: "更新" }).click();

  await expect(page.getByText("帳號設定已更新。")).toBeVisible();
  await expect(page.getByLabel("顯示名稱（owner）")).toHaveValue("新站長");
});

test("EDITOR 可進入後台但不能開啟帳號管理", async ({ page }) => {
  await login(page, "editor", "Editor-password-2026");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "帳號" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Prompt 管理" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "LLM 用量" })).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/prompts");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/llm-usage");
  await expect(page).toHaveURL(/\/admin$/);
});

test("OWNER 可建立三級分類且不能建立第四級或刪除有子分類的根分類", async ({ page }) => {
  await login(page, "owner", "Owner-password-2026");
  await page.goto("/admin/categories");
  const createForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "建立分類" }) });

  await createForm.getByLabel("名稱").fill("測試根分類");
  await createForm.getByLabel("網址代稱").fill("e2e-root");
  await createForm.getByRole("button", { name: "建立分類" }).click();
  await expect(page.getByText("分類已建立。")).toBeVisible();

  await createForm.getByLabel("名稱").fill("測試子分類");
  await createForm.getByLabel("網址代稱").fill("e2e-child");
  await createForm.getByLabel("上層分類").selectOption({ label: "測試根分類" });
  await createForm.getByRole("button", { name: "建立分類" }).click();
  await expect(page.getByRole("heading", { name: "測試子分類" })).toBeVisible();

  await createForm.getByLabel("名稱").fill("測試末分類");
  await createForm.getByLabel("網址代稱").fill("e2e-leaf");
  await createForm.getByLabel("上層分類").selectOption({ label: "— 測試子分類" });
  await createForm.getByRole("button", { name: "建立分類" }).click();
  await expect(page.getByRole("heading", { name: "測試末分類" })).toBeVisible();

  await expect(createForm.getByRole("option", { name: "—— 測試末分類" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "刪除 測試根分類" })).toBeDisabled();
  await expect(page.getByText("分類仍有子分類，無法刪除").last()).toBeVisible();
});
