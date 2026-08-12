/** @jsxImportSource @emotion/react */
/**
 * ConsolePanel — collapsible view of the live conda/uv/npm output streamed from
 * the desktop app during package install/uninstall.
 */
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  BORDER_RADIUS,
  EditorButton,
  FlexColumn,
  FlexRow
} from "../ui_primitives";

const consoleStyles = (theme: Theme) =>
  css({
    fontFamily: theme.fontFamily2,
    fontSize: theme.fontSizeSmaller,
    color: theme.vars.palette.text.secondary,
    backgroundColor: theme.vars.palette.action.hover,
    border: `1px solid ${theme.vars.palette.divider}`,
    borderRadius: BORDER_RADIUS.xs,
    padding: "0.75em",
    margin: 0,
    maxHeight: "220px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  });

interface ConsolePanelProps {
  lines: string[];
  onClear: () => void;
  /** Reveal the console when an install/uninstall is in flight. */
  busy?: boolean;
}

const ConsolePanel = ({ lines, onClear, busy = false }: ConsolePanelProps) => {
  const { t } = useTranslation("packages");
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Auto-open when an operation begins so its live output is visible without a
  // manual toggle; the user can still hide it mid-run.
  useEffect(() => {
    if (busy) setOpen(true);
  }, [busy]);

  // Follow the tail as new lines stream in while the console is open.
  useEffect(() => {
    if (!open) return;
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, lines]);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(lines.join("\n")).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  };

  return (
    <FlexColumn gap={1}>
      <FlexRow gap={1.5} align="center" justify="space-between">
        <EditorButton
          variant="text"
          density="compact"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? t("button.hideConsole") : t("button.showConsole")}
          {lines.length > 0 ? ` (${lines.length})` : ""}
        </EditorButton>
        {open && lines.length > 0 && (
          <FlexRow gap={0.5} align="center">
            <EditorButton variant="text" density="compact" onClick={handleCopy}>
              {copied ? t("button.copied") : t("button.copy")}
            </EditorButton>
            <EditorButton variant="text" density="compact" onClick={onClear}>
              {t("button.clear")}
            </EditorButton>
          </FlexRow>
        )}
      </FlexRow>
      {open && (
        <pre ref={preRef} css={consoleStyles(theme)}>
          {lines.length > 0 ? lines.join("\n") : t("console.empty")}
        </pre>
      )}
    </FlexColumn>
  );
};

export default memo(ConsolePanel);
