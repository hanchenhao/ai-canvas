import React from "react";
import { useTranslation } from "react-i18next";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { ASRModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import {
  useASRModelMenuStore
} from "../../stores/ModelMenuStore";
import { useASRModelsByProvider } from "../../hooks/useModelsByProvider";

export interface ASRModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: ASRModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function ASRModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: ASRModelMenuDialogProps) {
  const modelData = useASRModelsByProvider();
  const { t } = useTranslation("models");
  return (
    <ModelMenuDialogBase<ASRModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("dialog.selectAsr")}
      searchPlaceholder={t("dialog.searchAsr")}
      storeHook={useASRModelMenuStore}
      modelType="asr_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(ASRModelMenuDialog);
