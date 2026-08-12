/** @jsxImportSource @emotion/react */
/**
 * TimelineVersionHistoryPanel
 *
 * Version history for the open timeline sequence, mounted as the "History" tab
 * of the editor's inspector region (alongside Inspector and Assistant).
 *
 * Lists snapshots newest first with their save type, name, age, and canvas
 * settings, and offers three actions: save a manual snapshot, restore one, and
 * delete one. Restoring rewrites the sequence server-side (after snapshotting
 * what it overwrites), so it also reloads the editor's store from the response
 * — see `applyTimelineSequenceToStore`.
 *
 * Deliberately no diff/compare view: a timeline document has no useful textual
 * diff, and the metadata plus a restore is what the history is for.
 */

import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import React, { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTimelineStoreApi } from "../../stores/timeline/TimelineStore";
import { applyTimelineSequenceToStore } from "../../hooks/timeline/useLoadTimelineIntoStore";
import {
  useTimelineVersions,
  type TimelineVersionListItem,
  type TimelineVersionSaveType
} from "../../serverState/useTimelineVersions";
import { relativeTime } from "../../utils/formatDateAndTime";
import { notifyMutationError } from "../../utils/notifyMutationError";
import PanelToolbar from "../panels/PanelToolbar";
import {
  Caption,
  Chip,
  Dialog,
  EditorButton,
  EmptyState,
  FlexColumn,
  FlexRow,
  LoadingSpinner,
  ScrollArea,
  Text,
  TextInput,
  BORDER_RADIUS,
  MOTION,
  SPACING,
  getSpacingPx
} from "../ui_primitives";

const SAVE_TYPE_LABEL_KEY: Record<TimelineVersionSaveType, string> = {
  manual: "timeline:versionHistory.manual",
  autosave: "timeline:versionHistory.auto",
  restore: "timeline:versionHistory.restoreType"
};

const SAVE_TYPE_COLOR: Record<
  TimelineVersionSaveType,
  "primary" | "default" | "info"
> = {
  manual: "primary",
  autosave: "default",
  restore: "info"
};

const listStyles = (theme: Theme) =>
  css({
    ".version-row": {
      padding: `${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.lg)}`,
      borderBottom: `1px solid ${theme.vars.palette.divider}`,
      transition: MOTION.background,
      "&:hover": {
        backgroundColor: theme.vars.palette.action.hover
      },
      "&:hover .version-actions, &:focus-within .version-actions": {
        opacity: 1
      }
    },
    ".version-actions": {
      opacity: 0,
      transition: MOTION.fast,
      borderRadius: BORDER_RADIUS.sm
    }
  });

interface VersionRowProps {
  version: TimelineVersionListItem;
  busy: boolean;
  onRestore: (version: TimelineVersionListItem) => void;
  onDelete: (version: TimelineVersionListItem) => void;
}

const VersionRow: React.FC<VersionRowProps> = memo(
  ({ version, busy, onRestore, onDelete }) => {
    const { t } = useTranslation(["timeline"]);
    const handleRestore = useCallback(
      () => onRestore(version),
      [onRestore, version]
    );
    const handleDelete = useCallback(
      () => onDelete(version),
      [onDelete, version]
    );

    return (
      <FlexColumn className="version-row" gap={0.5} fullWidth>
        <FlexRow gap={1} align="center" fullWidth>
          <Text size="small" weight={600}>
            v{version.version}
          </Text>
          <Chip
            label={t(SAVE_TYPE_LABEL_KEY[version.saveType])}
            color={SAVE_TYPE_COLOR[version.saveType]}
            compact
            size="small"
          />
          {version.name ? (
            <Text size="small" color="secondary">
              {version.name}
            </Text>
          ) : null}
          <FlexRow
            className="version-actions"
            gap={0.5}
            align="center"
            sx={{ marginLeft: "auto" }}
          >
            <EditorButton
              density="compact"
              variant="text"
              disabled={busy}
              onClick={handleRestore}
              aria-label={t("timeline:versionHistory.restoreVersion", { version: version.version })}
            >
              {t("timeline:versionHistory.restore")}
            </EditorButton>
            <EditorButton
              density="compact"
              variant="text"
              disabled={busy}
              onClick={handleDelete}
              aria-label={t("timeline:versionHistory.deleteVersion", { version: version.version })}
              sx={{ color: "text.secondary" }}
            >
              {t("timeline:versionHistory.delete")}
            </EditorButton>
          </FlexRow>
        </FlexRow>
        <Caption size="smaller" color="muted">
          {relativeTime(version.createdAt)}
          {" · "}
          {new Date(version.createdAt).toLocaleString()}
          {" · "}
          {version.width}×{version.height} @ {version.fps}fps
        </Caption>
      </FlexColumn>
    );
  }
);
VersionRow.displayName = "VersionRow";

export interface TimelineVersionHistoryPanelProps {
  /** Sequence whose history is shown. */
  sequenceId: string | null | undefined;
}

export const TimelineVersionHistoryPanel: React.FC<
  TimelineVersionHistoryPanelProps
> = ({ sequenceId }) => {
  const theme = useTheme();
  const { t } = useTranslation(["timeline"]);
  const store = useTimelineStoreApi();
  const {
    versions,
    isLoading,
    error,
    createVersion,
    restoreVersion,
    deleteVersion,
    isCreatingVersion,
    isRestoringVersion,
    isDeletingVersion
  } = useTimelineVersions(sequenceId);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [restoreTarget, setRestoreTarget] =
    useState<TimelineVersionListItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<TimelineVersionListItem | null>(null);

  const busy = isRestoringVersion || isDeletingVersion;

  const openSaveDialog = useCallback(() => {
    setSaveName("");
    setSaveDialogOpen(true);
  }, []);
  const closeSaveDialog = useCallback(() => setSaveDialogOpen(false), []);

  const handleSaveNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setSaveName(event.target.value),
    []
  );

  const handleConfirmSave = useCallback(async () => {
    setSaveDialogOpen(false);
    try {
      await createVersion(saveName);
    } catch (err) {
      notifyMutationError("save a version", err);
    }
  }, [createVersion, saveName]);

  const handleConfirmRestore = useCallback(async () => {
    const target = restoreTarget;
    setRestoreTarget(null);
    if (!target) return;
    try {
      const restored = await restoreVersion(target.version);
      // The editor holds the pre-restore document in memory and autosaves it
      // 750 ms after any change; without this the next flush would PATCH the
      // stale state straight back over the restore.
      applyTimelineSequenceToStore(store, restored);
    } catch (err) {
      notifyMutationError("restore that version", err);
    }
  }, [restoreTarget, restoreVersion, store]);

  const handleConfirmDelete = useCallback(async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteVersion(target.version);
    } catch (err) {
      notifyMutationError("delete that version", err);
    }
  }, [deleteTarget, deleteVersion]);

  const clearRestoreTarget = useCallback(() => setRestoreTarget(null), []);
  const clearDeleteTarget = useCallback(() => setDeleteTarget(null), []);

  // Newest first. The server orders by version already; sorting here keeps the
  // panel correct regardless of the order it is handed.
  const ordered = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions]
  );

  const toolbarActions = useMemo(
    () => (
      <EditorButton
        density="compact"
        variant="contained"
        onClick={openSaveDialog}
        disabled={!sequenceId || isCreatingVersion}
      >
        {isCreatingVersion ? t("timeline:versionHistory.saving") : t("timeline:versionHistory.saveVersion")}
      </EditorButton>
    ),
    [openSaveDialog, sequenceId, isCreatingVersion, t]
  );

  return (
    <FlexColumn fullWidth fullHeight sx={{ minHeight: 0, overflow: "hidden" }}>
      <PanelToolbar
        title={t("timeline:versionHistory.history")}
        count={ordered.length}
        actions={toolbarActions}
      />

      <ScrollArea css={listStyles(theme)} sx={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <FlexColumn align="center" justify="center" sx={{ py: 4 }}>
            <LoadingSpinner size="small" text={t("timeline:versionHistory.loading")} />
          </FlexColumn>
        ) : error ? (
          <FlexColumn gap={0.5} sx={{ p: 2 }}>
            <Text color="error">{t("timeline:versionHistory.loadFailed")}</Text>
            <Caption size="smaller" color="secondary">
              {error instanceof Error ? error.message : String(error)}
            </Caption>
          </FlexColumn>
        ) : ordered.length === 0 ? (
          <FlexColumn align="center" sx={{ py: 4, px: 2 }}>
            <EmptyState
              title={t("timeline:versionHistory.noVersions")}
              description={t("timeline:versionHistory.noVersionsHint")}
            />
          </FlexColumn>
        ) : (
          ordered.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              busy={busy}
              onRestore={setRestoreTarget}
              onDelete={setDeleteTarget}
            />
          ))
        )}
      </ScrollArea>

      <Dialog
        open={saveDialogOpen}
        onClose={closeSaveDialog}
        title={t("timeline:versionHistory.saveDialogTitle")}
        onConfirm={handleConfirmSave}
        onCancel={closeSaveDialog}
        confirmText={t("timeline:versionHistory.saveVersion")}
      >
        <FlexColumn gap={1} sx={{ minWidth: 320, py: 1 }}>
          <TextInput
            label={t("timeline:versionHistory.saveDialogName")}
            value={saveName}
            onChange={handleSaveNameChange}
            size="small"
            autoFocus
          />
          <Caption size="smaller" color="secondary">
            {t("timeline:versionHistory.saveDialogHint")}
          </Caption>
        </FlexColumn>
      </Dialog>

      <Dialog
        open={restoreTarget !== null}
        onClose={clearRestoreTarget}
        title={
          restoreTarget
            ? t("timeline:versionHistory.restoreTitle", { version: restoreTarget.version })
            : t("timeline:versionHistory.restoreTitleShort")
        }
        onConfirm={handleConfirmRestore}
        onCancel={clearRestoreTarget}
        confirmText={t("timeline:versionHistory.restore")}
      >
        <FlexColumn gap={1} sx={{ maxWidth: 420 }}>
          <Text color="secondary">
            {t("timeline:versionHistory.restoreHint")}
          </Text>
          <Caption size="smaller" color="muted">
            {t("timeline:versionHistory.restoreSnapshotNote")}
          </Caption>
        </FlexColumn>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={clearDeleteTarget}
        title={
          deleteTarget
            ? t("timeline:versionHistory.deleteTitle", { version: deleteTarget.version })
            : t("timeline:versionHistory.deleteTitleShort")
        }
        onConfirm={handleConfirmDelete}
        onCancel={clearDeleteTarget}
        confirmText={t("timeline:versionHistory.delete")}
        destructive
      >
        <Text color="secondary">{t("timeline:versionHistory.deleteHint")}</Text>
      </Dialog>
    </FlexColumn>
  );
};

TimelineVersionHistoryPanel.displayName = "TimelineVersionHistoryPanel";

export default memo(TimelineVersionHistoryPanel);
