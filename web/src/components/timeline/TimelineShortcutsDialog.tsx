/** @jsxImportSource @emotion/react */
/**
 * TimelineShortcutsDialog — a reference sheet for every timeline keyboard
 * shortcut, grouped by task. Opened with `?` (or the toolbar help button) and
 * closed with Escape / the close button.
 *
 * The shortcut set is authored here to match the window-level handler in
 * TracksRegion; keep the two in sync when adding a shortcut.
 */
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

import {
  Dialog,
  FlexColumn,
  FlexRow,
  ShortcutHint,
  Text,
  Caption,
  SPACING,
  getSpacingPx
} from "../ui_primitives";

interface Shortcut {
  keys: string[];
  actionKey: string;
  /** Alternate binding shown after the primary one (e.g. "or Backspace"). */
  alt?: string[];
}

interface ShortcutGroup {
  titleKey: string;
  shortcuts: Shortcut[];
}

/**
 * Mirrors the bindings registered in TracksRegion's window keydown handler,
 * which fire on `ctrlKey || metaKey`. We label those keys "Ctrl" — rendered
 * verbatim by ShortcutHint on every platform — since the sheet is shared
 * across macOS and Windows/Linux and a single label keeps it compact.
 */
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: "timeline:shortcuts.tools",
    shortcuts: [
      { keys: ["V"], actionKey: "timeline:shortcuts.selectTool" },
      { keys: ["C"], actionKey: "timeline:shortcuts.cutTool" },
      { keys: ["Esc"], actionKey: "timeline:shortcuts.clearSelection" }
    ]
  },
  {
    titleKey: "timeline:shortcuts.editing",
    shortcuts: [
      { keys: ["S"], actionKey: "timeline:shortcuts.splitAtPlayhead" },
      { keys: ["Delete"], actionKey: "timeline:shortcuts.deleteSelected", alt: ["Backspace"] },
      { keys: ["Ctrl", "D"], actionKey: "timeline:shortcuts.duplicate" },
      { keys: ["Ctrl", "Shift", "D"], actionKey: "timeline:shortcuts.duplicateGap" },
      { keys: ["Ctrl", "A"], actionKey: "timeline:shortcuts.selectAll" }
    ]
  },
  {
    titleKey: "timeline:shortcuts.clipboard",
    shortcuts: [
      { keys: ["Ctrl", "C"], actionKey: "timeline:shortcuts.copy" },
      { keys: ["Ctrl", "X"], actionKey: "timeline:shortcuts.cut" },
      { keys: ["Ctrl", "V"], actionKey: "timeline:shortcuts.paste" }
    ]
  },
  {
    titleKey: "timeline:shortcuts.move",
    shortcuts: [
      { keys: ["←"], actionKey: "timeline:shortcuts.nudgeFrame", alt: ["→"] },
      { keys: ["Shift", "←"], actionKey: "timeline:shortcuts.nudgeSecond", alt: ["Shift", "→"] }
    ]
  },
  {
    titleKey: "timeline:shortcuts.zoomView",
    shortcuts: [
      { keys: ["+"], actionKey: "timeline:shortcuts.zoomIn", alt: ["="] },
      { keys: ["-"], actionKey: "timeline:shortcuts.zoomOut", alt: ["_"] },
      { keys: ["Shift", "Z"], actionKey: "timeline:shortcuts.zoomFit" }
    ]
  },
  {
    titleKey: "timeline:shortcuts.history",
    shortcuts: [
      { keys: ["Ctrl", "Z"], actionKey: "timeline:shortcuts.undo" },
      { keys: ["Ctrl", "Shift", "Z"], actionKey: "timeline:shortcuts.redo", alt: ["Ctrl", "Y"] }
    ]
  }
];

const groupStyles = css({
  minWidth: 0
});

const rowStyles = (theme: Theme) =>
  css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: getSpacingPx(SPACING.lg),
    padding: `${getSpacingPx(SPACING.xs)} 0`,
    borderBottom: `1px solid ${theme.vars.palette.divider}`,
    "&:last-of-type": { borderBottom: "none" }
  });

const groupTitleSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600
} as const;

const keysCellStyles = css({
  display: "flex",
  alignItems: "center",
  gap: getSpacingPx(SPACING.xs),
  flexShrink: 0
});

const ShortcutRow: React.FC<{ shortcut: Shortcut; action: string; orLabel: string }> = ({ shortcut, action, orLabel }) => {
  const theme = useTheme();
  return (
    <div css={rowStyles(theme)}>
      <Text size="small" sx={{ minWidth: 0 }}>
        {action}
      </Text>
      <div css={keysCellStyles}>
        <ShortcutHint shortcut={shortcut.keys} />
        {shortcut.alt ? (
          <>
            <Caption sx={{ opacity: 0.6 }}>{orLabel}</Caption>
            <ShortcutHint shortcut={shortcut.alt} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export interface TimelineShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Two-column masonry of grouped shortcut rows inside a standard Dialog. */
export const TimelineShortcutsDialog: React.FC<TimelineShortcutsDialogProps> =
  memo(({ open, onClose }) => {
    const theme = useTheme();
    const { t } = useTranslation(["timeline"]);
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={t("timeline:shortcuts.title")}
        minWidth="min(680px, 100vw - 32px)"
      >
        <div
          css={css({
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: getSpacingPx(SPACING.xl),
            paddingTop: getSpacingPx(SPACING.sm),
            "@media (max-width: 560px)": { gridTemplateColumns: "1fr" }
          })}
        >
          {SHORTCUT_GROUPS.map((group) => (
            <FlexColumn key={group.titleKey} gap={0.5} css={groupStyles}>
              <Caption sx={groupTitleSx}>{t(group.titleKey)}</Caption>
              {group.shortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.actionKey}
                  shortcut={shortcut}
                  action={t(shortcut.actionKey)}
                  orLabel={t("timeline:shortcuts.or")}
                />
              ))}
            </FlexColumn>
          ))}
        </div>
        <FlexRow
          justify="center"
          align="center"
          gap={0.5}
          sx={{ pt: 2, mt: 1, borderTop: `1px solid ${theme.vars.palette.divider}` }}
        >
          <Caption sx={{ opacity: 0.7 }}>{t("timeline:shortcuts.press")}</Caption>
          <ShortcutHint shortcut={["?"]} />
          <Caption sx={{ opacity: 0.7 }}>{t("timeline:shortcuts.toggleHint")}</Caption>
        </FlexRow>
      </Dialog>
    );
  });

TimelineShortcutsDialog.displayName = "TimelineShortcutsDialog";

export default TimelineShortcutsDialog;
