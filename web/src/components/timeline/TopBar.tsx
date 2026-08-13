/** @jsxImportSource @emotion/react */
/**
 * TopBar — Timeline Editor top bar.
 *
 * A single generation prompt bar (model + output settings + Generate) that
 * grows to fill, with Save / Export and an activity slot on the right. The
 * project name lives in the workspace tab, so it isn't repeated here.
 *
 * On phones the four labelled actions won't fit beside the prompt, so they
 * collapse into one overflow menu and the prompt takes the width it needs
 * (see `TopBarPrompt`'s `compact` layout).
 */

import React, { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { css } from "@emotion/react";
import type { Theme } from "@mui/material/styles";
import {
  FlexRow,
  EditorButton,
  EditorMenu,
  MenuItemPrimitive,
  ToolbarIconButton,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SaveIcon from "@mui/icons-material/Save";
import TuneIcon from "@mui/icons-material/Tune";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";

import { TopBarPrompt } from "./TopBarPrompt";
import { useTimelineIsMobile } from "../../hooks/timeline/useTimelineIsMobile";

const styles = (theme: Theme, compact: boolean) =>
  css({
    // Phones need two rows for the prompt + chip rail; let the bar size to it.
    height: compact ? "auto" : 48,
    minHeight: compact ? 48 : undefined,
    borderBottom: `1px solid ${theme.vars.palette.divider}`,
    backgroundColor: theme.vars.palette.background.paper,
    padding: compact
      ? `${getSpacingPx(SPACING.sm)} ${getSpacingPx(SPACING.md)}`
      : `0 ${theme.spacing(1.5)}`,
    flexShrink: 0
  });

export interface TopBarProps {
  /** Called when the user clicks Export (renders the timeline to a video file) */
  onExportVideo?: () => void;
  /** True while an export render is in progress. */
  isExporting?: boolean;
  /** Called when the user clicks Save (force-persists the current document) */
  onSave?: () => void;
  /** True while a manual save is in flight. */
  isSaving?: boolean;
  /**
   * Called when the user clicks "Save as Asset" — receives the button element
   * to anchor the folder-chooser popover to. Renders the timeline to a video
   * and saves it as an asset in the chosen folder.
   */
  onSaveToAssets?: (anchorEl: HTMLElement) => void;
  /** Called when the user opens the project settings (canvas size + fps). */
  onOpenSettings?: () => void;
  /** Optional slot for an activity indicator (NOD-311) */
  activitySlot?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = memo(
  ({
    onExportVideo,
    isExporting = false,
    onSave,
    isSaving = false,
    onSaveToAssets,
    onOpenSettings,
    activitySlot
  }) => {
    const theme = useTheme();
    const isMobile = useTimelineIsMobile();
    const { t } = useTranslation(["timeline"]);
    const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(
      null
    );
    const closeOverflow = useCallback(() => setOverflowAnchor(null), []);

    // "Save as Asset" anchors a folder popover to whatever element was clicked.
    // From the overflow menu that element is the menu item, which unmounts on
    // close — so anchor the popover to the overflow button instead.
    const overflowButtonRef = React.useRef<HTMLButtonElement>(null);
    const runFromMenu = useCallback(
      (action: () => void) => () => {
        closeOverflow();
        action();
      },
      [closeOverflow]
    );

    if (isMobile) {
      const { t } = useTranslation("timeline");
      const hasActions =
        !!onOpenSettings || !!onSave || !!onSaveToAssets || !!onExportVideo;
      return (
        <FlexRow align="flex-start" gap={SPACING.sm} fullWidth css={styles(theme, true)}>
          <TopBarPrompt compact />
          {activitySlot}
          {hasActions && (
            <>
              <ToolbarIconButton
                ref={overflowButtonRef}
                onClick={(e) => setOverflowAnchor(e.currentTarget)}
                tooltip={t("timeline:topBar.moreActions")}
                aria-label={t("timeline:topBar.moreActions")}
                sx={{ flexShrink: 0 }}
              >
                <MoreVertIcon fontSize="small" />
              </ToolbarIconButton>
              <EditorMenu
                anchorEl={overflowAnchor}
                open={!!overflowAnchor}
                onClose={closeOverflow}
              >
                {onOpenSettings && (
                  <MenuItemPrimitive
                    icon={<TuneIcon fontSize="small" />}
                    label={t("timeline:topBar.projectSettings")}
                    onClick={runFromMenu(onOpenSettings)}
                  />
                )}
                {onSave && (
                  <MenuItemPrimitive
                    icon={<SaveIcon fontSize="small" />}
                    label={isSaving ? t("timeline:topBar.saving") : t("timeline:topBar.save")}
                    disabled={isSaving}
                    onClick={runFromMenu(onSave)}
                  />
                )}
                {onSaveToAssets && (
                  <MenuItemPrimitive
                    icon={<VideoLibraryOutlinedIcon fontSize="small" />}
                    label={t("timeline:topBar.saveAsAsset")}
                    disabled={isExporting}
                    onClick={runFromMenu(() => {
                      const anchor = overflowButtonRef.current;
                      if (anchor) onSaveToAssets(anchor);
                    })}
                  />
                )}
                {onExportVideo && (
                  <MenuItemPrimitive
                    icon={<FileDownloadIcon fontSize="small" />}
                    label={isExporting ? t("timeline:topBar.exporting") : t("timeline:topBar.exportVideo")}
                    disabled={isExporting}
                    onClick={runFromMenu(onExportVideo)}
                  />
                )}
              </EditorMenu>
            </>
          )}
        </FlexRow>
      );
    }

    return (
      <FlexRow align="center" gap={1} fullWidth css={styles(theme, false)}>
        {/* Quick-prompt generation bar — grows to fill */}
        <TopBarPrompt />

        {/* Right: activity slot + settings / save / export */}
        {activitySlot}

        {onOpenSettings && (
          <EditorButton
            variant="outlined"
            onClick={onOpenSettings}
            startIcon={<TuneIcon />}
            size="small"
            aria-label={t("timeline:topBar.projectSettings")}
          >
            {t("timeline:topBar.settings")}
          </EditorButton>
        )}

        {onSave && (
          <EditorButton
            variant="outlined"
            onClick={onSave}
            disabled={isSaving}
            startIcon={<SaveIcon />}
            size="small"
          >
            {isSaving ? t("timeline:topBar.saving") : t("timeline:topBar.save")}
          </EditorButton>
        )}

        {onSaveToAssets && (
          <EditorButton
            variant="outlined"
            onClick={(e) => onSaveToAssets(e.currentTarget)}
            disabled={isExporting}
            startIcon={<VideoLibraryOutlinedIcon />}
            size="small"
          >
            {t("timeline:topBar.saveAsAsset")}
          </EditorButton>
        )}

        {onExportVideo && (
          <EditorButton
            variant="outlined"
            onClick={onExportVideo}
            disabled={isExporting}
            startIcon={<FileDownloadIcon />}
            size="small"
          >
            {isExporting ? t("timeline:topBar.exporting") : t("timeline:topBar.export")}
          </EditorButton>
        )}
      </FlexRow>
    );
  }
);

TopBar.displayName = "TopBar";

export default TopBar;
