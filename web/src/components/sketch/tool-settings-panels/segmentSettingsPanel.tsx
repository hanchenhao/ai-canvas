import React, { memo, useEffect } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { SketchModeToggle, SketchModeOption } from "./SketchModeToggle";
import {
  SegmentationStatus,
  SegmentPromptMode,
  SegmentSettings,
  SegmentSourceLayerAction,
  SegmentBackend
} from "../types";
import type { SamModelInfo } from "../sam";
import {
  FAL_SAM_CAPABILITIES,
  LOCAL_SAM3_CAPABILITIES,
  LOCAL_SAM3_MODEL_ID
} from "../sam";
import {
  FlexRow,
  TextInput,
  Box,
  Text,
  SPACING,
  getSpacingPx,
  FormControlLabel,
  Slider,
  Switch
} from "../../ui_primitives";
import { EditorButton } from "../../editor_ui";
import {
  sketchButtonSmallSx,
  sketchSliderSx,
  SKETCH_COLORS,
  SKETCH_FONT
} from "../sketchStyles";
import { useModelDownloadStore } from "../../../stores/ModelDownloadStore";
import { useSketchStore } from "../state";
import { getLayerDataImageUrl } from "../serialization";
import {
  IN_PROGRESS_DOWNLOAD_STATES,
  LOCAL_SAM3_NODE_PACK_HINT
} from "./shared";

function promptModeHelpText(t: TFunction, mode: SegmentPromptMode): string {
  if (mode === "point") {
    return t("sketch:segmentPanel.promptModePointHint");
  }
  if (mode === "box") {
    return t("sketch:segmentPanel.promptModeBoxHint");
  }
  return t("sketch:segmentPanel.promptModeAutoHint");
}

function getSegmentationStatusMessage(t: TFunction, status: SegmentationStatus): string {
  switch (status) {
    case "checking-model":
      return t("sketch:segmentPanel.statusCheckingModel");
    case "encoding":
      return t("sketch:segmentPanel.statusEncoding");
    case "inferring":
      return t("sketch:segmentPanel.statusInferring");
    default:
      return t("sketch:segmentPanel.statusProcessing");
  }
}

function getSegmentModelStatusText(
  t: TFunction,
  isLocalSam3: boolean,
  localSam3Downloading: boolean | undefined,
  localSam3Ready: boolean,
  modelInfo: SamModelInfo | null
): string | undefined {
  if (isLocalSam3 && localSam3Downloading) {
    return t("sketch:segmentPanel.localSam3Downloading");
  }
  if (localSam3Ready) {
    return t("sketch:segmentPanel.localSam3Ready");
  }
  return modelInfo?.errorMessage;
}

interface SegmentSettingsPanelProps {
  settings: SegmentSettings;
  onChange: (settings: Partial<SegmentSettings>) => void;
  segmentationStatus: SegmentationStatus;
  modelInfo: SamModelInfo | null;
  onRunSegmentation: () => void;
  onApplyResult: () => void;
  onDiscardResult: () => void;
  onCancelSegmentation: () => void;
  onClearPrompts: () => void;
  onCheckModel: () => void;
}

export const SegmentSettingsPanel = memo(function SegmentSettingsPanel({
  settings,
  onChange,
  segmentationStatus,
  modelInfo,
  onRunSegmentation,
  onApplyResult,
  onDiscardResult,
  onCancelSegmentation,
  onClearPrompts,
  onCheckModel
}: SegmentSettingsPanelProps) {
  const { t } = useTranslation(["sketch"]);
  const isRunning =
    segmentationStatus === "inferring" ||
    segmentationStatus === "encoding" ||
    segmentationStatus === "checking-model";
  const isPreviewing = segmentationStatus === "previewing";
  const localSam3Download = useModelDownloadStore(
    (state) => state.downloads[LOCAL_SAM3_MODEL_ID]
  );
  const localSam3DownloadStatus = localSam3Download?.status;
  const startDownload = useModelDownloadStore((state) => state.startDownload);
  const cancelDownload = useModelDownloadStore((state) => state.cancelDownload);
  const canSplitSelectedLayer = useSketchStore((state) => {
    const selectedLayerIds =
      state.selectedLayerIds.length > 0
        ? state.selectedLayerIds
        : [state.document.activeLayerId];
    if (selectedLayerIds.length !== 1) {
      return false;
    }
    const selectedLayer = state.document.layers.find(
      (layer) => layer.id === selectedLayerIds[0]
    );
    return (
      selectedLayer?.type === "raster" &&
      !!getLayerDataImageUrl(selectedLayer.data)
    );
  });
  const isLocalSam3 = settings.backend === "local-sam3";
  const localSam3Downloading =
    localSam3DownloadStatus !== undefined &&
    IN_PROGRESS_DOWNLOAD_STATES.includes(localSam3DownloadStatus);
  const localSam3Ready = isLocalSam3 && modelInfo?.status === "available";
  const backendCapabilities =
    modelInfo?.capabilities ??
    (isLocalSam3
      ? LOCAL_SAM3_CAPABILITIES
      : {
          ...FAL_SAM_CAPABILITIES,
          textPrompts: false,
          pointPrompts: false,
          boxPrompts: false
        });
  const supportsPointPrompts = Boolean(backendCapabilities.pointPrompts);
  const supportsBoxPrompts = Boolean(backendCapabilities.boxPrompts);
  const supportsTextPrompts = Boolean(backendCapabilities.textPrompts);
  const backendReady = modelInfo?.status === "available";
  const canRunSegmentation =
    backendReady &&
    (settings.promptMode === "auto" ? canSplitSelectedLayer : true);
  const canDownloadLocalSam3 =
    isLocalSam3 &&
    !!modelInfo &&
    modelInfo.status === "not-installed" &&
    modelInfo.errorMessage !== LOCAL_SAM3_NODE_PACK_HINT &&
    localSam3DownloadStatus !== "completed" &&
    !localSam3Downloading;
  const visiblePromptModes: SegmentPromptMode[] = [
    ...(supportsPointPrompts ? ["point" as const] : []),
    ...(supportsBoxPrompts ? ["box" as const] : []),
    "auto"
  ];
  const isCurrentPromptModeVisible =
    settings.promptMode === "auto" ||
    (settings.promptMode === "point" && supportsPointPrompts) ||
    (settings.promptMode === "box" && supportsBoxPrompts);
  const segmentActionLabel =
    settings.promptMode === "auto" ? t("sketch:segmentPanel.splitSelectedLayer") : t("sketch:segmentPanel.segment");
  const showClearPrompts = settings.promptMode !== "auto";
  const backendLabel =
    modelInfo?.backendLabel ?? (isLocalSam3 ? "Local SAM3" : t("sketch:segmentPanel.backend"));
  const modelStatusText = getSegmentModelStatusText(
    t,
    isLocalSam3,
    localSam3Downloading,
    localSam3Ready,
    modelInfo
  );

  useEffect(() => {
    if (isCurrentPromptModeVisible) {
      return;
    }
    onChange({ promptMode: "auto" });
  }, [isCurrentPromptModeVisible, onChange, settings.promptMode]);

  useEffect(() => {
    if (!isLocalSam3) {
      return;
    }
    if (
      localSam3DownloadStatus === "completed" ||
      localSam3DownloadStatus === "cancelled" ||
      localSam3DownloadStatus === "error"
    ) {
      onCheckModel();
    }
  }, [isLocalSam3, localSam3DownloadStatus, onCheckModel]);

  return (
    <>
      <Box className="setting-row" sx={{ gap: getSpacingPx(SPACING.xs) }}>
        <Text className="setting-label">{t("sketch:segmentPanel.backend")}</Text>
        <SketchModeToggle
          value={settings.backend}
          onChange={(_, v) => {
            if (v) {
              onChange({
                backend: v as SegmentBackend,
                // Default Local SAM3 to auto mode; prompted modes appear
                // only when installed node metadata confirms them.
                ...(v === "local-sam3" ? { promptMode: "auto" as const } : {})
              });
              onCheckModel();
            }
          }}
        >
          <SketchModeOption value="fal">fal.ai</SketchModeOption>
          <SketchModeOption value="local-sam3">Local SAM3</SketchModeOption>
        </SketchModeToggle>
      </Box>

      {modelInfo && (
        <Box sx={{ mb: getSpacingPx(SPACING.xs) }}>
          <Text
            sx={{
              fontSize: SKETCH_FONT.xs,
              lineHeight: 1.3,
              color:
                modelInfo.status === "available"
                  ? "success.main"
                  : modelInfo.status === "error" ||
                      modelInfo.status === "not-installed"
                    ? "warning.main"
                    : SKETCH_COLORS.textFaint
            }}
          >
            {modelInfo.status === "available" &&
              (modelStatusText ?? t("sketch:segmentPanel.modelReadyPrefix", { modelName: modelInfo.modelName }))}
            {modelInfo.status === "not-installed" &&
              (modelStatusText ?? t("sketch:segmentPanel.modelNotAvailable"))}
            {modelInfo.status === "error" &&
              (modelStatusText ?? t("sketch:segmentPanel.connectionFailed"))}
            {modelInfo.status === "checking" && t("sketch:segmentPanel.checking")}
            {modelInfo.status === "downloading" &&
              t("sketch:segmentPanel.downloadProgress", {
                status: modelStatusText ?? t("sketch:segmentPanel.downloading"),
                percent: Math.round((modelInfo.downloadProgress ?? 0) * 100)
              })}
          </Text>
        </Box>
      )}

      <SketchModeToggle
        value={settings.promptMode}
        onChange={(_, v) => {
          if (v) {
            onChange({ promptMode: v as SegmentPromptMode });
          }
        }}
        sx={{ mb: getSpacingPx(SPACING.xs) }}
      >
        {visiblePromptModes.includes("point") && (
          <SketchModeOption value="point">{t("sketch:segmentPanel.pointPromptMode")}</SketchModeOption>
        )}
        {visiblePromptModes.includes("box") && (
          <SketchModeOption value="box">{t("sketch:segmentPanel.boxPromptMode")}</SketchModeOption>
        )}
        <SketchModeOption value="auto">{t("sketch:segmentPanel.autoPromptMode")}</SketchModeOption>
      </SketchModeToggle>

      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:segmentPanel.maxObjects")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={1}
          max={20}
          value={settings.maxObjects}
          onChange={(_, v) => onChange({ maxObjects: v as number })}
        />
        <Text className="setting-value">{settings.maxObjects}</Text>
      </Box>

      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:segmentPanel.confidence")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={0}
          max={1}
          step={0.05}
          value={settings.confidenceThreshold}
          onChange={(_, v) => onChange({ confidenceThreshold: v as number })}
        />
        <Text className="setting-value">
          {settings.confidenceThreshold.toFixed(2)}
        </Text>
      </Box>

      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:segmentPanel.minSize")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={0}
          max={10000}
          step={100}
          value={settings.minObjectSize}
          onChange={(_, v) => onChange({ minObjectSize: v as number })}
        />
        <Text className="setting-value">
          {settings.minObjectSize}
        </Text>
      </Box>

      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:segmentPanel.feather")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={0}
          max={20}
          step={1}
          value={settings.maskFeather}
          onChange={(_, v) => onChange({ maskFeather: v as number })}
        />
        <Text className="setting-value">
          {settings.maskFeather}
        </Text>
      </Box>

      <Box className="setting-row" sx={{ gap: getSpacingPx(SPACING.xs) }}>
        <Text className="setting-label">{t("sketch:segmentPanel.sourceLayer")}</Text>
        <SketchModeToggle
          value={settings.sourceLayerAction}
          onChange={(_, v) => {
            if (v) {
              onChange({ sourceLayerAction: v as SegmentSourceLayerAction });
            }
          }}
        >
          <SketchModeOption value="keep">{t("sketch:segmentPanel.sourceKeep")}</SketchModeOption>
          <SketchModeOption value="hide">{t("sketch:segmentPanel.sourceHide")}</SketchModeOption>
          <SketchModeOption value="lock">{t("sketch:segmentPanel.sourceLock")}</SketchModeOption>
        </SketchModeToggle>
      </Box>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={settings.outputCutouts}
            onChange={(e) => onChange({ outputCutouts: e.target.checked })}
          />
        }
        label={
          <Text sx={{ fontSize: SKETCH_FONT.xs }}>
            {settings.outputCutouts ? t("sketch:segmentPanel.outputCutoutLayers") : t("sketch:segmentPanel.outputMaskLayers")}
          </Text>
        }
        sx={{ mt: getSpacingPx(SPACING.micro), ml: 0 }}
      />

      {supportsTextPrompts && (
        <Box className="setting-row" sx={{ alignItems: "flex-start" }}>
          <Text className="setting-label" sx={{ pt: getSpacingPx(SPACING.sm) }}>
            {t("sketch:segmentPanel.concept")}
          </Text>
          <TextInput
            compact
            value={settings.conceptPrompt}
            onChange={(event) =>
              onChange({ conceptPrompt: event.target.value })
            }
            placeholder={t("sketch:segmentPanel.conceptPlaceholder")}
            fullWidth
            inputProps={{ "aria-label": t("sketch:segmentPanel.conceptPromptAria") }}
            sx={{
              flex: 1,
              "& .MuiInputBase-root": {
                fontSize: SKETCH_FONT.xs
              }
            }}
          />
        </Box>
      )}

      {isLocalSam3 && (
        <>
          <Box className="setting-row">
            <Text className="setting-label">{t("sketch:segmentPanel.pointsPerSide")}</Text>
            <Slider
              sx={sketchSliderSx}
              size="small"
              min={4}
              max={128}
              step={4}
              value={settings.pointsPerSide}
              onChange={(_, value) =>
                onChange({ pointsPerSide: value as number })
              }
            />
            <Text className="setting-value">
              {settings.pointsPerSide}
            </Text>
          </Box>

          <Box className="setting-row">
            <Text className="setting-label">{t("sketch:segmentPanel.predIou")}</Text>
            <Slider
              sx={sketchSliderSx}
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={settings.predIouThresh}
              onChange={(_, value) =>
                onChange({ predIouThresh: value as number })
              }
            />
            <Text className="setting-value">
              {settings.predIouThresh.toFixed(2)}
            </Text>
          </Box>
        </>
      )}

      <FlexRow wrap gap={0.5} sx={{ mt: getSpacingPx(SPACING.xs) }}>
        {!isRunning && !isPreviewing && (
          <>
            {canDownloadLocalSam3 && (
              <EditorButton
                size="small"
                variant="outlined"
                onClick={() => {
                  startDownload(LOCAL_SAM3_MODEL_ID, "hf.model");
                }}
                sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
              >
                {t("sketch:segmentPanel.downloadLocalSam3")}
              </EditorButton>
            )}
            {isLocalSam3 && localSam3Downloading && (
              <EditorButton
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => {
                  cancelDownload(LOCAL_SAM3_MODEL_ID);
                }}
                sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
              >
                {t("sketch:segmentPanel.cancelDownload")}
              </EditorButton>
            )}
            <EditorButton
              size="small"
              variant="contained"
              onClick={onRunSegmentation}
              disabled={!canRunSegmentation}
              sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
            >
              {segmentActionLabel}
            </EditorButton>
            {showClearPrompts && (
              <EditorButton
                size="small"
                variant="outlined"
                onClick={onClearPrompts}
                sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
              >
                {t("sketch:segmentPanel.clear")}
              </EditorButton>
            )}
          </>
        )}
        {isRunning && (
          <>
            <Text
              sx={{
                fontSize: SKETCH_FONT.xs,
                color: "info.main",
                lineHeight: 1.3,
                mr: 0.5,
                display: "flex",
                alignItems: "center"
              }}
            >
              {getSegmentationStatusMessage(t, segmentationStatus)}
            </Text>
            <EditorButton
              size="small"
              variant="outlined"
              color="warning"
              onClick={onCancelSegmentation}
              sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
            >
              {t("sketch:adjustPanel.cancel")}
            </EditorButton>
          </>
        )}
        {isPreviewing && (
          <>
            <EditorButton
              size="small"
              variant="contained"
              color="success"
              onClick={onApplyResult}
              sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
            >
              {t("sketch:adjustPanel.apply")}
            </EditorButton>
            <EditorButton
              size="small"
              variant="outlined"
              onClick={onDiscardResult}
              sx={{ ...sketchButtonSmallSx, minWidth: "56px" }}
            >
              {t("sketch:segmentPanel.discard")}
            </EditorButton>
          </>
        )}
      </FlexRow>

      <Text
        sx={{
          fontSize: SKETCH_FONT.xs,
          color: SKETCH_COLORS.textFaint,
          lineHeight: 1.3,
          maxWidth: 320,
          mt: getSpacingPx(SPACING.xs)
        }}
      >
        {supportsPointPrompts || supportsBoxPrompts || supportsTextPrompts
          ? promptModeHelpText(t, settings.promptMode)
          : t("sketch:segmentPanel.backendAutoOnlyNotice", { backendLabel })}
      </Text>

      {settings.promptMode === "auto" && !canSplitSelectedLayer && (
        <Text
          sx={{
            fontSize: SKETCH_FONT.xs,
            color: SKETCH_COLORS.textFaint,
            lineHeight: 1.3,
            mt: getSpacingPx(SPACING.micro)
          }}
        >
          {t("sketch:segmentPanel.selectOneRasterLayer")}
        </Text>
      )}

      {segmentationStatus === "error" && (
        <Text
          sx={{
            fontSize: SKETCH_FONT.xs,
            color: "error.main",
            lineHeight: 1.3,
            mt: getSpacingPx(SPACING.micro)
          }}
        >
          {t("sketch:segmentPanel.segmentationFailed")}
        </Text>
      )}
    </>
  );
});
