import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../tests/helpers/database";
import { getCurrentUser } from "@/lib/auth/session";
import { saveAuthorAction, archiveAuthorAction } from "./actions";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));

beforeEach(async () => { await resetDatabase(); vi.mocked(getCurrentUser).mockResolvedValue(null); });
const form = () => {
  const data = new FormData();
  data.set("locale", "en"); data.set("name", "Test Author"); data.set("slug", "test-author"); data.set("contentHtml", "<p>Biography</p>");
  return data;
};

it("requires login for saving and archiving", async () => {
  await expect(saveAuthorAction({}, form())).rejects.toThrow("redirect:/login");
  await expect(archiveAuthorAction(form())).rejects.toThrow("redirect:/login");
  expect(await prisma.author.count()).toBe(0);
});

it("allows editors to save and returns validation feedback without losing the form", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "editor", username: "editor", displayName: "Editor", role: "EDITOR", isActive: true, mustChangePassword: false });
  await expect(saveAuthorAction({}, form())).rejects.toThrow("redirect:/admin/authors?locale=en&success=saved");
  expect(await prisma.author.findFirst()).toMatchObject({ name: "Test Author", locale: "en", contentHtml: "<p>Biography</p>" });
  expect(await saveAuthorAction({}, form())).toMatchObject({ error: "此語系的作者網址代稱已被使用" });
  const invalid = form(); invalid.set("name", "");
  expect(await saveAuthorAction({}, invalid)).toMatchObject({ error: "作者名稱不能空白" });
});
