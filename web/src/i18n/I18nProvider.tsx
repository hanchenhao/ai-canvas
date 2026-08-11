import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./index";
import { useSettingsStore } from "../stores/SettingsStore";
import { FALLBACK_LANGUAGE, type Language } from "./index";

function resolveLanguage(setting: Language): string {
  if (setting !== "auto") return setting;
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    const resolved = resolveLanguage(language);
    if (i18n.language !== resolved) {
      void i18n.changeLanguage(resolved);
    }
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export { FALLBACK_LANGUAGE };
