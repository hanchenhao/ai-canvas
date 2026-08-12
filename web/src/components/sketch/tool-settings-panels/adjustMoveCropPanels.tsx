import React, { memo } from "react";
import { useTranslation } from "react-i18next";

import {
  FlexRow,
  Box,
  Text,
  Tooltip,
  EditorButton,
  ToolbarIconButton,
  SPACING,
  getSpacingPx,
  Checkbox,
  FormControlLabel,
  Slider
} from "../../ui_primitives";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  sketchSliderSx,
  sketchButtonSmallSx,
  sketchHintTextSx,
  SKETCH_FONT,
  SKETCH_COLORS
} from "../sketchStyles";
import { SketchModeToggle, SketchModeOption } from "./SketchModeToggle";
import { TransformMode } from "../types";
import { getToolbarTransformModes } from "../transform/modes";

interface AdjustmentsSettingsPanelProps {
  brightness: number;
  contrast: number;
  saturation: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onApply: () => void;
  onCancel: () => void;
}

export const AdjustmentsSettingsPanel = memo(function AdjustmentsSettingsPanel({
  brightness,
  contrast,
  saturation,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onApply,
  onCancel
}: AdjustmentsSettingsPanelProps) {
  const { t } = useTranslation(["sketch"]);
  const hasChanges = brightness !== 0 || contrast !== 0 || saturation !== 0;
  return (
    <>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:adjustPanel.brightness")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={-100}
          max={100}
          value={brightness}
          onChange={(_, v) => onBrightnessChange(v as number)}
        />
        <Text className="setting-value">{brightness}</Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:adjustPanel.contrast")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={-100}
          max={100}
          value={contrast}
          onChange={(_, v) => onContrastChange(v as number)}
        />
        <Text className="setting-value">{contrast}</Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:adjustPanel.saturation")}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={-100}
          max={100}
          value={saturation}
          onChange={(_, v) => onSaturationChange(v as number)}
        />
        <Text className="setting-value">{saturation}</Text>
      </Box>
      <FlexRow gap={0.5}>
        <EditorButton
          size="small"
          variant="outlined"
          color="primary"
          disabled={!hasChanges}
          onClick={onApply}
          sx={{ ...sketchButtonSmallSx, flex: 1 }}
        >
          {t("sketch:adjustPanel.apply")}
        </EditorButton>
        <EditorButton
          size="small"
          variant="outlined"
          disabled={!hasChanges}
          onClick={onCancel}
          sx={{ ...sketchButtonSmallSx, flex: 1 }}
        >
          {t("sketch:adjustPanel.cancel")}
        </EditorButton>
      </FlexRow>
    </>
  );
});

interface MoveSettingsPanelProps {
  autoSelect: boolean;
  onAutoSelectChange: (enabled: boolean) => void;
}

export const MoveSettingsPanel = memo(function MoveSettingsPanel({
  autoSelect,
  onAutoSelectChange
}: MoveSettingsPanelProps) {
  const { t } = useTranslation(["sketch"]);
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={autoSelect}
          onChange={(e) => onAutoSelectChange(e.target.checked)}
          size="small"
          sx={{ padding: `${getSpacingPx(SPACING.micro)} ${getSpacingPx(SPACING.xs)}` }}
        />
      }
      label={
        <Text
          sx={{ ...SKETCH_FONT, fontSize: "var(--fontSizeSmall)", userSelect: "none" }}
        >
          {t("sketch:movePanel.autoSelect")}
        </Text>
      }
      sx={{ mr: 2, ml: 0 }}
    />
  );
});

interface TransformSettingsPanelProps {
  scaleX: number;
  scaleY: number;
  rotation: number;
  autoSelect: boolean;
  mode: TransformMode;
  onAutoSelectChange: (enabled: boolean) => void;
  onModeChange: (mode: TransformMode) => void;
  onCommit: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export const TransformSettingsPanel = memo(function TransformSettingsPanel({
  scaleX,
  scaleY,
  rotation,
  autoSelect,
  mode,
  onAutoSelectChange,
  onModeChange,
  onCommit,
  onCancel,
  onReset
}: TransformSettingsPanelProps) {
  const { t } = useTranslation(["sketch"]);
  const rotDeg = Math.round(((rotation * 180) / Math.PI) * 10) / 10;
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={autoSelect}
            onChange={(e) => onAutoSelectChange(e.target.checked)}
            size="small"
            sx={{ padding: `${getSpacingPx(SPACING.micro)} ${getSpacingPx(SPACING.xs)}` }}
          />
        }
        label={
          <Text
            sx={{ ...SKETCH_FONT, fontSize: "var(--fontSizeSmall)", userSelect: "none" }}
          >
            {t("sketch:movePanel.autoSelect")}
          </Text>
        }
        sx={{ mr: 2, ml: 0 }}
      />
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:transformPanel.mode")}</Text>
        <SketchModeToggle
          value={mode}
          onChange={(_, nextMode: TransformMode | null) => {
            if (nextMode) {
              onModeChange(nextMode);
            }
          }}
        >
          {getToolbarTransformModes().map((modeHandler) => {
            const button = (
              <SketchModeOption key={modeHandler.id} value={modeHandler.id}>
                {modeHandler.label}
              </SketchModeOption>
            );
            return modeHandler.tooltip ? (
              <Tooltip key={modeHandler.id} title={modeHandler.tooltip}>
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </SketchModeToggle>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:transformPanel.scaleX")}</Text>
        <Text className="setting-value">
          {(scaleX * 100).toFixed(0)}%
        </Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:transformPanel.scaleY")}</Text>
        <Text className="setting-value">
          {(scaleY * 100).toFixed(0)}%
        </Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:transformPanel.rotation")}</Text>
        <Text className="setting-value">{rotDeg}°</Text>
      </Box>
      <FlexRow sx={{ gap: getSpacingPx(SPACING.micro), ml: 1 }}>
        <ToolbarIconButton
          icon={<CheckIcon sx={{ fontSize: 18 }} />}
          tooltip={t("sketch:transformPanel.commitTooltip")}
          tooltipPlacement="bottom"
          onClick={onCommit}
          sx={{ padding: 1, color: "success.main" }}
        />
        <ToolbarIconButton
          icon={<CloseIcon sx={{ fontSize: 18 }} />}
          tooltip={t("sketch:transformPanel.cancelTooltip")}
          tooltipPlacement="bottom"
          onClick={onCancel}
          sx={{ padding: 1, color: "error.main" }}
        />
        <ToolbarIconButton
          icon={<RestartAltIcon sx={{ fontSize: 18 }} />}
          tooltip={t("sketch:transformPanel.resetTooltip")}
          tooltipPlacement="bottom"
          onClick={onReset}
          sx={{ padding: 1, color: SKETCH_COLORS.textSecondary }}
        />
      </FlexRow>
    </>
  );
});

export const NoSettingsMessage = memo(function NoSettingsMessage() {
  const { t } = useTranslation(["sketch"]);
  return (
    <Text sx={{ ...sketchHintTextSx }}>
      {t("sketch:noSettings")}
    </Text>
  );
});

export const CropSettingsPanel = memo(function CropSettingsPanel({
  hasPendingCrop,
  onApply,
  onCancel
}: {
  hasPendingCrop: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(["sketch"]);
  return (
    <>
      <Text sx={{ ...sketchHintTextSx }}>
        {t("sketch:cropPanel.hint")}
      </Text>
      <FlexRow sx={{ gap: getSpacingPx(SPACING.micro), ml: 1 }}>
        <ToolbarIconButton
          icon={<CheckIcon sx={{ fontSize: 18 }} />}
          tooltip={t("sketch:cropPanel.applyTooltip")}
          tooltipPlacement="bottom"
          disabled={!hasPendingCrop}
          onClick={onApply}
          sx={{ padding: 1, color: "success.main" }}
        />
        <ToolbarIconButton
          icon={<CloseIcon sx={{ fontSize: 18 }} />}
          tooltip={t("sketch:cropPanel.cancelTooltip")}
          tooltipPlacement="bottom"
          disabled={!hasPendingCrop}
          onClick={onCancel}
          sx={{ padding: 1, color: "error.main" }}
        />
      </FlexRow>
    </>
  );
});
