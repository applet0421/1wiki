import { describe, expect, it } from "vitest";
import { assertOwner, assertUser } from "./authorize";

const editor = {
  id: "user-1",
  username: "editor",
  displayName: "編輯",
  role: "EDITOR" as const,
  isActive: true,
  mustChangePassword: false,
};

describe("authorization", () => {
  it("rejects missing and inactive users", () => {
    expect(() => assertUser(null)).toThrow("尚未登入");
    expect(() => assertUser({ ...editor, isActive: false })).toThrow("帳號已停用");
  });

  it("allows only owners through owner authorization", () => {
    expect(() => assertOwner(editor)).toThrow("權限不足");
    expect(
      assertOwner({ ...editor, role: "OWNER" }),
    ).toMatchObject({ role: "OWNER" });
  });
});
