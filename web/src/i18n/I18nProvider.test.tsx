import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { I18nProvider } from "./I18nProvider";
import { useSettingsStore, defaultSettings } from "../stores/SettingsStore";

function Probe() {
  const { t } = useTranslation();
  return <div>{t("common:button.save")}</div>;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    // Reset settings (and the persisted localStorage cache) so each test
    // starts from a known language.
    useSettingsStore.setState({ settings: { ...defaultSettings } });
    localStorage.removeItem("i18n-lang");
  });

  it("renders English when language is 'en'", () => {
    useSettingsStore.getState().updateSettings({ language: "en" });
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("switches to Chinese when language changes to 'zh-CN'", async () => {
    useSettingsStore.getState().updateSettings({ language: "en" });
    const { rerender } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByText("Save")).toBeInTheDocument();

    act(() => {
      useSettingsStore.getState().updateSettings({ language: "zh-CN" });
    });
    rerender(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(await screen.findByText("保存")).toBeInTheDocument();
  });
});
