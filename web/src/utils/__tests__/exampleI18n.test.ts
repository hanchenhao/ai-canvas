import i18n from "i18next";
import { translateExample, translateExampleDescription } from "../exampleI18n";

describe("translateExample", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates a known example name to Chinese under zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateExample("AI Spokesperson")).toBe("AI 数字人口播");
  });

  it("falls back to the original name when no translation exists", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateExample("No Such Example")).toBe("No Such Example");
  });

  it("returns the original name under en", async () => {
    await i18n.changeLanguage("en");
    expect(translateExample("AI Spokesperson")).toBe("AI Spokesperson");
  });

  it("resolves category labelKeys to Chinese under zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    const { TOP_CATEGORIES } = await import("../templateCategories");
    const labels = TOP_CATEGORIES.map((c) => i18n.t(c.labelKey));
    expect(labels).toContain("图像");
    expect(labels).toContain("视频");
    expect(labels).toContain("智能体");
  });
});

describe("translateExampleDescription", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates a known example description to Chinese under zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    const zh = translateExampleDescription(
      "AI Spokesperson",
      "Speak an image into existence: no keyboard needed."
    );
    expect(zh).not.toBe("Speak an image into existence: no keyboard needed.");
    expect(zh).toBeTruthy();
  });

  it("falls back to the original description when no translation exists", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(
      translateExampleDescription("No Such Example", "Some description.")
    ).toBe("Some description.");
  });

  it("returns the English description under en", async () => {
    await i18n.changeLanguage("en");
    // The en entries mirror the shipped descriptions, so lookup resolves to
    // the original English text.
    const result = translateExampleDescription(
      "AI Spokesperson",
      "fallback text"
    );
    expect(result).toMatch(/^Give a presenter clip a new script/);
  });

  it("passes through an empty description", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateExampleDescription("AI Spokesperson", "")).toBe("");
  });
});
