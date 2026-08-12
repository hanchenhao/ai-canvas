/** @jsxImportSource @emotion/react */
/**
 * ShotCard
 *
 * One shot in the storyboard, laid out as a full-width row: the keyframe
 * still or rendered clip on the left, and the shot's text, camera line,
 * cast, takes browser, and actions in the wide column beside it. There is
 * no approval step: the selected still (see {@link ShotTakesGallery}) is
 * what the clip render uses, so a shot is ready for video as soon as it
 * has a still.
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import type { Shot, ShotStatus } from "@nodetool-ai/protocol";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import {
  Card,
  FlexRow,
  FlexColumn,
  EditorButton,
  StatusIndicator,
  Chip,
  Text,
  Caption,
  VideoPlayer,
  Dialog,
  TextInput,
  ToolbarIconButton,
  HoverActionGroup,
  SPACING,
  getSpacingPx,
  BORDER_RADIUS,
  MOTION,
  type StatusType
} from "../ui_primitives";
import ImageRefPreview from "../node/ImageRefPreview";
import ShotTakesGallery from "./ShotTakesGallery";
import { useStoryboardStore } from "../../stores/storyboard/StoryboardStore";
import { entitiesForShot } from "../../stores/storyboard/shotEntities";
import { useGenerateShot } from "../../hooks/storyboard/useGenerateShot";
import { useEntities } from "../../serverState/useEntities";
import { ENTITY_KIND_COLOR } from "../entities/entityKind";

interface ShotCardProps {
  boardId: string;
  shot: Shot;
  readOnly?: boolean;
  /** True when this is the first shot on the board (disables "move up"). */
  isFirst?: boolean;
  /** True when this is the last shot on the board (disables "move down"). */
  isLast?: boolean;
}

const STATUS_META: Record<ShotStatus, { status: StatusType; labelKey: string; pulse?: boolean }> = {
  planned: { status: "default", labelKey: "storyboard:shot.planned" },
  keyframe_generating: { status: "pending", labelKey: "storyboard:shot.keyframeGenerating", pulse: true },
  keyframe_ready: { status: "info", labelKey: "storyboard:shot.keyframeReady" },
  // Legacy status from the removed approval step; same meaning as a ready still.
  approved: { status: "info", labelKey: "storyboard:shot.keyframeReady" },
  clip_generating: { status: "pending", labelKey: "storyboard:shot.clipGenerating", pulse: true },
  rendered: { status: "success", labelKey: "storyboard:shot.rendered" },
  failed: { status: "error", labelKey: "storyboard:shot.failed" }
};

const styles = (theme: Theme) =>
  css({
    display: "grid",
    gridTemplateColumns: "minmax(220px, 300px) minmax(0, 1fr)",
    gap: getSpacingPx(SPACING.md),
    alignItems: "start",
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)"
    },
    ".preview": {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9",
      borderRadius: BORDER_RADIUS.sm,
      overflow: "hidden",
      backgroundColor: theme.vars.palette.c_overlay_subtle,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "& img": {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    },
    ".placeholder": {
      color: theme.vars.palette.text.disabled,
      textAlign: "center",
      padding: getSpacingPx(SPACING.md)
    },
    ".details": {
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: getSpacingPx(SPACING.sm)
    },
    ".camera": {
      color: theme.vars.palette.text.secondary
    },
    // ── Generating: shimmer sweep + spark over the preview, glow on the card ──
    "@keyframes shot-shimmer": {
      from: { backgroundPosition: "200% 0" },
      to: { backgroundPosition: "-200% 0" }
    },
    "@keyframes shot-spark": {
      "0%, 100%": { opacity: 0.4, transform: "scale(0.9) rotate(0deg)" },
      "50%": { opacity: 1, transform: "scale(1.2) rotate(90deg)" }
    },
    "@keyframes shot-breathe": {
      "0%, 100%": { boxShadow: `0 0 0 1px ${theme.vars.palette.primary.main}33` },
      "50%": { boxShadow: `0 0 14px 1px ${theme.vars.palette.primary.main}55` }
    },
    "&.generating": {
      animation: `shot-breathe ${MOTION.pulse} infinite`
    },
    ".conjure": {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: getSpacingPx(SPACING.sm),
      backgroundImage: `linear-gradient(100deg, transparent 40%, ${theme.vars.palette.action.selected} 50%, transparent 60%)`,
      backgroundSize: "200% 100%",
      animation: `shot-shimmer ${MOTION.spin} infinite`,
      ".spark": {
        fontSize: "1.5em",
        color: theme.vars.palette.primary.main,
        animation: `shot-spark ${MOTION.pulse} infinite`
      },
      ".conjure-label": {
        color: theme.vars.palette.text.secondary
      }
    },
    "@media (prefers-reduced-motion: reduce)": {
      "&.generating, .conjure, .conjure .spark": { animation: "none" }
    }
  });

const cameraLine = (shot: Shot): string =>
  [
    shot.camera?.framing,
    shot.camera?.lens,
    shot.camera?.angle,
    shot.camera?.movement
  ]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(" · ");

const EMPTY_IDS: string[] = [];

const ShotCardInner: React.FC<ShotCardProps> = ({
  boardId,
  shot,
  readOnly,
  isFirst,
  isLast
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["storyboard"]);
  const cardStyles = useMemo(() => styles(theme), [theme]);
  const toggleShotEntity = useStoryboardStore((state) => state.toggleShotEntity);
  const moveShot = useStoryboardStore((state) => state.moveShot);
  const removeShot = useStoryboardStore((state) => state.removeShot);
  const boardEntityIds = useStoryboardStore(
    (state) => state.boards[boardId]?.entityIds ?? EMPTY_IDS
  );
  const { data: allEntities } = useEntities();
  const { generateKeyframe, generateClip, generateRevisedClip } =
    useGenerateShot();

  const { boardEntities, appliedIds } = useMemo(() => {
    const idSet = new Set(boardEntityIds);
    const board = (allEntities ?? []).filter((e) => idSet.has(e.id));
    return {
      boardEntities: board,
      appliedIds: entitiesForShot(shot, board).map((e) => e.id)
    };
  }, [allEntities, boardEntityIds, shot]);

  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseText, setReviseText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = STATUS_META[shot.status];
  const isGenerating =
    shot.status === "keyframe_generating" || shot.status === "clip_generating";
  const camera = cameraLine(shot);
  const clipUri = shot.clip?.uri;
  const shotName = `${shot.index + 1}. ${shot.slug ?? t("storyboard:shot.untitled")}`;

  const handleGenerateStill = useCallback(() => {
    void generateKeyframe(boardId, shot);
  }, [generateKeyframe, boardId, shot]);

  const handleGenerateClip = useCallback(() => {
    void generateClip(boardId, shot);
  }, [generateClip, boardId, shot]);

  const handleReviseConfirm = useCallback(() => {
    const instruction = reviseText.trim();
    if (instruction.length > 0) {
      void generateRevisedClip(boardId, shot, instruction);
    }
    setReviseOpen(false);
    setReviseText("");
  }, [reviseText, generateRevisedClip, boardId, shot]);

  const handleMoveUp = useCallback(() => {
    moveShot(boardId, shot.id, "up");
  }, [moveShot, boardId, shot.id]);

  const handleMoveDown = useCallback(() => {
    moveShot(boardId, shot.id, "down");
  }, [moveShot, boardId, shot.id]);

  const handleDelete = useCallback(() => {
    removeShot(boardId, shot.id);
    setConfirmDelete(false);
  }, [removeShot, boardId, shot.id]);

  return (
    <Card
      variant="outlined"
      padding="compact"
      css={cardStyles}
      className={`shot-card${isGenerating ? " generating" : ""}`}
    >
      <div className="preview">
        {clipUri ? (
          <VideoPlayer src={clipUri} />
        ) : (
          <ImageRefPreview
            value={shot.keyframe}
            placeholder={
              <Caption className="placeholder">{t("storyboard:shot.noStillYet")}</Caption>
            }
          />
        )}
        {isGenerating && (
          <div className="conjure">
            <span className="spark">✦</span>
            <Caption className="conjure-label">
              {shot.status === "clip_generating"
                ? t("storyboard:shot.renderingClip")
                : t("storyboard:shot.conjuringStill")}
            </Caption>
          </div>
        )}
      </div>

      <FlexColumn className="details">
        <FlexRow align="center" justify="space-between" gap={1} wrap>
          <Text size="small" weight={600} truncate>
            {shotName}
          </Text>
          <FlexRow align="center" gap={1}>
            {typeof shot.cost_estimate === "number" && (
              <Chip
                compact
                color="info"
                label={`~$${shot.cost_estimate.toFixed(2)}`}
              />
            )}
            <StatusIndicator
              status={meta.status}
              label={t(meta.labelKey)}
              pulse={meta.pulse}
            />
            {!readOnly && (
              <HoverActionGroup
                triggerSelector=".shot-card:hover"
                gap={0}
                // Touch devices can't hover; keep the row actions (reorder,
                // delete) visible there instead of hiding behind the reveal.
                sx={{ "@media (pointer: coarse)": { opacity: 1 } }}
              >
                <ToolbarIconButton
                  icon={<ArrowUpwardIcon sx={{ fontSize: 16 }} />}
                  tooltip={t("storyboard:shot.moveUp")}
                  ariaLabel={t("storyboard:shot.moveShotUp")}
                  onClick={handleMoveUp}
                  disabled={isFirst}
                />
                <ToolbarIconButton
                  icon={<ArrowDownwardIcon sx={{ fontSize: 16 }} />}
                  tooltip={t("storyboard:shot.moveDown")}
                  ariaLabel={t("storyboard:shot.moveShotDown")}
                  onClick={handleMoveDown}
                  disabled={isLast}
                />
                <ToolbarIconButton
                  icon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                  tooltip={t("storyboard:shot.deleteShot")}
                  ariaLabel={t("storyboard:shot.deleteShot")}
                  variant="error"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isGenerating}
                />
              </HoverActionGroup>
            )}
          </FlexRow>
        </FlexRow>

        <Text size="small" lineClamp={3}>
          {shot.action}
        </Text>

        {camera.length > 0 && (
          <Caption className="camera" noWrap>
            {camera}
          </Caption>
        )}

        {boardEntities.length > 0 && (
          <FlexRow gap={0.5} wrap>
            {boardEntities.map((entity) => {
              const applied = appliedIds.includes(entity.id);
              return (
                <Chip
                  key={entity.id}
                  compact
                  label={entity.name || t("storyboard:shot.untitledEntity")}
                  color={applied ? ENTITY_KIND_COLOR[entity.kind] : "default"}
                  variant={applied ? "filled" : "outlined"}
                  sx={{
                    borderRadius: BORDER_RADIUS.sm,
                    ...(applied ? undefined : { opacity: 0.55 })
                  }}
                  title={
                    applied
                      ? t("storyboard:shot.entityExcludeTitle", { name: entity.descriptor || entity.name })
                      : t("storyboard:shot.entityIncludeTitle", { name: entity.name })
                  }
                  onClick={
                    readOnly
                      ? undefined
                      : () =>
                          toggleShotEntity(boardId, shot.id, entity.id, appliedIds)
                  }
                />
              );
            })}
          </FlexRow>
        )}

        <ShotTakesGallery boardId={boardId} shot={shot} readOnly={readOnly} />

        {!readOnly && (
          <FlexRow gap={0.5} wrap>
            <EditorButton
              onClick={handleGenerateStill}
              disabled={isGenerating}
            >
              {shot.keyframe ? t("storyboard:shot.newStill") : t("storyboard:shot.generateStill")}
            </EditorButton>
            <EditorButton
              onClick={handleGenerateClip}
              disabled={isGenerating || !shot.keyframe}
              title={
                shot.keyframe
                  ? t("storyboard:shot.animateStillHint")
                  : t("storyboard:shot.generateStillFirstHint")
              }
            >
              {shot.clip ? t("storyboard:shot.newClip") : t("storyboard:shot.generateClip")}
            </EditorButton>
            {shot.clip && (
              <EditorButton
                onClick={() => setReviseOpen(true)}
                disabled={isGenerating}
              >
                {t("storyboard:shot.reviseClip")}
              </EditorButton>
            )}
          </FlexRow>
        )}
      </FlexColumn>

      <Dialog
        open={reviseOpen}
        onClose={() => setReviseOpen(false)}
        title={t("storyboard:shot.reviseClip")}
        onConfirm={handleReviseConfirm}
        confirmText={t("storyboard:shot.revise")}
        confirmDisabled={reviseText.trim().length === 0}
      >
        <FlexColumn gap={1}>
          <Caption color="secondary">
            {t("storyboard:shot.reviseCaption")}
          </Caption>
          <TextInput
            value={reviseText}
            placeholder={t("storyboard:shot.revisePlaceholder")}
            onChange={(e) => setReviseText(e.target.value)}
            multiline
            rows={3}
            autoFocus
          />
        </FlexColumn>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("storyboard:shot.deleteTitle")}
        onConfirm={handleDelete}
        confirmText={t("storyboard:shot.delete")}
        destructive
      >
        <Text size="small">
          {t("storyboard:shot.deleteConfirm", { name: shotName })}
        </Text>
      </Dialog>
    </Card>
  );
};

export const ShotCard = memo(ShotCardInner);
ShotCard.displayName = "ShotCard";

export default ShotCard;
