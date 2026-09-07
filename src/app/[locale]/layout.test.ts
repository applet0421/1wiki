import { describe, expect, it } from "vitest";
import { generateMetadata } from "./layout";

describe("localized site metadata", () => {
  it("publishes a branded, task-specific homepage description", async () => {
    const metadata = await generateMetadata({ children: null, params: Promise.resolve({ locale: "zh-tw" }) });

    expect(metadata.description).toBe("1Wiki 提供 AI、LINE、軟體與 3C 疑難解答，以清楚步驟協助你完成設定、排除錯誤並安全使用常見科技服務。");
  });

  it("advertises stable raster and vector favicon URLs", async () => {
    const metadata = await generateMetadata({ children: null, params: Promise.resolve({ locale: "zh-tw" }) });

    expect(metadata.icons).toEqual({
      icon: [
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    });
  });
});
