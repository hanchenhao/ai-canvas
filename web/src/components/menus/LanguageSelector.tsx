/**
 * LanguageSelector — General-settings dropdown for the UI display language.
 *
 * Three options: Follow system / 简体中文 / English. Bound to
 * `SettingsStore.settings.language`; `I18nProvider` reacts to that field and
 * drives i18next, so a change here takes effect immediately.
 */
import { useTranslation } from "react-i18next";
import { SelectField } from "../ui_primitives";
import { useSettingsStore } from "../../stores/SettingsStore";
import { SUPPORTED_LANGUAGES, type Language } from "../../i18n";

export function LanguageSelector() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.settings.language);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <SelectField
      label={t("common:language.label")}
      value={language}
      onChange={(value) => updateSettings({ language: value as Language })}
      options={SUPPORTED_LANGUAGES.map((value) => ({
        value,
        label: t(`common:language.${value}`)
      }))}
    />
  );
}
