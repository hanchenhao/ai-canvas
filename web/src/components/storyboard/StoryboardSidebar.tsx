/** @jsxImportSource @emotion/react */
/**
 * StoryboardSidebar
 *
 * Lists the user's server-persisted storyboards, newest first. Clicking a
 * board opens/focuses its workspace tab; hovering exposes a delete. Boards
 * autosave (see useStoryboardServerSync), so this doubles as the
 * "recent work" view.
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import {
  FlexColumn,
  FlexRow,
  Text,
  Caption,
  Dialog,
  ToolbarIconButton,
  LoadingSpinner,
  SPACING,
  getSpacingPx,
  BORDER_RADIUS,
  MOTION
} from "../ui_primitives";
import {
  useStoryboards,
  useCreateStoryboard,
  useDeleteStoryboard
} from "../../hooks/storyboard/useStoryboards";
import { useStoryboardStore } from "../../stores/storyboard/StoryboardStore";
import { tabId, useWorkspaceTabsStore } from "../../stores/WorkspaceTabsStore";
import { notifyMutationError } from "../../utils/notifyMutationError";

interface StoryboardSidebarProps {
  /** Board shown in the surface this sidebar belongs to. */
  activeBoardId: string;
}

const styles = (theme: Theme) =>
  css({
    width: "220px",
    flexShrink: 0,
    height: "100%",
    overflowY: "auto",
    borderRight: `1px solid ${theme.vars.palette.divider}`,
    // On phones the sidebar is a full-width pane behind a segmented switcher
    // (see StoryboardSurface), not a fixed rail beside the board.
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      borderRight: "none"
    },
    padding: getSpacingPx(SPACING.md),
    display: "flex",
    flexDirection: "column",
    gap: getSpacingPx(SPACING.md),
    ".sidebar-title": {
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: theme.vars.palette.text.disabled
    },
    ".board-row": {
      padding: `${getSpacingPx(SPACING.sm)} ${getSpacingPx(SPACING.md)}`,
      borderRadius: BORDER_RADIUS.md,
      cursor: "pointer",
      "&:hover": { backgroundColor: theme.vars.palette.action.hover },
      "&.active": { backgroundColor: theme.vars.palette.action.selected },
      ".delete-button": { opacity: 0, transition: MOTION.opacity },
      "&:hover .delete-button": { opacity: 1 },
      // Touch devices have no hover; keep the delete affordance reachable.
      "@media (pointer: coarse)": {
        ".delete-button": { opacity: 1 }
      }
    }
  });

const StoryboardSidebarInner: React.FC<StoryboardSidebarProps> = ({
  activeBoardId
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["storyboard"]);
  const { data: boards, isLoading } = useStoryboards();
  const createStoryboard = useCreateStoryboard();
  const deleteStoryboard = useDeleteStoryboard();
  const removeLocalBoard = useStoryboardStore((state) => state.removeBoard);
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const closeTab = useWorkspaceTabsStore((state) => state.closeTab);

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const openBoard = useCallback(
    (id: string, title: string) => {
      openTab({
        type: "storyboard",
        ref: id,
        mode: "edit",
        title: title || t("storyboard:list.untitledStoryboard")
      });
    },
    [openTab, t]
  );

  const newBoard = useCallback(async () => {
    try {
      const created = await createStoryboard.mutateAsync({
        name: t("storyboard:list.untitledStoryboard"),
        projectId: "default"
      });
      openBoard(created.id, created.name);
    } catch (error) {
      notifyMutationError("create the storyboard", error);
    }
  }, [createStoryboard, openBoard, t]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) {
      return;
    }
    const { id } = pendingDelete;
    deleteStoryboard.mutate({ id });
    removeLocalBoard(id);
    closeTab(tabId("storyboard", id));
    setPendingDelete(null);
  }, [pendingDelete, deleteStoryboard, removeLocalBoard, closeTab]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
    []
  );

  return (
    <div css={styles(theme)} className="storyboard-sidebar">
      <FlexRow align="center" justify="space-between">
        <Text size="smaller" className="sidebar-title">
          {t("storyboard:list.newStoryboard")}
        </Text>
        <ToolbarIconButton
          icon={<AddRoundedIcon fontSize="small" />}
          tooltip={t("storyboard:list.newStoryboard")}
          onClick={() => void newBoard()}
        />
      </FlexRow>

      {isLoading ? (
        <LoadingSpinner size={20} />
      ) : (
        <FlexColumn gap={0.5} role="listbox" aria-label="Storyboards">
          {(boards ?? []).map((board) => (
            <FlexRow
              key={board.id}
              align="center"
              justify="space-between"
              gap={1}
              className={`board-row${board.id === activeBoardId ? " active" : ""}`}
              role="option"
              aria-selected={board.id === activeBoardId}
              tabIndex={0}
              onClick={() => openBoard(board.id, board.name)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openBoard(board.id, board.name);
                }
              }}
            >
              <FlexColumn gap={0} sx={{ minWidth: 0 }}>
                <Text size="small" truncate>
                  {board.name || t("storyboard:list.untitledStoryboard")}
                </Text>
                <Caption size="smaller" color="secondary">
                  {board.shotCount > 0
                    ? `${board.shotCount} shots · ${formatter.format(new Date(board.updatedAt))}`
                    : formatter.format(new Date(board.updatedAt))}
                </Caption>
              </FlexColumn>
              <ToolbarIconButton
                className="delete-button"
                icon={<DeleteOutlineRoundedIcon fontSize="small" />}
                tooltip={t("storyboard:list.deleteTitle")}
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete({
                    id: board.id,
                    name: board.name || t("storyboard:list.untitledStoryboard")
                  });
                }}
              />
            </FlexRow>
          ))}
          {(boards ?? []).length === 0 && (
            <Caption size="smaller" color="secondary">
              {t("storyboard:list.empty")}
            </Caption>
          )}
        </FlexColumn>
      )}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t("storyboard:list.deleteTitle")}
        onConfirm={confirmDelete}
        confirmText={t("storyboard:list.delete")}
        destructive
      >
        <Text size="small">
          {t("storyboard:list.deleteConfirm", { name: pendingDelete?.name ?? "" })}
        </Text>
      </Dialog>
    </div>
  );
};

const StoryboardSidebar = memo(StoryboardSidebarInner);
export default StoryboardSidebar;
