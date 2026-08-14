import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleOption } from "../../ui_primitives";
import type { ModelSource } from "../../../stores/ModelManagerStore";

interface SourceToggleProps {
  source: ModelSource;
  onChange: (source: ModelSource) => void;
}

/**
 * Catalog source toggle for the ModelManager. "Get Started" is the guided,
 * hardware-aware onboarding; "Installed" lists models on disk (or the attached
 * worker); "Recommended" lists the curated catalog aggregated from installed
 * nodes; "Hub" searches the live HuggingFace Hub. The last three are browsable
 * for download.
 */
const SourceToggleInternal: React.FC<SourceToggleProps> = ({
  source,
  onChange
}) => {
  const { t } = useTranslation("huggingface");
  const handleChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, value: ModelSource | null) => {
      if (value) {
        onChange(value);
      }
    },
    [onChange]
  );

  return (
    <ToggleGroup
      value={source}
      exclusive
      segmented
      onChange={handleChange}
      aria-label={t("huggingface:aria.modelSource")}
    >
      <ToggleOption value="onboarding" aria-label={t("huggingface:aria.getStarted")}>
        {t("huggingface:modelList.getStartedTab")}
      </ToggleOption>
      <ToggleOption value="installed" aria-label={t("huggingface:aria.installedModels")}>
        Installed
      </ToggleOption>
      <ToggleOption value="recommended" aria-label={t("huggingface:aria.recommendedModels")}>
        Recommended
      </ToggleOption>
      <ToggleOption value="hub" aria-label={t("huggingface:aria.searchHub")}>
        Hub
      </ToggleOption>
    </ToggleGroup>
  );
};

export const SourceToggle = React.memo(SourceToggleInternal);
SourceToggle.displayName = "SourceToggle";
