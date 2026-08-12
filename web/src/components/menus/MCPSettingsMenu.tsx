/** @jsxImportSource @emotion/react */
import { memo, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation, Trans } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";
import { Text, FlexRow, FlexColumn, NavButton } from "../ui_primitives";
import { getSharedSettingsStyles } from "./settingsMenuStyles";
import { useNotificationStore } from "../../stores/NotificationStore";
import { trpcClient } from "../../trpc/client";

interface TargetStatus {
  target: string;
  label: string;
  installed: boolean;
  url: string | null;
  configPath: string | null;
}

interface McpStatusResponse {
  targets: TargetStatus[];
  defaultUrl: string;
}

type McpTarget = "claude" | "codex" | "opencode";

async function fetchMcpStatus(): Promise<McpStatusResponse> {
  return trpcClient.mcpConfig.status.query();
}

async function installMcp(
  targets: string[]
): Promise<{ results: { target: string; label: string; success: boolean }[] }> {
  return trpcClient.mcpConfig.install.mutate({
    targets: targets as McpTarget[]
  });
}

async function uninstallMcp(
  targets: string[]
): Promise<{ results: { target: string; label: string; removed: boolean }[] }> {
  return trpcClient.mcpConfig.uninstall.mutate({
    targets: targets as McpTarget[]
  });
}

const MCPSettingsMenu = () => {
  const { t } = useTranslation("settings");
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  const { data, isLoading } = useQuery({
    queryKey: ["mcp-status"],
    queryFn: fetchMcpStatus,
    refetchOnWindowFocus: false
  });

  const installMutation = useMutation({
    mutationFn: installMcp,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mcp-status"] });
      const ok = result.results.filter((r) => r.success);
      if (ok.length > 0) {
        addNotification({
          type: "success",
          alert: true,
          content: t("mcp.installSuccess", {
            targets: ok.map((r) => r.label).join(", ")
          })
        });
      }
    },
    onError: (err) => {
      addNotification({
        type: "error",
        alert: true,
        content: t("mcp.installFailed", { error: String(err) })
      });
    }
  });

  const uninstallMutation = useMutation({
    mutationFn: uninstallMcp,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mcp-status"] });
      const ok = result.results.filter((r) => r.removed);
      if (ok.length > 0) {
        addNotification({
          type: "info",
          alert: true,
          content: t("mcp.removeSuccess", {
            targets: ok.map((r) => r.label).join(", ")
          })
        });
      }
    }
  });

  const handleInstallAll = useCallback(() => {
    const notInstalled =
      data?.targets.filter((tgt) => !tgt.installed).map((tgt) => tgt.target) ?? [];
    if (notInstalled.length > 0) {
      installMutation.mutate(notInstalled);
    }
  }, [data, installMutation]);

  const handleInstall = useCallback(
    (target: string) => {
      installMutation.mutate([target]);
    },
    [installMutation]
  );

  const handleUninstall = useCallback(
    (target: string) => {
      uninstallMutation.mutate([target]);
    },
    [uninstallMutation]
  );

  const allInstalled = data?.targets.every((tgt) => tgt.installed) ?? false;
  const busy = installMutation.isPending || uninstallMutation.isPending;

  // Claude Desktop installs the bundled `.mcpb` extension, which only the
  // desktop app can hand to the OS. Hidden in the browser/remote UI.
  const installBundle = window.api?.mcp?.installBundle;
  const [bundleBusy, setBundleBusy] = useState(false);

  const handleInstallBundle = useCallback(async () => {
    if (!installBundle) return;
    setBundleBusy(true);
    try {
      const result = await installBundle();
      if (!result.ok) {
        addNotification({
          type: "error",
          alert: true,
          content: result.error ?? t("mcp.bundleNotFound")
        });
      } else if (result.opened) {
        addNotification({
          type: "success",
          alert: true,
          content: t("mcp.bundleOpening")
        });
      } else {
        addNotification({
          type: "info",
          alert: true,
          content: t("mcp.bundleRevealed")
        });
      }
    } catch (err) {
      addNotification({
        type: "error",
        alert: true,
        content: t("mcp.bundleInstallFailed", { error: String(err) })
      });
    } finally {
      setBundleBusy(false);
    }
  }, [installBundle, addNotification, t]);

  return (
    <div
      className="remote-settings-content"
      css={getSharedSettingsStyles(theme)}
    >
      <div className="settings-main-content">
        <Text className="description" sx={{ mb: 1 }}>
          <Trans
            i18nKey="mcp.description"
            components={{ strong: <strong /> }}
          />
        </Text>

        {data?.defaultUrl && (
          <Text
            className="description"
            sx={{ mb: 2, fontFamily: "monospace", opacity: 0.6 }}
          >
            {t("mcp.serverUrl", { url: data.defaultUrl })}
          </Text>
        )}

        {isLoading && <Text sx={{ padding: "1em" }}>{t("mcp.loading")}</Text>}

        {data && (
          <>
            <div className="settings-section">
              {data.targets.map((tgt) => (
                <div key={tgt.target} className="settings-item">
                  <FlexRow align="center" justify="space-between" fullWidth>
                    <FlexRow align="center" gap={1}>
                      {tgt.installed ? (
                        <CheckCircleIcon
                          sx={{
                            color: theme.palette.success.main,
                            fontSize: "var(--fontSizeBig)"
                          }}
                        />
                      ) : (
                        <CancelIcon
                          sx={{
                            color: theme.palette.text.disabled,
                            fontSize: "var(--fontSizeBig)"
                          }}
                        />
                      )}
                      <FlexColumn gap={0}>
                        <Text sx={{ fontWeight: 500 }}>{tgt.label}</Text>
                        {tgt.installed && tgt.url && (
                          <Text
                            className="description"
                            sx={{ fontSize: "var(--fontSizeSmall) !important" }}
                          >
                            {tgt.url}
                          </Text>
                        )}
                      </FlexColumn>
                    </FlexRow>
                    <FlexRow gap={1}>
                      {tgt.installed ? (
                        <NavButton
                          icon={<RemoveCircleOutlineIcon />}
                          label={t("mcp.remove")}
                          disabled={busy}
                          onClick={() => handleUninstall(tgt.target)}
                          navSize="small"
                          sx={{
                            padding: "0.25em 1em",
                            minWidth: "unset",
                            fontSize: theme.fontSizeSmall
                          }}
                        />
                      ) : (
                        <NavButton
                          icon={<AddCircleOutlineIcon />}
                          label={t("mcp.install")}
                          color="primary"
                          disabled={busy}
                          onClick={() => handleInstall(tgt.target)}
                          navSize="small"
                          sx={{
                            padding: "0.25em 1em",
                            minWidth: "unset",
                            fontSize: theme.fontSizeSmall
                          }}
                        />
                      )}
                    </FlexRow>
                  </FlexRow>
                </div>
              ))}
            </div>

            {!allInstalled && (
              <FlexRow justify="flex-start" sx={{ mt: 1 }}>
                <NavButton
                  icon={<InstallDesktopIcon />}
                  label={t("mcp.installAll")}
                  color="primary"
                  disabled={busy}
                  onClick={handleInstallAll}
                  sx={{ padding: "0.4em 2em" }}
                />
              </FlexRow>
            )}
          </>
        )}

        {installBundle && (
          <div className="settings-section" style={{ marginTop: "1.5em" }}>
            <Text sx={{ fontWeight: 500, mb: 0.5 }}>{t("mcp.claudeDesktop")}</Text>
            <Text className="description" sx={{ mb: 1 }}>
              {t("mcp.claudeDesktopDescription")}
            </Text>
            <FlexRow justify="flex-start">
              <NavButton
                icon={<InstallDesktopIcon />}
                label={t("mcp.installExtension")}
                color="primary"
                disabled={bundleBusy}
                onClick={handleInstallBundle}
                sx={{ padding: "0.4em 2em" }}
              />
            </FlexRow>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MCPSettingsMenu);
