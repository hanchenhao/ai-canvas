import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../locales/en/common.json";
import enSettings from "../locales/en/settings.json";
import enNodes from "../locales/en/nodes.json";
import enErrors from "../locales/en/errors.json";
import enTimeline from "../locales/en/timeline.json";
import enSketch from "../locales/en/sketch.json";
import enStoryboard from "../locales/en/storyboard.json";
import enWorkspace from "../locales/en/workspace.json";
import enTutorials from "../locales/en/tutorials.json";
import enCanvas from "../locales/en/canvas.json";
import zhCommon from "../locales/zh-CN/common.json";
import zhSettings from "../locales/zh-CN/settings.json";
import zhNodes from "../locales/zh-CN/nodes.json";
import zhErrors from "../locales/zh-CN/errors.json";
import zhTimeline from "../locales/zh-CN/timeline.json";
import zhSketch from "../locales/zh-CN/sketch.json";
import zhStoryboard from "../locales/zh-CN/storyboard.json";
import zhWorkspace from "../locales/zh-CN/workspace.json";
import zhTutorials from "../locales/zh-CN/tutorials.json";
import zhCanvas from "../locales/zh-CN/canvas.json";

export const SUPPORTED_LANGUAGES = ["auto", "en", "zh-CN"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE = "en";

void i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        common: enCommon,
        settings: enSettings,
        nodes: enNodes,
        errors: enErrors,
        timeline: enTimeline,
        sketch: enSketch,
        storyboard: enStoryboard,
        workspace: enWorkspace,
        tutorials: enTutorials,
        canvas: enCanvas
      },
      "zh-CN": {
        common: zhCommon,
        settings: zhSettings,
        nodes: zhNodes,
        errors: zhErrors,
        timeline: zhTimeline,
        sketch: zhSketch,
        storyboard: zhStoryboard,
        workspace: zhWorkspace,
        tutorials: zhTutorials,
        canvas: zhCanvas
      }
    },
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18n-lang",
      caches: ["localStorage"]
    }
  });

export default i18n;
