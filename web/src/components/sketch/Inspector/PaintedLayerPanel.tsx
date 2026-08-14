/** @jsxImportSource @emotion/react */
/**
 * PaintedLayerPanel
 *
 * Read-only inspector for plain raster / mask layers (the user-painted
 * layers). No workflow binding, no node stack — just enough metadata to
 * orient the user. Editable transforms and effects are reached via the
 * canvas tools, not here.
 */

import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Layer } from "../types";
import {
  Caption,
  CollapsibleSection,
  FlexColumn,
  FlexRow,
  Label,
  Panel,
  Text
} from "../../ui_primitives";

export interface PaintedLayerPanelProps {
  layer: Layer;
}

function describeKind(layer: Layer, t: (key: string) => string): string {
  if (layer.type === "mask") {return t("sketch:paintedLayerPanel.maskLayer");}
  if (layer.type === "group") {return t("sketch:paintedLayerPanel.group");}
  return t("sketch:paintedLayerPanel.paintedLayer");
}

export const PaintedLayerPanel: React.FC<PaintedLayerPanelProps> = memo(
  ({ layer }) => {
    const { t } = useTranslation("sketch");
    return (
      <Panel
        background="default"
        bordered={false}
        sx={{ width: "100%", overflow: "auto" }}
      >
        <FlexColumn gap={0}>
          <FlexColumn gap={0.5} sx={{ px: 1, pt: 0.5, pb: 0.5 }}>
            <FlexRow align="center" gap={1}>
              <Label noWrap sx={{ flex: 1 }}>
                {layer.name}
              </Label>
            </FlexRow>
            <Caption color="secondary">{describeKind(layer, t)}</Caption>
          </FlexColumn>

          <CollapsibleSection title={t("sketch:paintedLayerPanel.sectionTitle")} defaultOpen>
            <FlexColumn gap={0.5}>
              <Text size="small">
                {t("sketch:paintedLayerPanel.opacity", {
                  value: Math.round(layer.opacity * 100)
                })}
              </Text>
              <Text size="small">
                {t("sketch:paintedLayerPanel.blendMode", {
                  mode: layer.blendMode
                })}
              </Text>
              <Text size="small">
                {t("sketch:paintedLayerPanel.bounds", {
                  width: layer.contentBounds.width,
                  height: layer.contentBounds.height,
                  x: layer.contentBounds.x,
                  y: layer.contentBounds.y
                })}
              </Text>
              <Text size="small">
                {layer.effects.length === 0
                  ? t("sketch:paintedLayerPanel.effectsNone")
                  : t("sketch:paintedLayerPanel.effects", {
                      count: layer.effects.length
                    })}
              </Text>
            </FlexColumn>
          </CollapsibleSection>
        </FlexColumn>
      </Panel>
    );
  }
);

PaintedLayerPanel.displayName = "PaintedLayerPanel";
