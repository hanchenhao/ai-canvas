import { memo } from "react";
import { useTranslation } from "react-i18next";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { ImageModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import { useImageModelMenuStore } from "../../stores/ModelMenuStore";
import {
  useImageModelsByProvider,
  type ImageModelTask
} from "../../hooks/useModelsByProvider";

export interface ImageModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: ImageModel) => void;
  task?: ImageModelTask | ImageModelTask[];
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function ImageModelMenuDialog({
  open,
  onClose,
  onModelChange,
  task,
  anchorEl,
  recommendedModels,
  modelPacks
}: ImageModelMenuDialogProps) {
  const modelData = useImageModelsByProvider({ task });
  const { t } = useTranslation("models");
  return (
    <ModelMenuDialogBase<ImageModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("dialog.selectImage")}
      searchPlaceholder={t("dialog.searchImage")}
      storeHook={useImageModelMenuStore}
      modelType="image_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default memo(ImageModelMenuDialog);
