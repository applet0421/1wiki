import { describe, expect, it } from "vitest";
import { parseYouTubeUrl, buildYouTubeEmbed } from "./youtube";

describe("YouTube embeds", () => {
  it("normalizes watch and short URLs to a no-cookie embed", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=abc_123")).toBe("abc_123");
    expect(parseYouTubeUrl("https://youtu.be/abc_123?t=20")).toBe("abc_123");
    expect(buildYouTubeEmbed("abc_123", "教學影片")).toContain('src="https://www.youtube-nocookie.com/embed/abc_123"');
  });

  it("rejects non-YouTube URLs and invalid IDs", () => {
    expect(parseYouTubeUrl("https://example.com/watch?v=abc_123")).toBeNull();
    expect(parseYouTubeUrl("https://youtube.com/watch?v=bad id")).toBeNull();
  });
});
