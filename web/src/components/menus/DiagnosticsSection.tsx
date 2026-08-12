/** @jsxImportSource @emotion/react */
import { memo, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import { trpc } from "../../trpc/client";
import { useNotificationStore } from "../../stores/NotificationStore";
import { FlexRow, FlexColumn, Text, Caption, Card, EditorButton, Chip, BORDER_RADIUS } from "../ui_primitives";

/**
 * Server-side diagnostics for the About tab: secret-encryption status,
 * provider configuration, and asset-storage health. Mirrors what the former
 * admin panel surfaced, but without the admin-auth gate.
 */
const DiagnosticsSection = memo(function DiagnosticsSection() {
  const theme = useTheme();
  const { t } = useTranslation("settings");
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { data, isLoading, refetch } = trpc.settings.diagnostics.useQuery(undefined, {
    staleTime: 10_000
  });

  const buildReport = useCallback((): string | null => {
    if (!data) return null;
    const lines: string[] = [
      "BrainVite-AI-Canvas Diagnostics",
      "================================",
      `Version: ${data.version}`,
      `Node.js: ${data.nodeVersion}`,
      `Uptime: ${data.uptimeSeconds}s`,
      `Data Directory: ${data.dataDirectory}`,
      `Build: ${data.isUnsignedBuild ? "Unsigned (test build)" : "Signed"}`,
      "",
      `Secret Encryption: ${data.secretEncryptionConfigured ? "Configured" : "Not configured"}`,
      "",
      "Providers:",
      ...data.providers.map(
        (p) => `  ${p.name}: ${p.configured ? `Configured (${p.source})` : "Not configured"}`
      ),
      "",
      `Storage: ${data.storage.kind}`,
      ...(data.storage.bucket ? [`  Bucket: ${data.storage.bucket}`] : []),
      ...(data.storage.region ? [`  Region: ${data.storage.region}`] : []),
      ...(data.storage.endpoint ? [`  Endpoint: ${data.storage.endpoint}`] : []),
      ...(data.storage.error ? [`  Error: ${data.storage.error}`] : [])
    ];
    return lines.join("\n");
  }, [data]);

  const handleCopy = useCallback(async () => {
    const text = buildReport();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      addNotification({ type: "info", alert: true, content: t("diagnostics.actions.copySuccess") });
    } catch {
      addNotification({ type: "error", alert: true, content: t("diagnostics.actions.copyFailed") });
    }
  }, [buildReport, addNotification, t]);

  const handleExport = useCallback(() => {
    const text = buildReport();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brainvite-diagnostics.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [buildReport]);

  if (isLoading) {
    return (
      <Card variant="outlined" padding="normal" sx={{ borderRadius: BORDER_RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}` }}>
        <Text size="small" color="secondary">{t("diagnostics.loading")}</Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="outlined" padding="normal" sx={{ borderRadius: BORDER_RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}` }}>
        <FlexRow justify="space-between" align="center">
          <Text size="small" color="secondary">{t("diagnostics.unavailable")}</Text>
          <EditorButton size="small" variant="text" onClick={() => refetch()}>{t("diagnostics.retry")}</EditorButton>
        </FlexRow>
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding="normal" sx={{ borderRadius: BORDER_RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}` }}>
      <FlexColumn gap={3}>
        {/* Security */}
        <FlexRow justify="space-between" align="center">
          <FlexColumn gap={0.5}>
            <Text size="small" weight={600}>{t("diagnostics.secretEncryption.title")}</Text>
            <Caption sx={{ opacity: 0.6 }}>
              {data.secretEncryptionConfigured
                ? t("diagnostics.secretEncryption.encryptedRest")
                : t("diagnostics.secretEncryption.noMasterKey")}
            </Caption>
          </FlexColumn>
          <Chip
            icon={data.secretEncryptionConfigured ? <CheckCircleIcon /> : <CancelIcon />}
            label={data.secretEncryptionConfigured ? t("diagnostics.secretEncryption.encrypted") : t("diagnostics.secretEncryption.unencrypted")}
            size="small"
            color={data.secretEncryptionConfigured ? "success" : "warning"}
            variant="outlined"
          />
        </FlexRow>

        {/* Providers */}
        <FlexColumn gap={1}>
          <Text size="small" weight={600}>{t("diagnostics.providers.title")}</Text>
          {data.providers.map((provider) => (
            <FlexRow key={provider.id} justify="space-between" align="center">
              <FlexColumn gap={0.25}>
                <Text size="smaller">{provider.name}</Text>
                <Caption size="smaller" sx={{ opacity: 0.5, fontFamily: "monospace" }}>{provider.secretKey}</Caption>
              </FlexColumn>
              <Chip
                icon={provider.configured ? <CheckCircleIcon /> : <CancelIcon />}
                label={provider.configured ? provider.source : t("diagnostics.providers.notSet")}
                size="small"
                color={provider.configured ? "success" : "default"}
                variant="outlined"
                sx={{ fontFamily: "monospace" }}
              />
            </FlexRow>
          ))}
        </FlexColumn>

        {/* Storage */}
        <FlexColumn gap={1}>
          <Text size="small" weight={600}>{t("diagnostics.storage.title")}</Text>
          <FlexRow justify="space-between" align="center">
            <FlexColumn gap={0.25}>
              <Text size="smaller">{data.storage.kind === "file" ? t("diagnostics.storage.localFilesystem") : data.storage.kind.toUpperCase()}</Text>
              {data.storage.bucket && (
                <Caption size="smaller" sx={{ opacity: 0.5, fontFamily: "monospace" }}>
                  {data.storage.bucket}{data.storage.region ? ` (${data.storage.region})` : ""}
                </Caption>
              )}
              {data.storage.endpoint && (
                <Caption size="smaller" sx={{ opacity: 0.5, fontFamily: "monospace" }}>{data.storage.endpoint}</Caption>
              )}
              {data.storage.error && (
                <Caption size="smaller" color="error" sx={{ lineHeight: 1.4 }}>{data.storage.error}</Caption>
              )}
            </FlexColumn>
            <Chip
              icon={data.storage.error ? <CancelIcon /> : <CheckCircleIcon />}
              label={data.storage.error ? t("diagnostics.storage.error") : t("diagnostics.storage.healthy")}
              size="small"
              color={data.storage.error ? "error" : "success"}
              variant="outlined"
            />
      </FlexRow>
      </FlexColumn>

        {/* Data directory */}
        <FlexColumn gap={1}>
          <Text size="small" weight={600}>{t("diagnostics.dataDirectory.title")}</Text>
          <Caption size="smaller" sx={{ opacity: 0.5, fontFamily: "monospace", wordBreak: "break-all" }}>
            {data.dataDirectory}
          </Caption>
          {data.isUnsignedBuild && (
            <Caption size="smaller" color="warning.main" sx={{ lineHeight: 1.4 }}>
              {t("diagnostics.dataDirectory.unsignedWarning")}
            </Caption>
          )}
        </FlexColumn>

        {/* Export actions */}
        <FlexRow gap={2} justify="flex-end">
          <EditorButton
            size="small"
            variant="text"
            startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
            onClick={handleCopy}
          >
            {t("diagnostics.actions.copy")}
          </EditorButton>
          <EditorButton
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExport}
          >
            {t("diagnostics.actions.export")}
          </EditorButton>
        </FlexRow>
      </FlexColumn>
    </Card>
  );
});

export default DiagnosticsSection;
