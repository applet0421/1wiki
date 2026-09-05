INSERT INTO "LLMModelPrice" ("id", "provider", "model", "inputUsdPerMillionTokens", "outputUsdPerMillionTokens", "imageOutputUsdPerMillionTokens", "effectiveAt")
VALUES ('price-gemini-flash-lite-image-20260905', 'gemini', 'gemini-3.1-flash-lite-image', 0.25, 1.50, 30, '2026-09-05T00:00:00Z')
ON CONFLICT ("provider", "model", "effectiveAt") DO NOTHING;
