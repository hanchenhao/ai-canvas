import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Text, FlexRow, EditorButton } from "../ui_primitives";
import useModelPreferencesStore from "../../stores/ModelPreferencesStore";
import LanguageModelSelect from "../properties/LanguageModelSelect";
import ImageModelSelect from "../properties/ImageModelSelect";
import EmbeddingModelSelect from "../properties/EmbeddingModelSelect";
import TTSModelSelect from "../properties/TTSModelSelect";
import ASRModelSelect from "../properties/ASRModelSelect";
import VideoModelSelect from "../properties/VideoModelSelect";
import { CODE_MODEL_PREFERENCE } from "../../hooks/useCodeAuthoringModel";

const MODEL_TYPE_CONFIG = [
  {
    type: "language_model",
    labelKey: "defaultModels.language",
    Select: LanguageModelSelect
  },
  {
    type: "image_model",
    labelKey: "defaultModels.image",
    Select: ImageModelSelect
  },
  {
    type: "embedding_model",
    labelKey: "defaultModels.embedding",
    Select: EmbeddingModelSelect
  },
  {
    type: "tts_model",
    labelKey: "defaultModels.tts",
    Select: TTSModelSelect
  },
  {
    type: "asr_model",
    labelKey: "defaultModels.asr",
    Select: ASRModelSelect
  },
  {
    type: "video_model",
    labelKey: "defaultModels.video",
    Select: VideoModelSelect
  },
  {
    type: CODE_MODEL_PREFERENCE,
    labelKey: "defaultModels.code",
    Select: LanguageModelSelect,
    // The submission is a tool call, so non-tool-capable models are hidden.
    placeholderKey: "defaultModels.codePlaceholder",
    requireToolSupport: true,
    hintKey: "defaultModels.codeHint"
  }
] as const;

function DefaultModelsMenu() {
  const defaults = useModelPreferencesStore((s) => s.defaults);
  const setDefault = useModelPreferencesStore((s) => s.setDefault);
  const clearDefault = useModelPreferencesStore((s) => s.clearDefault);
  const { t } = useTranslation("models");

  return (
    <div>
      <Text size="big" id="default-models" className="settings-heading">
        {t("defaultModels.title")}
      </Text>
      <Text className="description" sx={{ mb: 2 }}>
        {t("defaultModels.description")}
      </Text>

      <div className="default-models-list">
        {MODEL_TYPE_CONFIG.map((config) => (
          <DefaultModelRow
            key={config.type}
            modelType={config.type}
            label={t(config.labelKey)}
            Select={config.Select}
            selectProps={
              "placeholderKey" in config && config.placeholderKey
                ? {
                    placeholder: t(config.placeholderKey),
                    requireToolSupport:
                      "requireToolSupport" in config
                        ? config.requireToolSupport
                        : undefined
                  }
                : undefined
            }
            hint={"hintKey" in config && config.hintKey ? t(config.hintKey) : undefined}
            current={defaults[config.type]}
            onSelect={setDefault}
            onClear={clearDefault}
          />
        ))}
      </div>
    </div>
  );
}

interface ModelSelectExtraProps {
  placeholder?: string;
  requireToolSupport?: boolean;
}

interface DefaultModelRowProps {
  modelType: string;
  label: string;
  Select: React.ComponentType<
    {
      onChange: (value: unknown) => void;
      value: string;
    } & ModelSelectExtraProps
  >;
  selectProps?: ModelSelectExtraProps;
  hint?: string;
  current?: { provider: string; id: string; name: string };
  onSelect: (
    modelType: string,
    model: { provider: string; id: string; name: string }
  ) => void;
  onClear: (modelType: string) => void;
}

function DefaultModelRow({
  modelType,
  label,
  Select,
  selectProps,
  hint,
  current,
  onSelect,
  onClear
}: DefaultModelRowProps) {
  const { t } = useTranslation("models");
  const handleChange = useCallback(
    (value: unknown) => {
      const v = value as { provider?: string; id?: string; name?: string };
      if (v?.id) {
        onSelect(modelType, {
          provider: v.provider || "",
          id: v.id,
          name: v.name || ""
        });
      }
    },
    [modelType, onSelect]
  );

  const handleClear = useCallback(() => {
    onClear(modelType);
  }, [modelType, onClear]);

  return (
    <div className="default-model-row" id={`default-model-${modelType}`}>
      <div>
        <Text weight={600}>{label}</Text>
        {hint && <Text className="description">{hint}</Text>}
      </div>
      <FlexRow align="center" gap={1}>
        <Select
          onChange={handleChange}
          value={current?.id || ""}
          {...selectProps}
        />
        {current && (
          <EditorButton size="small" onClick={handleClear}>
            {t("defaultModels.clear")}
          </EditorButton>
        )}
      </FlexRow>
    </div>
  );
}

export default React.memo(DefaultModelsMenu);
