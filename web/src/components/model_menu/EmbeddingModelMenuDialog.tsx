import { memo } from "react";
import { useTranslation } from "react-i18next";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { EmbeddingModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import { useEmbeddingModelsByProvider } from "../../hooks/useEmbeddingModels";
import { useEmbeddingModelMenuStore } from "../../stores/ModelMenuStore";

export interface EmbeddingModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: EmbeddingModel) => void;
  allowedProviders?: string[];
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function EmbeddingModelMenuDialog({
  open,
  onClose,
  onModelChange,
  allowedProviders,
  anchorEl,
  recommendedModels,
  modelPacks
}: EmbeddingModelMenuDialogProps) {
  const modelData = useEmbeddingModelsByProvider({ allowedProviders });
  const { t } = useTranslation("models");
  return (
    <ModelMenuDialogBase<EmbeddingModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("dialog.selectEmbedding")}
      searchPlaceholder={t("dialog.searchEmbedding")}
      storeHook={useEmbeddingModelMenuStore}
      modelType="embedding_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default memo(EmbeddingModelMenuDialog);
