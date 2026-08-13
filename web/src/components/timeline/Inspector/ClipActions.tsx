/** @jsxImportSource @emotion/react */

import React, { memo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ImageIcon from "@mui/icons-material/Image";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";

import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useTimelineUIStore } from "../../../stores/timeline/TimelineUIStore";
import { findClipById } from "../../../stores/timeline/clipLookup";
import { ToolbarIconButton, FlexRow, Text, Dialog, TextInput, Toast } from "../../ui_primitives";

// ── Styles ─────────────────────────────────────────────────────────────────

const actionsRowStyles = (theme: Theme) =>
  css({
    padding: theme.spacing(0.5, 1),
    gap: theme.spacing(0.5),
    flexWrap: "wrap",
    alignItems: "center"
  });

// ── Component ──────────────────────────────────────────────────────────────

export interface ClipActionsProps {
  clipId: string;
  duplicateOffsetMs?: number;
}

export const ClipActions: React.FC<ClipActionsProps> = memo(
  ({ clipId, duplicateOffsetMs = 0 }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { t } = useTranslation(["timeline"]);

    const clip = useTimelineStore((s) => findClipById(s.clips, clipId));
    const sequenceId = useTimelineStore((s) => s.sequenceId);

    const duplicateClip = useTimelineStore((s) => s.duplicateClip);
    const regenerateAsCopy = useTimelineStore((s) => s.regenerateAsCopy);
    const selectClip = useTimelineUIStore((s) => s.selectClip);
    const setClipLocked = useTimelineStore((s) => s.setClipLocked);
    const replaceClipOutput = useTimelineStore((s) => s.replaceClipOutput);

    const duplicateBusyRef = useRef(false);
    const [duplicateBusy, setDuplicateBusy] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [replaceOpen, setReplaceOpen] = useState(false);
    const [assetIdInput, setAssetIdInput] = useState("");

   const handleDuplicate = useCallback(async () => {
     if (duplicateBusyRef.current) {
        return;
      }
      duplicateBusyRef.current = true;
      setDuplicateBusy(true);
      try {
        const newClipId = await duplicateClip(clipId, duplicateOffsetMs);
        selectClip(newClipId);
      } catch (err) {
        setDuplicateError(
          err instanceof Error ? err.message : t("timeline:clipActions.duplicateFailed")
        );
      } finally {
        duplicateBusyRef.current = false;
        setDuplicateBusy(false);
      }
    }, [clipId, duplicateOffsetMs, duplicateClip, selectClip, t]);

    // ── Regenerate as new clip ─────────────────────────────────────────────
    // Drops a fresh sibling immediately to the right with the same binding
    // (workflow + overrides, or prompt + model) but no rendered asset, so
    // the user can roll a new take without losing the existing one.
   const handleRegenerateAsCopy = useCallback(() => {
     try {
        const newClipId = regenerateAsCopy(clipId, duplicateOffsetMs);
        selectClip(newClipId);
      } catch (err) {
        setDuplicateError(
          err instanceof Error ? err.message : t("timeline:clipActions.copyFailed")
        );
      }
    }, [clipId, duplicateOffsetMs, regenerateAsCopy, selectClip, t]);

    // ── Lock ───────────────────────────────────────────────────────────────

    const handleToggleLock = useCallback(() => {
      if (!clip) {
        return;
      }
      setClipLocked(clipId, !clip.locked);
    }, [clipId, clip, setClipLocked]);

    // ── Replace Output ─────────────────────────────────────────────────────

    const handleOpenReplace = useCallback(() => {
      setAssetIdInput(clip?.currentAssetId ?? "");
      setReplaceOpen(true);
    }, [clip]);

    const handleConfirmReplace = useCallback(() => {
      const trimmed = assetIdInput.trim();
      if (trimmed) {
        replaceClipOutput(clipId, trimmed);
      }
      setReplaceOpen(false);
    }, [clipId, assetIdInput, replaceClipOutput]);

    const handleCancelReplace = useCallback(() => {
      setReplaceOpen(false);
    }, []);

    // ── Open in Node Editor ────────────────────────────────────────────────

    const handleOpenInNodeEditor = useCallback(() => {
      if (!clip?.workflowId || !sequenceId) {
        return;
      }
      navigate(
        `/editor/${clip.workflowId}?from=timeline:${sequenceId}:${clipId}`
      );
    }, [clip?.workflowId, sequenceId, clipId, navigate]);

    if (!clip) {
      return null;
    }

    return (
      <>
        <FlexRow css={actionsRowStyles(theme)}>
          {/* Generation has its own primary button in the prompt / inputs
              panel; this toolbar is for clip operations only. */}
          <ToolbarIconButton
            icon={<ContentCopyIcon fontSize="small" />}
            tooltip={t("timeline:clipActions.duplicateTooltip")}
            onClick={() => void handleDuplicate()}
            disabled={duplicateBusy}
            aria-label={t("timeline:clipActions.ariaDuplicate")}
            data-testid="clip-action-duplicate"
          />

          {clip.sourceType === "generated" && (
            <ToolbarIconButton
              icon={<AutoAwesomeMotionIcon fontSize="small" />}
              tooltip={t("timeline:clipActions.regenerateTooltip")}
              onClick={handleRegenerateAsCopy}
              aria-label={t("timeline:clipActions.ariaRegenerate")}
              data-testid="clip-action-regenerate-as-copy"
            />
          )}

          <ToolbarIconButton
            icon={
              clip.locked ? (
                <LockIcon fontSize="small" />
              ) : (
                <LockOpenIcon fontSize="small" />
              )
            }
            tooltip={
              clip.locked
                ? t("timeline:clipActions.lockedTooltip")
                : t("timeline:clipActions.unlockedTooltip")
            }
            active={clip.locked}
            onClick={handleToggleLock}
            aria-label={clip.locked ? t("timeline:clipActions.ariaUnlock") : t("timeline:clipActions.ariaLock")}
            data-testid="clip-action-lock"
          />

          <ToolbarIconButton
            icon={<ImageIcon fontSize="small" />}
            tooltip={t("timeline:clipActions.replaceOutputTooltip")}
            onClick={handleOpenReplace}
            aria-label={t("timeline:clipActions.ariaReplaceOutput")}
            data-testid="clip-action-replace-output"
          />

          {clip.workflowId && sequenceId && (
            <ToolbarIconButton
              icon={<OpenInNewIcon fontSize="small" />}
              tooltip={t("timeline:clipActions.openInNodeEditor")}
              onClick={handleOpenInNodeEditor}
              aria-label={t("timeline:clipActions.ariaOpenInEditor")}
              data-testid="clip-action-open-in-editor"
            />
          )}
        </FlexRow>

        {/* Replace Output dialog */}
        <Dialog
          open={replaceOpen}
          onClose={handleCancelReplace}
          title={t("timeline:clipActions.replaceOutputDialog")}
          onConfirm={handleConfirmReplace}
          onCancel={handleCancelReplace}
          confirmText={t("timeline:clipActions.replace")}
          cancelText={t("timeline:clipActions.cancel")}
          showActions
        >
          <Text size="small" sx={{ mb: 1 }}>
            {t("timeline:clipActions.replaceOutputHint")}
          </Text>
          <TextInput
            value={assetIdInput}
            onChange={(e) => setAssetIdInput(e.target.value)}
            placeholder={t("timeline:clipActions.assetIdPlaceholder")}
            inputProps={{ "aria-label": t("timeline:clipActions.assetIdPlaceholder") }}
            fullWidth
            size="small"
          />
        </Dialog>

        <Toast
          open={duplicateError !== null}
          message={duplicateError ?? ""}
          severity="error"
          onClose={() => setDuplicateError(null)}
          vertical="top"
          horizontal="center"
        />
      </>
    );
  }
);

ClipActions.displayName = "ClipActions";
