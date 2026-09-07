import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("brand favicon assets", () => {
  it("provides a 48px PNG for search surfaces", async () => {
    const file = await readFile(join(process.cwd(), "public/icon-48.png"));
    const metadata = await sharp(file).metadata();

    expect(metadata).toMatchObject({ format: "png", width: 48, height: 48 });
  });

  it("provides a valid root favicon ICO", async () => {
    const file = await readFile(join(process.cwd(), "public/favicon.ico"));

    expect([...file.subarray(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
    expect(file[6]).toBe(48);
  });
});
