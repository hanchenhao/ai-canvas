import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import mockTheme from "../../__mocks__/themeMock";
import i18n from "../../i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useSettingsStore } from "../../stores/SettingsStore";

function withProviders(ui: React.ReactElement) {
  return (
    <ThemeProvider theme={mockTheme}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </ThemeProvider>
  );
}

describe("LanguageSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
    void i18n.changeLanguage("en");
  });

  it("renders the language label", () => {
    render(withProviders(<LanguageSelector />));
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  it("switches the store language to zh-CN when selecting 简体中文", () => {
    render(withProviders(<LanguageSelector />));
    expect(useSettingsStore.getState().settings.language).toBe("auto");

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("简体中文"));

    expect(useSettingsStore.getState().settings.language).toBe("zh-CN");
  });
});
