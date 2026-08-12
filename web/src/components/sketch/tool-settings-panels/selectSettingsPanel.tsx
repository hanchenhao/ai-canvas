import React, { memo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SketchModeToggle, SketchModeOption } from "./SketchModeToggle";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CropIcon from "@mui/icons-material/Crop";
import GestureOutlinedIcon from "@mui/icons-material/GestureOutlined";
import PentagonOutlinedIcon from "@mui/icons-material/PentagonOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RectangleOutlinedIcon from "@mui/icons-material/RectangleOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import OpacityIcon from "@mui/icons-material/Opacity";
import BorderStyleIcon from "@mui/icons-material/BorderStyle";
import {
  iconButtonCompactSx,
  sketchButtonSmallSx,
  sketchSliderSx,
  SKETCH_COLORS
} from "../sketchStyles";
import { SelectSettings, SelectToolMode } from "../types";
import {
  Divider,
  EditorButton,
  FlexRow,
  Text,
  ToolbarIconButton,
  Tooltip,
  Box,
  BORDER_RADIUS,
  Slider
} from "../../ui_primitives";
import { RefineSelectionPopover } from "./refine-selection";
import { useSketchStore } from "../state";

interface SelectSettingsPanelProps {
  settings: SelectSettings;
  onChange: (settings: Partial<SelectSettings>) => void;
  hasActiveSelection: boolean;
  onInvertSelection: () => void;
  onCropCanvasToSelection?: () => void;
  onFeatherSelection: () => void;
  onSmoothSelectionBorders: () => void;
  onConvertSelectionToBorder: () => void;
}

export const SelectSettingsPanel = memo(function SelectSettingsPanel({
  settings,
  onChange,
  hasActiveSelection,
  onInvertSelection,
  onCropCanvasToSelection,
  onFeatherSelection,
  onSmoothSelectionBorders,
  onConvertSelectionToBorder
}: SelectSettingsPanelProps) {
  const { t } = useTranslation(["sketch"]);
  const refineAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const selectionPreviewMode = useSketchStore((s) => s.selectionPreviewMode);
  const setSelectionPreviewMode = useSketchStore(
    (s) => s.setSelectionPreviewMode
  );
  const showAsMask = selectionPreviewMode === "mask";

  return (
    <>
      <SketchModeToggle
        value={settings.mode}
        onChange={(_e, v: SelectToolMode | null) => {
          if (v != null) {
            onChange({ mode: v });
          }
        }}
      >
        <SketchModeOption
          value="rectangle"
          variant="icon"
          aria-label={t("sketch:selectPanel.rectangularMarquee")}
          title={t("sketch:selectPanel.rectangularMarquee")}
        >
          <RectangleOutlinedIcon fontSize="inherit" />
        </SketchModeOption>
        <SketchModeOption
          value="ellipse"
          variant="icon"
          aria-label={t("sketch:selectPanel.ellipticalMarquee")}
          title={t("sketch:selectPanel.ellipticalMarquee")}
        >
          <RadioButtonUncheckedIcon fontSize="inherit" />
        </SketchModeOption>
        <SketchModeOption
          value="lasso"
          variant="icon"
          aria-label={t("sketch:selectPanel.freehandLasso")}
          title={t("sketch:selectPanel.freehandLasso")}
        >
          <GestureOutlinedIcon fontSize="inherit" />
        </SketchModeOption>
        <SketchModeOption
          value="lasso_polygon"
          variant="icon"
          aria-label={t("sketch:selectPanel.polygon")}
          title={t("sketch:selectPanel.polygon")}
        >
          <PentagonOutlinedIcon fontSize="inherit" />
        </SketchModeOption>
        <SketchModeOption
          value="magic_wand"
          variant="icon"
          aria-label={t("sketch:selectPanel.magicWand")}
          title={t("sketch:selectPanel.magicWand")}
        >
          <AutoAwesomeOutlinedIcon fontSize="inherit" />
        </SketchModeOption>
      </SketchModeToggle>

      {settings.mode === "magic_wand" ? (
        <>
          <Box className="setting-row">
            <Text className="setting-label">{t("sketch:selectPanel.tolerance")}</Text>
            <Slider
              sx={sketchSliderSx}
              size="small"
              min={0}
              max={255}
              value={settings.magicWandTolerance}
              onChange={(_, v) => onChange({ magicWandTolerance: v as number })}
            />
            <Text className="setting-value">{settings.magicWandTolerance}</Text>
          </Box>
          <SketchModeToggle
            exclusive={false}
            value={[
              ...(settings.contiguous ? ["contiguous"] : []),
              ...(settings.sampleAllLayers ? ["allLayers"] : [])
            ]}
            onChange={(_, vals: string[]) => {
              onChange({
                contiguous: vals.includes("contiguous"),
                sampleAllLayers: vals.includes("allLayers")
              });
            }}
            sx={{ flexWrap: "wrap" }}
          >
            <SketchModeOption value="contiguous">{t("sketch:selectPanel.contiguous")}</SketchModeOption>
            <SketchModeOption value="allLayers">{t("sketch:selectPanel.allLayers")}</SketchModeOption>
          </SketchModeToggle>
        </>
      ) : null}

      <FlexRow
        align="center"
        wrap
        gap={0.5}
        fullWidth
        sx={{
          rowGap: 1
        }}
      >
        <FlexRow
          align="center"
          wrap
          gap={1}
          sx={{
            flex: 1,
            minWidth: 0
          }}
        >
          <EditorButton
            variant="outlined"
            onClick={onInvertSelection}
            sx={{
              ...sketchButtonSmallSx,
              minWidth: "60px",
              height: 24,
              lineHeight: 1
            }}
          >
            {t("sketch:selectPanel.invert")}
          </EditorButton>
          <Tooltip title={t("sketch:selectPanel.refineTooltip")}>
            <span>
              <EditorButton
                ref={refineAnchorRef}
                variant="outlined"
                disabled={!hasActiveSelection}
                onClick={() => setRefineOpen(true)}
                startIcon={<TuneIcon sx={{ fontSize: 14 }} />}
                sx={{
                  ...sketchButtonSmallSx,
                  minWidth: "76px",
                  height: 24,
                  lineHeight: 1,
                  "& .MuiButton-startIcon": { mr: 0.5 }
                }}
              >
                {t("sketch:selectPanel.refine")}
              </EditorButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              showAsMask
                ? t("sketch:selectPanel.previewMaskTooltip")
                : t("sketch:selectPanel.previewAntsTooltip")
            }
          >
            <span>
              <ToolbarIconButton
                onClick={() =>
                  setSelectionPreviewMode(showAsMask ? "ants" : "mask")
                }
                aria-label={
                  showAsMask
                    ? t("sketch:selectPanel.switchToAnts")
                    : t("sketch:selectPanel.switchToMask")
                }
                sx={{
                  ...iconButtonCompactSx,
                  border: `1px solid ${SKETCH_COLORS.border}`,
                  borderRadius: BORDER_RADIUS.xs,
                  height: 24,
                  width: 24,
                  color: showAsMask
                    ? "error.light"
                    : SKETCH_COLORS.textSecondary
                }}
              >
                {showAsMask ? (
                  <OpacityIcon sx={{ fontSize: 16 }} />
                ) : (
                  <BorderStyleIcon sx={{ fontSize: 16 }} />
                )}
              </ToolbarIconButton>
            </span>
          </Tooltip>
        </FlexRow>
        {onCropCanvasToSelection ? (
          <FlexRow
            align="center"
            gap={1}
            sx={{
              flexShrink: 0,
              ml: "auto"
            }}
          >
            <Divider
              orientation="vertical"
              flexItem
              sx={{ alignSelf: "stretch", borderColor: "grey.700" }}
            />
            <Tooltip title={t("sketch:selectPanel.cropCanvasToSelection")}>
              <span>
                <ToolbarIconButton
                  disabled={!hasActiveSelection}
                  onClick={onCropCanvasToSelection}
                  aria-label={t("sketch:selectPanel.cropCanvasToSelection")}
                  sx={{
                    ...iconButtonCompactSx,
                    border: `1px solid ${SKETCH_COLORS.border}`,
                    borderRadius: BORDER_RADIUS.xs,
                    color: SKETCH_COLORS.textSecondary
                  }}
                >
                  <CropIcon sx={{ fontSize: 18 }} />
                </ToolbarIconButton>
              </span>
            </Tooltip>
          </FlexRow>
        ) : null}
      </FlexRow>

      <RefineSelectionPopover
        open={refineOpen}
        anchorEl={refineAnchorRef.current}
        onClose={() => setRefineOpen(false)}
        settings={settings}
        onChange={onChange}
        onFeatherSelection={onFeatherSelection}
        onSmoothSelectionBorders={onSmoothSelectionBorders}
        onConvertSelectionToBorder={onConvertSelectionToBorder}
      />
    </>
  );
});
