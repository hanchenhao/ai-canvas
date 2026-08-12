/** @jsxImportSource @emotion/react */
import { memo, useCallback, useState, type FC } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { AlertBanner, Text, FlexRow, EditorButton } from "../../ui_primitives";
import { getIsElectronDetails } from "../../../utils/browser";
import { useOpenPackageManager } from "../../../hooks/useOpenPackageManager";

/**
 * Detect the cryptic "claude CLI not found" error thrown by the Claude Agent
 * provider when the Claude Code CLI is not installed on the machine. The
 * provider message looks like:
 *   `claude CLI not found (looked for "claude"). Install @anthropic-ai/claude-code …`
 */
export const isClaudeCodeMissingError = (error: string): boolean => {
  const lower = error.toLowerCase();
  return (
    lower.includes("claude cli not found") ||
    lower.includes("@anthropic-ai/claude-code")
  );
};

const CLAUDE_PACKAGE_ID = "claude";

interface ChatErrorBannerProps {
  error: string;
  /** Called when the user dismisses the banner. */
  onClose?: () => void;
  /** Called to retry the failed action (e.g. reconnect, re-send). */
  onRetry?: () => void;
  /** Label for the retry action; omit to hide the generic retry button. */
  retryLabel?: string;
  className?: string;
  sx?: SxProps<Theme>;
}

/** Renders a friendly prompt with a one-click install when Claude Code is missing. */
const ClaudeCodeInstallPrompt: FC<{ onInstalled?: () => void }> = ({
  onInstalled
}) => {
  const { isElectron } = getIsElectronDetails();
  const { t } = useTranslation("chat");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const openPackageManager = useOpenPackageManager();

  const handleInstall = useCallback(async () => {
    const api = window.api;
    if (!api?.packages?.installRuntime) {
      openPackageManager();
      return;
    }
    setInstalling(true);
    setInstallError(null);
    try {
      const result = await api.packages.installRuntime(CLAUDE_PACKAGE_ID);
      if (result.success) {
        setInstalled(true);
        onInstalled?.();
      } else {
        setInstallError(result.message || t("chat:error.installFailed"));
      }
    } catch (err) {
      setInstallError(
        err instanceof Error ? err.message : t("chat:error.installFailed")
      );
      // Fall back to the package manager UI so the user can retry manually.
      openPackageManager();
    } finally {
      setInstalling(false);
    }
  }, [onInstalled, openPackageManager, t]);

  if (installed) {
    return (
      <Text size="small" component="span">
        {t("chat:error.claudeCodeInstalled")}
      </Text>
    );
  }

  return (
    <FlexRow gap={1} align="center" wrap>
      <Text size="small" component="span">
        {t("chat:error.claudeCodeNotInstalled")}
      </Text>
      {isElectron ? (
        <EditorButton
          variant="outlined"
          onClick={handleInstall}
          disabled={installing}
          sx={{ ml: "auto", whiteSpace: "nowrap" }}
        >
          {installing ? t("chat:error.installing") : t("chat:error.installClaudeCode")}
        </EditorButton>
      ) : (
        <Text size="small" component="span">
          {t("chat:error.installCommand")}{" "}
          <code>npm install -g @anthropic-ai/claude-code</code>{" "}
          {t("chat:error.installCommandHint")}
        </Text>
      )}
      {installError && (
        <Text size="small" component="span" sx={{ width: "100%" }}>
          {installError}
        </Text>
      )}
    </FlexRow>
  );
};

/**
 * Error banner for chat surfaces. When the error indicates Claude Code is
 * missing it offers a one-click install (via the Electron runtime-package IPC);
 * otherwise it shows the raw error with an optional retry action.
 */
const ChatErrorBanner: FC<ChatErrorBannerProps> = ({
  error,
  onClose,
  onRetry,
  retryLabel,
  className,
  sx
}) => {
  const claudeMissing = isClaudeCodeMissingError(error);

  return (
    <AlertBanner
      className={className}
      severity="error"
      onClose={onClose}
      sx={sx}
    >
      {claudeMissing ? (
        <ClaudeCodeInstallPrompt onInstalled={onRetry} />
      ) : (
        <FlexRow gap={1} align="center" wrap>
          <Text size="small" component="span">
            {error}
          </Text>
          {onRetry && retryLabel && (
            <EditorButton
              variant="outlined"
              onClick={onRetry}
              sx={{ ml: "auto", whiteSpace: "nowrap" }}
            >
              {retryLabel}
            </EditorButton>
          )}
        </FlexRow>
      )}
    </AlertBanner>
  );
};

export default memo(ChatErrorBanner);
