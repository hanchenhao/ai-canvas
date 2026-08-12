/** @jsxImportSource @emotion/react */
/**
 * AddTrackButton
 *
 * Compact "+ Track" affordance in the timeline toolbar. Opens a popover with
 * the four track types (video / audio / overlay / subtitle); selecting one
 * calls `TimelineStore.addTrack(type)`, which appends a new track with an
 * auto-generated name.
 */

import React, { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";

import type { TimelineTrack } from "@nodetool-ai/timeline";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { Popover, MenuItemPrimitive, MOTION, BORDER_RADIUS } from "../../ui_primitives";

const buttonStyles = (theme: Theme, compact: boolean) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: compact ? 28 : 24,
    minWidth: compact ? 28 : undefined,
    padding: compact ? 0 : theme.spacing(0, 3, 0, 2),
    background: "transparent",
    border: "1px solid transparent",
    color: theme.vars.palette.text.secondary,
    cursor: "pointer",
    fontSize: theme.fontSizeSmall,
    fontWeight: 500,
    letterSpacing: "0.01em",
    fontFamily: theme.typography.fontFamily,
    borderRadius: BORDER_RADIUS.md,
    transition: `${MOTION.background}, color ${MOTION.fast}, ${MOTION.border}`,
    "&:hover": {
      backgroundColor: theme.vars.palette.action.hover,
      color: theme.vars.palette.text.primary,
      borderColor: theme.vars.palette.divider
    },
    "& svg": {
      fontSize: compact ? 18 : 14
    }
  });

interface TrackTypeOption {
  type: TimelineTrack["type"];
  labelKey: string;
  icon: React.ReactNode;
}

const TRACK_TYPES: TrackTypeOption[] = [
  {
    type: "video",
    labelKey: "timeline:tracks.video",
    icon: <VideocamOutlinedIcon fontSize="small" />
  },
  {
    type: "audio",
    labelKey: "timeline:tracks.audio",
    icon: <AudiotrackOutlinedIcon fontSize="small" />
  },
  {
    type: "overlay",
    labelKey: "timeline:tracks.overlay",
    icon: <LayersOutlinedIcon fontSize="small" />
  },
  {
    type: "subtitle",
    labelKey: "timeline:tracks.subtitle",
    icon: <SubtitlesOutlinedIcon fontSize="small" />
  }
];

export interface AddTrackButtonProps {
  /** Phone toolbar: drop the "Track" label, keep the icon and a 28px target. */
  compact?: boolean;
}

export const AddTrackButton: React.FC<AddTrackButtonProps> = memo(({ compact = false }) => {
  const theme = useTheme();
  const { t } = useTranslation(["timeline"]);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelect = useCallback(
    (type: TimelineTrack["type"]) => {
      addTrack(type);
      setAnchorEl(null);
    },
    [addTrack]
  );

  return (
    <>
      <button
        type="button"
        css={buttonStyles(theme, compact)}
        onClick={handleOpen}
        aria-label={t("timeline:tracks.addTrack")}
        title={t("timeline:tracks.addTrack")}
        aria-haspopup="menu"
        data-testid="add-track-button"
      >
        <AddIcon />
        {!compact && <span>{t("timeline:tracks.track")}</span>}
      </button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        placement="bottom-left"
      >
        {TRACK_TYPES.map((opt) => (
          <MenuItemPrimitive
            key={opt.type}
            label={t(opt.labelKey)}
            icon={opt.icon}
            onClick={() => handleSelect(opt.type)}
          />
        ))}
      </Popover>
    </>
  );
});

AddTrackButton.displayName = "AddTrackButton";
