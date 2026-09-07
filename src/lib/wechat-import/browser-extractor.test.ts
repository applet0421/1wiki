import { describe, expect, it, vi } from "vitest";
import { extractViaBrowser } from "./browser-extractor";

describe("WeChat browser extractor", () => {
  it("uses a headless, host-pinned browser and closes it after extracting", async () => {
    const page = { route: vi.fn(), goto: vi.fn(), evaluate: vi.fn(), waitForTimeout: vi.fn(), content: vi.fn().mockResolvedValue("<h1 id='activity-name'>標題</h1><div id='js_content'><p>內文</p></div>") };
    const context = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn() };
    const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
    const launch = vi.fn().mockResolvedValue(browser);
    const result = await extractViaBrowser("https://mp.weixin.qq.com/s/example", { launch, resolveAddress: async () => ({ address: "93.184.216.34", family: 4 }) });
    expect(result.fetchMethod).toBe("CHROMIUM");
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ executablePath: "/usr/bin/chromium", headless: true, args: expect.arrayContaining(["--host-resolver-rules=MAP mp.weixin.qq.com 93.184.216.34,EXCLUDE localhost"]) }));
    expect(context.close).toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled();
  });
});
