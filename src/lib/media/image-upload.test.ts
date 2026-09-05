import { describe, expect, it } from "vitest";
import { createImageUpload } from "./image-upload";

describe("createImageUpload", () => {
  it("creates a collision-resistant R2 key and public URL for an allowed image", () => {
    const upload = createImageUpload(
      { name: "產品主圖.PNG", type: "image/png", size: 1_024 },
      { publicBaseUrl: "https://media.example.com/", now: () => new Date("2026-09-05T12:00:00.000Z"), randomId: () => "abc123" },
    );

    expect(upload).toEqual({
      contentType: "image/png",
      key: "uploads/2026/09/abc123.png",
      publicUrl: "https://media.example.com/uploads/2026/09/abc123.png",
    });
  });

  it("rejects a disallowed file type before an upload URL can be issued", () => {
    expect(() => createImageUpload(
      { name: "malware.svg", type: "image/svg+xml", size: 1_024 },
      { publicBaseUrl: "https://media.example.com", randomId: () => "abc123" },
    )).toThrow("僅支援 JPEG、PNG、WebP 或 GIF 圖片");
  });

  it("rejects images larger than 10 MB", () => {
    expect(() => createImageUpload(
      { name: "huge.jpg", type: "image/jpeg", size: 10 * 1024 * 1024 + 1 },
      { publicBaseUrl: "https://media.example.com", randomId: () => "abc123" },
    )).toThrow("圖片不可超過 10 MB");
  });
});
