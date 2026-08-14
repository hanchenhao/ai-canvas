import React, { useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import isEqual from "../../utils/isEqual";
import TransformersJsModelMenuDialog from "../model_menu/TransformersJsModelMenuDialog";
import useModelPreferencesStore from "../../stores/ModelPreferencesStore";
import type {
  ImageModel,
  HuggingFaceModelValue,
  HuggingFaceModelValueInput
} from "../../stores/ApiTypes";
import { useTransformersJsModelsByType } from "../../hooks/useModelsByProvider";
import ModelSelectButton from "./shared/ModelSelectButton";

interface TransformersJsModelSelectProps {
  modelType: string;
  onChange: (value: HuggingFaceModelValue) => void;
  value: HuggingFaceModelValueInput;
}

const TransformersJsModelSelect: React.FC<TransformersJsModelSelectProps> = ({
  modelType,
  onChange,
  value
}) => {
  const { t } = useTranslation("properties");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addRecent = useModelPreferencesStore((s) => s.addRecent);

  const { models } = useTransformersJsModelsByType({ modelType });

  const currentSelectedModelDetails = useMemo(() => {
    if (!models || !value) return null;
    const searchId = value?.repo_id || value?.id;
    if (!searchId) return null;
    return models.find((m) => (m.id || "") === searchId);
  }, [models, value]);

  const displayInfo = useMemo(() => {
    if (currentSelectedModelDetails) {
      return {
        repoId: currentSelectedModelDetails.id || "",
        path: currentSelectedModelDetails.path || undefined
      };
    }
    if (value?.repo_id || value?.id) {
      return {
        repoId: value.repo_id || value.id || "",
        path: value?.path || undefined
      };
    }
    return {
      repoId: t("properties:modelSelect.selectTransformersJsModel"),
      path: undefined
    };
  }, [currentSelectedModelDetails, value, t]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleDialogModelSelect = useCallback(
    (model: ImageModel) => {
      const repoId = model.id || "";
      onChange({
        type: modelType,
        repo_id: repoId,
        path: model.path || null
      });
      addRecent({
        provider: "transformers_js",
        id: repoId,
        name: model.name || repoId
      });
      setAnchorEl(null);
    },
    [onChange, addRecent, modelType]
  );

  return (
    <>
      <ModelSelectButton
        ref={buttonRef}
        active={!!(value?.repo_id || value?.id)}
        label={displayInfo.repoId}
        secondaryLabel={displayInfo.path}
        subLabel={t("properties:modelSelect.selectTransformersJsModel")}
        onClick={handleClick}
      />
      <TransformersJsModelMenuDialog
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        onModelChange={handleDialogModelSelect}
        modelType={modelType}
      />
    </>
  );
};

export default React.memo(TransformersJsModelSelect, isEqual);
