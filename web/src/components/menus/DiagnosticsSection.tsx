/** @jsxImportSource @emotion/react */
import { memo, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
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
      addNotification({ type: "info", alert: true, content: "Diagnostics copied." });
    } catch {
      addNotification({ type: "error", alert: true, content: "Copy failed." });
    }
  }, [buildReport, addNotification]);

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
        <Text size="small" color="secondary">Loading diagnostics...</Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="outlined" padding="normal" sx={{ borderRadius: BORDER_RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}` }}>
        <FlexRow justify="space-between" align="center">
          <Text size="small" color="secondary">Diagnostics unavailable.</Text>
          <EditorButton size="small" variant="text" onClick={() => refetch()}>Retry</EditorButton>
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
            <Text size="small" weight={600}>Secret Encryption</Text>
            <Caption sx={{ opacity: 0.6 }}>
              {data.secretEncryptionConfigured
                ? "API keys are encrypted at rest."
                : "No SECRETS_MASTER_KEY set. Keys stored without encryption."}
            </Caption>
          </FlexColumn>
          <Chip
            icon={data.secretEncryptionConfigured ? <CheckCircleIcon /> : <CancelIcon />}
            label={data.secretEncryptionConfigured ? "Encrypted" : "Unencrypted"}
            size="small"
            color={data.secretEncryptionConfigured ? "success" : "warning"}
            variant="outlined"
          />
        </FlexRow>

        {/* Providers */}
        <FlexColumn gap={1}>
          <Text size="small" weight={600}>Provider Status</Text>
          {data.providers.map((provider) => (
            <FlexRow key={provider.id} justify="space-between" align="center">
              <FlexColumn gap={0.25}>
                <Text size="smaller">{provider.name}</Text>
                <Caption size="smaller" sx={{ opacity: 0.5, fontFamily: "monospace" }}>{provider.secretKey}</Caption>
              </FlexColumn>
              <Chip
                icon={provider.configured ? <CheckCircleIcon /> : <CancelIcon />}
                label={provider.configured ? provider.source : "Not set"}
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
          <Text size="small" weight={600}>Asset Storage</Text>
          <FlexRow justify="space-between" align="center">
            <FlexColumn gap={0.25}>
              <Text size="smaller">{data.storage.kind === "file" ? "Local filesystem" : data.storage.kind.toUpperCase()}</Text>
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
              label={data.storage.error ? "Error" : "Healthy"}
              size="small"
              color={data.storage.error ? "error" : "success"}
              variant="outlined"
            />
          </FlexRow>
        </FlexColumn>

        {/* Export actions */}
        <FlexRow gap={2} justify="flex-end">
          <EditorButton
            size="small"
            variant="text"
            startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
            onClick={handleCopy}
          >
            Copy
          </EditorButton>
          <EditorButton
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExport}
          >
            Export Diagnostics
          </EditorButton>
        </FlexRow>
      </FlexColumn>
    </Card>
  );
});

export default DiagnosticsSection;
