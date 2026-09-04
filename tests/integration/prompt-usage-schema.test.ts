import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../helpers/database";

describe("Prompt and LLM usage schema", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("installs four active v1 Prompt definitions", async () => {
    const definitions = await prisma.promptDefinition.findMany({
      include: { versions: true },
      orderBy: { key: "asc" },
    });

    expect(definitions.map((item) => item.key)).toEqual([
      "ARTICLE_GENERATE",
      "ARTICLE_REWRITE",
      "IDEA_GENERATE",
      "SOURCE_ANALYZE",
    ]);
    expect(definitions.every((item) => item.activeVersionNumber === 1)).toBe(true);
    expect(definitions.every((item) => item.versions.length === 1)).toBe(true);
  });
});
