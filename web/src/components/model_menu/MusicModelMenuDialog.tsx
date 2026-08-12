import React from "react";
import { useTranslation } from "react-i18next";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { MusicModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import { useMusicModelMenuStore } from "../../stores/ModelMenuStore";
import { useMusicModelsByProvider } from "../../hooks/useModelsByProvider";

export interface MusicModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: MusicModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function MusicModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: MusicModelMenuDialogProps) {
  const modelData = useMusicModelsByProvider();
  const { t } = useTranslation("models");
  return (
    <ModelMenuDialogBase<MusicModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("dialog.selectMusic")}
      searchPlaceholder={t("dialog.searchMusic")}
      storeHook={useMusicModelMenuStore}
      modelType="music_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(MusicModelMenuDialog);
