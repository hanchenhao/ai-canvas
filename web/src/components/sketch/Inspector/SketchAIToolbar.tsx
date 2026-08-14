/** @jsxImportSource @emotion/react */
/** Generate Layer + Re-generate Stale Layers toolbar. */

import React, { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

import {
  Dialog,
  EditorButton,
  FlexRow,
  Text,
  Toast,
  Tooltip
} from "../../ui_primitives";
import { TOOLTIP_ENTER_DELAY } from "../../../config/constants";
import { useSketchSessionStore } from "../../../stores/sketch/SketchSessionStore";
import { useRegenerateStaleLayers } from "../../../hooks/sketch/useRegenerateStaleLayers";
import { CreateGeneratedLayerDialog } from "./CreateGeneratedLayerDialog";

const SketchAIToolbarInner: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation("sketch");
  // Derive the counts directly via Zustand selectors so we don't iterate
  // every binding on every render of the toolbar.
  const staleCount = useSketchSessionStore((s) =>
    Object.values(s.bindings).reduce(
      (n, b) => n + (b.status === "stale" ? 1 : 0),
      0
    )
  );
  const lockedCount = useSketchSessionStore((s) =>
    Object.values(s.bindings).reduce(
      (n, b) => n + (b.status === "locked" ? 1 : 0),
      0
    )
  );

  const { regenerateStaleLayers, isBusy: regenBusy } =
    useRegenerateStaleLayers();

  const [error, setError] = useState<string | null>(null);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const handleConfirmRegen = useCallback(async () => {
    setConfirmRegenOpen(false);
    const summary = await regenerateStaleLayers();
    if (summary.failed > 0) {
      setError(
        t("sketch:aiToolbar.regenFailedToast", {
          started: summary.started,
          failed: summary.failed
        })
      );
    }
  }, [regenerateStaleLayers, t]);

  return (
    <>
      <FlexRow
        align="center"
        gap={0.5}
        sx={{
          padding: theme.spacing(0.5, 1),
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          flexWrap: "wrap"
        }}
      >
        <Tooltip
          title={t("sketch:aiToolbar.generateLayerTooltip")}
          delay={TOOLTIP_ENTER_DELAY}
          placement="bottom"
        >
          <span>
            <EditorButton
              onClick={() => setGenerateDialogOpen(true)}
              size="small"
              startIcon={<AddPhotoAlternateIcon fontSize="small" />}
              data-testid="sketch-action-generate-layer"
            >
              {t("sketch:aiToolbar.generateLayer")}
            </EditorButton>
          </span>
        </Tooltip>

        <Tooltip
          title={
            staleCount === 0
              ? t("sketch:aiToolbar.noStaleLayers")
              : t("sketch:aiToolbar.regenStaleTooltip", { count: staleCount })
          }
          delay={TOOLTIP_ENTER_DELAY}
          placement="bottom"
        >
          <span>
            <EditorButton
              onClick={() => setConfirmRegenOpen(true)}
              disabled={staleCount === 0 || regenBusy}
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              data-testid="sketch-action-regenerate-stale"
            >
              {t("sketch:aiToolbar.regenerateStale", { count: staleCount })}
            </EditorButton>
          </span>
        </Tooltip>
      </FlexRow>

      <CreateGeneratedLayerDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
      />

      <Dialog
        open={confirmRegenOpen}
        onClose={() => setConfirmRegenOpen(false)}
        title={t("sketch:aiToolbar.regenTitle")}
        onConfirm={() => void handleConfirmRegen()}
        onCancel={() => setConfirmRegenOpen(false)}
        confirmText={t("sketch:aiToolbar.regenerate")}
        cancelText={t("common:button.cancel")}
        showActions
      >
        <Text size="small" sx={{ mb: 1 }}>
          {t("sketch:aiToolbar.staleReady", { count: staleCount })}
          {lockedCount > 0 && (
            <> {t("sketch:aiToolbar.lockedSkipped", { count: lockedCount })}</>
          )}{" "}
          {t("sketch:aiToolbar.sequentialNote")}
        </Text>
      </Dialog>

      <Toast
        open={error !== null}
        message={error ?? ""}
        severity="warning"
        onClose={() => setError(null)}
        vertical="top"
        horizontal="center"
      />
    </>
  );
};

export const SketchAIToolbar = memo(SketchAIToolbarInner);
SketchAIToolbar.displayName = "SketchAIToolbar";

export default SketchAIToolbar;
