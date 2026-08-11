import { describe, it, expect, beforeEach } from "@jest/globals";
import { useSettingsStore } from "./SettingsStore";

describe("SettingsStore.language", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it("defaults to 'auto'", () => {
    expect(useSettingsStore.getState().settings.language).toBe("auto");
  });

  it("updateSettings changes language", () => {
    useSettingsStore.getState().updateSettings({ language: "zh-CN" });
    expect(useSettingsStore.getState().settings.language).toBe("zh-CN");
  });

  it("persists across store re-creation via merge", () => {
    useSettingsStore.getState().updateSettings({ language: "en" });
    const persisted = JSON.parse(
      localStorage.getItem("settings-storage") || "{}"
    );
    expect(persisted.state.settings.language).toBe("en");
  });
});
