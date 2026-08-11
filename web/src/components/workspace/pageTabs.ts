// App "pages" that open as workspace tabs (type: "page") instead of their own
// route. The title is looked up here so the tab bar and the logo menu stay in
// sync.
//
// The titles are i18n keys (under the `common:page.*` namespace). Callers must
// resolve them through `useTranslation` rather than using the raw string.
export type PageTabKey =
  | "assets"
  | "tutorials"
  | "examples"
  | "costs"
  | "models"
  | "packages"
  | "collections"
  | "workspaces"
  | "entities"
  | "settings";

export const PAGE_TAB_TITLES: Record<PageTabKey, string> = {
  assets: "common:page.assets",
  tutorials: "common:page.tutorials",
  examples: "common:page.examples",
  costs: "common:page.costs",
  models: "common:page.models",
  packages: "common:page.packages",
  collections: "common:page.collections",
  workspaces: "common:page.workspaces",
  entities: "common:page.entities",
  settings: "common:page.settings"
};

export const isPageTabKey = (value: string): value is PageTabKey =>
  Object.prototype.hasOwnProperty.call(PAGE_TAB_TITLES, value);
