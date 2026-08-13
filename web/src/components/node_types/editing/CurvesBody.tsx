/** @jsxImportSource @emotion/react */
/**
 * CurvesBody — bespoke body for `lib.image.color_grading.Curves`.
 *
 * Preview on top, eight sliders organized into two sections:
 *   - Tonal: Black Point, White Point, Shadows, Midtones, Highlights
 *   - RGB Midtones: Red, Green, Blue
 * Plus a reset button that returns every slider to its defaults.
 */

import React, { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import ImageIcon from "@mui/icons-material/Image";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import {
  CheckerDropzone,
  FlexRow,
  StateIconButton, BORDER_RADIUS } from "../../ui_primitives";
import HandleColumn from "../../node/HandleColumn";
import ImageRefPreview from "../../node/ImageRefPreview";
import { NodeOutputs } from "../../node/NodeOutputs";
import NodeProgress from "../../node/NodeProgress";

import type { NodeMetadata } from "../../../stores/ApiTypes";
import type { NodeData } from "../../../stores/NodeData";
import { useLiveSliderWriter } from "../../../hooks/nodes/useLiveSliderWriter";
import { useNodeOutput } from "../../../hooks/nodes/useNodeIO";
import { CURVES_NODE_TYPE } from "../../../constants/nodeTypes";
import {
  AdjustmentSlider,
  adjustmentSliderStyles,
  clamp,
  type SliderSpec
} from "./AdjustmentSlider";

const TONAL_SLIDERS: ReadonlyArray<Omit<SliderSpec, "label">> = [
  { name: "black_point", min: 0, max: 0.5, step: 0.01, default: 0, bipolar: false },
  { name: "white_point", min: 0.5, max: 1, step: 0.01, default: 1, bipolar: false },
  { name: "shadows", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true },
  { name: "midtones", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true },
  { name: "highlights", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true }
];

const RGB_SLIDERS: ReadonlyArray<Omit<SliderSpec, "label">> = [
  { name: "red_midtones", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true },
  { name: "green_midtones", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true },
  { name: "blue_midtones", min: -0.5, max: 0.5, step: 0.01, default: 0, bipolar: true }
];

const ALL_SLIDER_NAMES = [...TONAL_SLIDERS, ...RGB_SLIDERS];

const TONAL_LABEL_KEYS: Record<string, string> = {
  black_point: "canvas:imageEditing.blackPoint",
  white_point: "canvas:imageEditing.whitePoint",
  shadows: "canvas:imageEditing.shadows",
  midtones: "canvas:imageEditing.midtones",
  highlights: "canvas:imageEditing.highlights"
};

const RGB_LABEL_KEYS: Record<string, string> = {
  red_midtones: "canvas:imageEditing.red",
  green_midtones: "canvas:imageEditing.green",
  blue_midtones: "canvas:imageEditing.blue"
};

const styles = (theme: Theme) =>
  css({
    "&.curves-body": {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.5),
      padding: theme.spacing(0.5),
      minHeight: 0
    },
    "& > .handle-column": {
      top: theme.spacing(1),
      bottom: theme.spacing(1),
      left: `calc(${theme.spacing(0)})`
    },
    ".preview-area": {
      position: "relative",
      flex: "1 1 auto",
      minHeight: 140,
      borderRadius: BORDER_RADIUS.sm,
      overflow: "hidden",
      backgroundColor: theme.vars.palette.grey[900],
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "& img": {
        display: "block",
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain"
      }
    },
    ".section": {
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.5)
    },
    ".section-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`
    },
    ".section-title": {
      fontSize: theme.fontSizeSmaller,
      color: theme.vars.palette.text.secondary,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      lineHeight: 1
    },
    ".controls": {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      columnGap: theme.spacing(1),
      rowGap: theme.spacing(0.5),
      alignItems: "center",
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)} ${theme.spacing(0.5)}`
    },
    // Channel tints layered over the shared `.ctrl-label` styles.
    ".ctrl-label.red": { color: theme.vars.palette.error.main },
    ".ctrl-label.green": { color: theme.vars.palette.success.main },
    ".ctrl-label.blue": { color: theme.vars.palette.info.main },
    ".outputs-row": {
      flex: "0 0 auto"
    }
  });

const ImagePreview: React.FC<{ value: unknown }> = ({ value }) => (
  <ImageRefPreview
    value={value}
    placeholder={
      <CheckerDropzone message="Connect an image, then run" icon={<ImageIcon />} />
    }
  />
);

const channelClass = (name: string): string => {
  if (name === "red_midtones") return "red";
  if (name === "green_midtones") return "green";
  if (name === "blue_midtones") return "blue";
  return "";
};

export interface CurvesBodyProps {
  id: string;
  nodeType: string;
  nodeMetadata: NodeMetadata;
  data: NodeData;
  workflowId: string;
  status?: string;
  isOutputNode: boolean;
}

const CurvesBodyInner: React.FC<CurvesBodyProps> = ({
  id,
  nodeType,
  nodeMetadata,
  data,
  workflowId,
  status,
  isOutputNode
}) => {
  const theme = useTheme();
  const { t } = useTranslation("canvas");
  const cssStyles = useMemo(
    () => [styles(theme), adjustmentSliderStyles(theme)],
    [theme]
  );

  const tonalSliders = useMemo<ReadonlyArray<SliderSpec>>(
    () => TONAL_SLIDERS.map((s) => ({ ...s, label: t(TONAL_LABEL_KEYS[s.name]) })),
    [t]
  );
  const rgbSliders = useMemo<ReadonlyArray<SliderSpec>>(
    () => RGB_SLIDERS.map((s) => ({ ...s, label: t(RGB_LABEL_KEYS[s.name]) })),
    [t]
  );
  const allSliders = useMemo<ReadonlyArray<SliderSpec>>(
    () => [...tonalSliders, ...rgbSliders],
    [tonalSliders, rgbSliders]
  );

  const properties = nodeMetadata.properties ?? [];
  const imageProperty = useMemo(
    () => properties.filter((p) => p.name === "image"),
    [properties]
  );

  const props = data.properties ?? {};
  const previewValue = useNodeOutput(workflowId, id);

  const { setProperty, setProperties, setPropertyComplete } =
    useLiveSliderWriter({ nodeId: id, nodeType });

  const handleChange = useCallback(
    (name: string, v: number) => {
      const spec = allSliders.find((s) => s.name === name);
      if (!spec) return;
      setProperty(name, clamp(v, spec.min, spec.max));
    },
    [setProperty, allSliders]
  );

  const handleReset = useCallback(() => {
    const defaults: Record<string, unknown> = {};
    for (const s of ALL_SLIDER_NAMES) defaults[s.name] = s.default;
    setProperties(defaults);
    setPropertyComplete();
  }, [setProperties, setPropertyComplete]);

  return (
    <div css={cssStyles} className="curves-body" data-bespoke-body="Curves">
      <HandleColumn id={id} properties={imageProperty} />
      <div className="preview-area">
        <ImagePreview value={previewValue} />
      </div>

      <div className="section">
        <FlexRow className="section-header" align="center" justify="space-between">
          <span className="section-title">{t("canvas:imageEditing.tonalSection")}</span>
          <StateIconButton
            size="small"
            icon={<RestartAltIcon fontSize="small" />}
            tooltip={t("canvas:imageEditing.resetAllCurves")}
            ariaLabel={t("canvas:imageEditing.resetAllCurves")}
            onClick={handleReset}
          />
        </FlexRow>
        <div className="controls">
          {tonalSliders.map((spec) => {
            const raw = Number(props[spec.name] ?? spec.default);
            const value = clamp(raw, spec.min, spec.max);
            return (
              <AdjustmentSlider
                key={spec.name}
                spec={spec}
                value={value}
                onChange={handleChange}
                onCommit={setPropertyComplete}
              />
            );
          })}
        </div>
      </div>

      <div className="section">
        <FlexRow className="section-header" align="center" justify="space-between">
          <span className="section-title">{t("canvas:imageEditing.rgbMidtonesSection")}</span>
        </FlexRow>
        <div className="controls">
          {rgbSliders.map((spec) => {
            const raw = Number(props[spec.name] ?? spec.default);
            const value = clamp(raw, spec.min, spec.max);
            return (
              <AdjustmentSlider
                key={spec.name}
                spec={spec}
                value={value}
                onChange={handleChange}
                onCommit={setPropertyComplete}
                labelClassName={channelClass(spec.name)}
              />
            );
          })}
        </div>
      </div>

      {!isOutputNode && (
        <div className="outputs-row">
          <NodeOutputs id={id} outputs={nodeMetadata.outputs} />
        </div>
      )}

      {status === "running" && <NodeProgress id={id} workflowId={workflowId} />}
    </div>
  );
};

export const CurvesBody = memo(CurvesBodyInner);
CurvesBody.displayName = "CurvesBody";

export { CURVES_NODE_TYPE };
export default CurvesBody;
