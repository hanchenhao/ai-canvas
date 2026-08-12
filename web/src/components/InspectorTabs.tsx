import React from "react";
import { useTranslation } from "react-i18next";

/** The tabs shown at the top of the Inspector panel. */
export type InspectorTab = "params" | "io" | "help";

const TAB_DEFS: { value: InspectorTab; labelKey: string; hasCount: boolean }[] = [
  { value: "params", labelKey: "canvas:inspector.tab.params", hasCount: true },
  { value: "io", labelKey: "canvas:inspector.tab.io", hasCount: true },
  { value: "help", labelKey: "canvas:inspector.tab.help", hasCount: false }
];

export interface InspectorTabsProps {
  active: InspectorTab;
  onChange: (next: InspectorTab) => void;
  counts: Partial<Record<InspectorTab, number>>;
}

/** Presentational tab strip for the Inspector. */
export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  active,
  onChange,
  counts
}) => {
  const { t } = useTranslation(["canvas"]);
  return (
    <div className="inspector-tabs" role="tablist">
      {TAB_DEFS.map((tab) => {
        const count = counts[tab.value];
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`inspector-tab${isActive ? " is-active" : ""}`}
            onClick={() => onChange(tab.value)}
          >
            {t(tab.labelKey)}
            {tab.hasCount && typeof count === "number" ? (
              <span className="tab-count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
