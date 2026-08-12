/** @jsxImportSource @emotion/react */
import React, { memo, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import ShieldIcon from "@mui/icons-material/Shield";

import useSecretsStore from "../../stores/SecretsStore";
import type { SecretValidation } from "../../stores/SecretsStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { useOAuthConnection } from "../../hooks/useOAuthConnection";
import type { SecretResponse } from "../../stores/ApiTypes";
import {
  FlexColumn,
  FlexRow,
  Text,
  Caption,
  Tooltip,
  EditorButton,
  Dialog,
  TextInput,
  Card,
  Chip,
  Box,
  EmptyState,
  CollapsibleSection,
  BORDER_RADIUS,
  MOTION,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import { ToolbarIconButton } from "../ui_primitives";
import ConfirmDialog from "../dialogs/ConfirmDialog";
import GoogleWorkspaceCard from "./GoogleWorkspaceCard";

import {
  PROVIDER_META,
  getProviderMeta,
  isProviderAvailable,
  type ProviderMeta
} from "./providerCatalog";

// Icons for the decorative logo wall. Provider-card icons live on the catalog
// entries themselves.
import openaiIcon from "../../icons/providers/openai.svg";
import anthropicIcon from "../../icons/providers/anthropic.svg";
import geminiColorIcon from "../../icons/providers/gemini-color.svg";
import mistralColorIcon from "../../icons/providers/mistral-color.svg";
import groqIcon from "../../icons/providers/groq.svg";
import huggingfaceColorIcon from "../../icons/providers/huggingface-color.svg";
import xaiIcon from "../../icons/providers/xai.svg";
import deepseekColorIcon from "../../icons/providers/deepseek-color.svg";
import cohereColorIcon from "../../icons/providers/cohere-color.svg";
import falColorIcon from "../../icons/providers/fal-color.svg";
import replicateIcon from "../../icons/providers/replicate.svg";
import elevenlabsIcon from "../../icons/providers/elevenlabs.svg";
import { docsLink, docsUrl } from "../../config/docsLinks";

// For multi-field credentials, find the parent provider (the one with fields array)
const getParentProviderMeta = (key: string): ProviderMeta | undefined => {
  const meta = getProviderMeta(key);
  if (!meta) return undefined;

  for (const provider of PROVIDER_META) {
    if (provider.fields?.some((f) => f.key === key)) {
      return provider;
    }
  }

  return meta;
};

const areAllFieldsConfigured = (meta: ProviderMeta, configuredKeys: Set<string>): boolean => {
  if (!meta.fields) {
    return configuredKeys.has(meta.key);
  }
  return meta.fields.every((field) => configuredKeys.has(field.key));
};

/* ------------------------------------------------------------------ */
//  Provider card
/* ------------------------------------------------------------------ */

interface ProviderCardProps {
  secret: SecretResponse;
  meta: ProviderMeta;
  onConnect: (secret: SecretResponse) => void;
  onManage: (secret: SecretResponse) => void;
  onDelete: (secret: SecretResponse) => void;
}

export const ProviderCard = memo(function ProviderCard({
  secret,
  meta,
  onConnect,
  onManage,
  onDelete
}: ProviderCardProps) {
  const theme = useTheme();
  const { t } = useTranslation("models");
  const oauth = useOAuthConnection(meta.oauth ?? null);
  const validateSecret = useSecretsStore((s) => s.validateSecret);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SecretValidation | null>(null);
  // OAuth-only providers have no stored secret — the sign-in itself is the
  // connection.
  const isConnected = meta.oauthOnly ? oauth.isConnected : secret.is_configured;

  const handleConnect = useCallback(() => {
    onConnect(secret);
  }, [onConnect, secret]);

  const handleManage = useCallback(() => {
    onManage(secret);
  }, [onManage, secret]);

  const handleDelete = useCallback(() => {
    onDelete(secret);
  }, [onDelete, secret]);

  // Spends one small request against the provider to answer the question the
  // card can't: is the key that's stored still good?
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await validateSecret(meta.key);
    setTestResult(result);
    setTesting(false);
  }, [validateSecret, meta.key]);

  return (
    <Card
      variant="outlined"
      padding="compact"
      sx={{
        display: "flex",
        // Stack on mobile (<sm) so the status band + action buttons drop below
        // the icon/info instead of overflowing the narrow row. Pure CSS
        // breakpoints keep this a layout concern with no per-card matchMedia.
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: theme.spacing(3),
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: theme.vars.palette.background.paper,
        transition: `${MOTION.border}, ${MOTION.background}`,
        "&:hover": {
          borderColor: theme.vars.palette.grey[700],
          backgroundColor: theme.vars.palette.action.hover
        }
      }}
    >
      {/* Icon + info stay a row even when the card stacks on mobile. */}
      <FlexRow align="center" gap={3} sx={{ flex: 1, minWidth: 0 }}>
      {/* Icon */}
      <FlexRow
        align="center"
        justify="center"
        sx={{
          width: PROVIDER_ICON_CHIP_PX,
          height: PROVIDER_ICON_CHIP_PX,
          minWidth: PROVIDER_ICON_CHIP_PX,
          borderRadius: BORDER_RADIUS.lg,
          backgroundColor: theme.vars.palette.background.default,
          overflow: "hidden"
        }}
      >
        {meta.icon ? (
          <Box
            component="img"
            src={meta.icon}
            alt={meta.name}
            sx={{
              width: PROVIDER_ICON_GLYPH_PX,
              height: PROVIDER_ICON_GLYPH_PX,
              objectFit: "contain",
              ...(meta.mono && theme.applyStyles("dark", {
                filter: "invert(1)"
              }))
            }}
          />
        ) : (
          <Text size="big" weight={600}>
            {meta.name.charAt(0)}
          </Text>
        )}
      </FlexRow>

      {/* Info */}
      <FlexColumn sx={{ flex: 1, minWidth: 0, gap: getSpacingPx(SPACING.micro), justifyContent: "center" }}>
        <FlexRow align="center" gap={0.5}>
          <Text size="small" weight={600}>
            {meta.name}
          </Text>
          {meta.tag && (
            <Chip
              label={meta.tag}
              compact
              variant="outlined"
              color="primary"
              sx={{
                height: 18,
                fontWeight: 600,
                borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.4)`
              }}
            />
          )}
        </FlexRow>
        <Caption sx={{ opacity: 0.55, lineHeight: 1.4 }}>
          {meta.description}
        </Caption>
        {meta.note && (
          <Caption
            size="smaller"
            sx={{
              opacity: 0.45,
              lineHeight: 1.4
            }}
          >
            {meta.note}
          </Caption>
        )}
      </FlexColumn>
      </FlexRow>

      {/* Status + Actions — one vertically centered band. On mobile it drops
          below the icon/info and spreads full width, letting the action
          buttons wrap instead of overflowing. */}
      <FlexRow
        align="center"
        gap={3}
        sx={{
          flexShrink: 0,
          flexWrap: "wrap",
          justifyContent: { xs: "space-between", sm: "flex-start" }
        }}
      >
        <FlexColumn
          gap={1}
          sx={{ alignItems: { xs: "flex-start", sm: "flex-end" } }}
        >
          <FlexRow
            align="center"
            gap={1}
            sx={{
              padding: theme.spacing(0.5, 2),
              borderRadius: BORDER_RADIUS.pill,
              backgroundColor: `rgba(${
                isConnected
                  ? theme.vars.palette.success.mainChannel
                  : theme.vars.palette.error.mainChannel
              } / 0.1)`
            }}
          >
            <span
              style={{
                width: STATUS_DOT_PX,
                height: STATUS_DOT_PX,
                borderRadius: BORDER_RADIUS.circle,
                backgroundColor: isConnected
                  ? theme.vars.palette.success.main
                  : theme.vars.palette.error.main,
                display: "inline-block"
              }}
            />
            <Caption
              size="smaller"
              color={isConnected ? "success" : "error"}
              sx={{
                fontWeight: 500,
                lineHeight: 1.6,
                whiteSpace: "nowrap"
              }}
            >
              {isConnected ? t("apiKey.connected") : t("apiKey.notConnected")}
            </Caption>
          </FlexRow>
          {oauth.isConnected && !meta.oauthOnly && (
            <FlexRow
              align="center"
              gap={1}
              sx={{
                padding: theme.spacing(0.5, 2),
                borderRadius: BORDER_RADIUS.pill,
                backgroundColor: `rgba(${theme.vars.palette.success.mainChannel} / 0.1)`
              }}
            >
              <Caption
                size="smaller"
                color="success"
                sx={{
                  fontWeight: 500,
                  lineHeight: 1.6,
                  whiteSpace: "nowrap"
                }}
              >
                {t("apiKey.connectedViaOAuth")}
              </Caption>
            </FlexRow>
          )}
          {isConnected && secret.updated_at && (
            <Caption size="smaller" sx={{ opacity: 0.45, whiteSpace: "nowrap" }}>
              {t("apiKey.lastUsed", { date: new Date(secret.updated_at).toLocaleDateString() })}
            </Caption>
          )}
          {testResult && (
            <Caption
              size="smaller"
              color={
                testResult.status === "valid"
                  ? "success"
                  : testResult.status === "invalid"
                    ? "error"
                    : undefined
              }
              sx={{
                lineHeight: 1.5,
                maxWidth: 280,
                textAlign: { xs: "left", sm: "right" }
              }}
            >
              {testResult.message}
            </Caption>
          )}
          {!isConnected && (
            <Caption size="smaller" sx={{ opacity: 0.45, whiteSpace: "nowrap" }}>
              {meta.oauthOnly
                ? t("apiKey.signInToStart")
                : t("apiKey.addKeyToStart")}
            </Caption>
          )}
        </FlexColumn>

        <FlexRow align="center" gap={0.5} sx={{ flexWrap: "wrap" }}>
          <EditorButton
            density="compact"
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={() => window.open(meta.docsUrl, "_blank", "noopener,noreferrer")}
          >
            {t("apiKey.docs")}
          </EditorButton>

          {meta.oauth &&
            (oauth.isConnected
              ? oauth.canDisconnect && (
                  <EditorButton
                    density="compact"
                    variant="text"
                    size="small"
                    startIcon={<LinkOffIcon sx={{ fontSize: 14 }} />}
                    onClick={oauth.disconnect}
                  >
                    {t("apiKey.disconnect")}
                  </EditorButton>
                )
              : (
                  <EditorButton
                    density="compact"
                    variant="outlined"
                    size="small"
                    startIcon={<LoginIcon sx={{ fontSize: 14 }} />}
                    onClick={oauth.connect}
                    disabled={oauth.isConnecting}
                  >
                    {oauth.isConnecting
                      ? t("apiKey.connecting")
                      : t("apiKey.signInWith", { name: meta.name })}
                  </EditorButton>
                ))}

          {meta.oauthOnly ? null : isConnected ? (
            <>
              <EditorButton
                density="compact"
                variant="text"
                size="small"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? t("apiKey.testing") : t("apiKey.test")}
              </EditorButton>
              <EditorButton
                density="compact"
                variant="outlined"
                size="small"
                onClick={handleManage}
              >
                {t("apiKey.manage")}
              </EditorButton>
              <Tooltip title={t("apiKey.deleteKey")}>
                <ToolbarIconButton
                  icon={<DeleteIcon fontSize="small" />}
                  size="small"
                  color="error"
                  onClick={handleDelete}
                  aria-label={t("apiKey.deleteKeyAria", { name: meta.name })}
                />
              </Tooltip>
            </>
          ) : (
            <EditorButton
              density="compact"
              variant="contained"
              size="small"
              onClick={handleConnect}
            >
              {t("apiKey.connect")}
            </EditorButton>
          )}
        </FlexRow>
      </FlexRow>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
//  Hero — provider logo wall
/* ------------------------------------------------------------------ */

// A curated row of recognizable provider logos, shown at the top of the page
// to make the empty/first-run state feel alive. Purely decorative.
const HERO_LOGOS: Array<{ name: string; icon: string; mono?: boolean }> = [
  { name: "OpenAI", icon: openaiIcon, mono: true },
  { name: "Anthropic", icon: anthropicIcon, mono: true },
  { name: "Gemini", icon: geminiColorIcon },
  { name: "Mistral", icon: mistralColorIcon },
  { name: "Groq", icon: groqIcon, mono: true },
  { name: "HuggingFace", icon: huggingfaceColorIcon },
  { name: "xAI", icon: xaiIcon, mono: true },
  { name: "DeepSeek", icon: deepseekColorIcon },
  { name: "Cohere", icon: cohereColorIcon },
  { name: "FAL", icon: falColorIcon },
  { name: "Replicate", icon: replicateIcon, mono: true },
  { name: "ElevenLabs", icon: elevenlabsIcon, mono: true }
];

const ProviderHero = memo(function ProviderHero({ theme }: { theme: Theme }) {
  const { t } = useTranslation("models");
  return (
    <Card
      variant="outlined"
      padding="comfortable"
      sx={{
        borderRadius: BORDER_RADIUS.xl,
        border: `1px solid ${theme.vars.palette.divider}`,
        background: `linear-gradient(135deg, rgba(${theme.vars.palette.primary.mainChannel} / 0.1) 0%, rgba(${theme.vars.palette.primary.mainChannel} / 0.02) 45%, ${theme.vars.palette.background.paper} 100%)`,
        overflow: "hidden"
      }}
    >
      <FlexColumn gap={2}>
        <Text size="big" weight={600}>
          {t("apiKey.heroTitle")}
        </Text>
        <Caption sx={{ opacity: 0.65, lineHeight: 1.5, maxWidth: 520 }}>
          {t("apiKey.heroDescription")}
        </Caption>
        <FlexRow gap={1.5} sx={{ flexWrap: "wrap", marginTop: theme.spacing(1) }}>
          {HERO_LOGOS.map((logo) => (
            <Tooltip key={logo.name} title={logo.name}>
              <FlexRow
                align="center"
                justify="center"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: BORDER_RADIUS.lg,
                  border: `1px solid ${theme.vars.palette.divider}`,
                  backgroundColor: theme.vars.palette.background.paper,
                  transition: `${MOTION.transform}, ${MOTION.border}`,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: theme.vars.palette.primary.main
                  }
                }}
              >
                <Box
                  component="img"
                  src={logo.icon}
                  alt={logo.name}
                  sx={{
                    width: 22,
                    height: 22,
                    objectFit: "contain",
                    ...(logo.mono &&
                      theme.applyStyles("dark", { filter: "invert(1)" }))
                  }}
                />
              </FlexRow>
            </Tooltip>
          ))}
        </FlexRow>
      </FlexColumn>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
//  Get Started banner
/* ------------------------------------------------------------------ */

const GetStartedBanner = memo(function GetStartedBanner({
  theme
}: {
  theme: Theme;
}) {
  const { t } = useTranslation("models");
  const steps = [
    {
      num: 1,
      title: t("apiKey.getStarted.step1Title"),
      desc: t("apiKey.getStarted.step1Desc")
    },
    {
      num: 2,
      title: t("apiKey.getStarted.step2Title"),
      desc: t("apiKey.getStarted.step2Desc")
    },
    {
      num: 3,
      title: t("apiKey.getStarted.step3Title"),
      desc: t("apiKey.getStarted.step3Desc")
    }
  ];
  return (
    <Card
      variant="outlined"
      padding="comfortable"
      sx={{
        borderRadius: BORDER_RADIUS.xl,
        border: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: theme.vars.palette.background.paper,
        marginBottom: theme.spacing(6)
      }}
    >
      <FlexRow justify="space-between" align="flex-start" gap={2} wrap>
        <FlexColumn sx={{ maxWidth: 280 }}>
          <Text size="normal" weight={600} sx={{ marginBottom: theme.spacing(1) }}>
            {t("apiKey.getStarted.title")}
          </Text>
          <Caption sx={{ opacity: 0.6, lineHeight: 1.5 }}>
            {t("apiKey.getStarted.description")}
          </Caption>
        </FlexColumn>

        <FlexRow gap={2} align="flex-start" sx={{ flexWrap: "wrap" }}>
          {steps.map((step) => (
            <FlexRow key={step.num} align="flex-start" gap={1}>
              <FlexRow
                align="center"
                justify="center"
                sx={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: BORDER_RADIUS.circle,
                  border: `1px solid ${theme.vars.palette.divider}`,
                  fontSize: theme.fontSizeSmall,
                  fontWeight: 600,
                  color: theme.vars.palette.text.secondary
                }}
              >
                {step.num}
              </FlexRow>
              <FlexColumn sx={{ maxWidth: 160 }}>
                <Text size="smaller" weight={600}>{step.title}</Text>
                <Caption sx={{ opacity: 0.5, lineHeight: 1.4, fontSize: theme.fontSizeSmaller }}>
                  {step.desc}
                </Caption>
              </FlexColumn>
            </FlexRow>
          ))}
        </FlexRow>
      </FlexRow>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
//  Section title with count
/* ------------------------------------------------------------------ */

const SectionTitle = memo(function SectionTitle({
  title,
  count,
  theme
}: {
  title: string;
  count: number;
  theme: Theme;
}) {
  return (
    <FlexRow align="center" gap={0.75} sx={{ marginBottom: theme.spacing(3) }}>
      <Text size="normal" weight={600}>
        {title}
      </Text>
      <Caption
        size="small"
        sx={{
          opacity: 0.5,
          fontWeight: 600,
          backgroundColor: theme.vars.palette.action.selected,
          padding: theme.spacing(0.5, 2),
          borderRadius: BORDER_RADIUS.sm
        }}
      >
        {count}
      </Caption>
    </FlexRow>
  );
});

/* ------------------------------------------------------------------ */
//  Constants
/* ------------------------------------------------------------------ */

// Provider card icon sizing. 48px chip + 28px glyph + 18px status dot keep the
// row visually balanced; previously these were bare numbers sprinkled across
// the JSX.
const PROVIDER_ICON_CHIP_PX = 48;
const PROVIDER_ICON_GLYPH_PX = 28;
const STATUS_DOT_PX = 6;

const SECTION_ORDER = ["popular", "language", "media", "gateways", "search", "compute", "advanced"] as const;
const SECTION_TITLE_KEYS: Record<string, string> = {
  popular: "apiKey.section.popular",
  language: "apiKey.section.language",
  media: "apiKey.section.media",
  gateways: "apiKey.section.gateways",
  search: "apiKey.section.search",
  compute: "apiKey.section.compute",
  advanced: "apiKey.section.advanced"
};

/* ------------------------------------------------------------------ */
//  Main content
/* ------------------------------------------------------------------ */

export interface APIKeysTabContentProps {
  searchTerm?: string;
}

export const APIKeysTabContent = memo(function APIKeysTabContent({
  searchTerm = ""
}: APIKeysTabContentProps) {
  const theme = useTheme();
  const { t } = useTranslation("models");
  const secrets = useSecretsStore((state) => state.secrets);
  const safeSecrets = useMemo(() => secrets ?? [], [secrets]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretResponse | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<SecretResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const addNotification = useNotificationStore((state) => state.addNotification);
  const updateSecret = useSecretsStore((state) => state.updateSecret);
  const deleteSecret = useSecretsStore((state) => state.deleteSecret);

  const lowerSearch = searchTerm.toLowerCase().trim();

  const configuredKeys = useMemo(
    () => new Set(safeSecrets.map((s) => s.key)),
    [safeSecrets]
  );

  // Match providers that should be displayed (excluding child fields of multi-field providers)
  const matchedProviders = useMemo(() => {
    const results: { secret: SecretResponse; meta: ProviderMeta }[] = [];
    const processed = new Set<string>();

    for (const secret of safeSecrets) {
      // For multi-field providers, only process the parent
      const meta = getParentProviderMeta(secret.key);
      if (!meta || processed.has(meta.key) || !isProviderAvailable(meta)) {
        continue;
      }

      // If it's a multi-field provider, create a synthetic secret that represents all fields
      if (meta.fields) {
        const isConfigured = areAllFieldsConfigured(meta, configuredKeys);
        if (!lowerSearch || meta.name.toLowerCase().includes(lowerSearch) || meta.description.toLowerCase().includes(lowerSearch)) {
          results.push({
            secret: {
              key: meta.key,
              is_configured: isConfigured,
              description: meta.description,
              user_id: null,
              created_at: null,
              updated_at: null
            } as SecretResponse,
            meta
          });
          processed.add(meta.key);
        }
      } else {
        // Single-field provider
        if (!lowerSearch || meta.name.toLowerCase().includes(lowerSearch) || meta.description.toLowerCase().includes(lowerSearch)) {
          results.push({ secret, meta });
          processed.add(meta.key);
        }
      }
    }

    return results;
  }, [safeSecrets, lowerSearch, configuredKeys]);

  // Connected providers float to their own section at the top.
  const connected = useMemo(
    () => matchedProviders.filter((p) => p.secret.is_configured),
    [matchedProviders]
  );

  // Unconfigured providers from our meta list that aren't in secrets
  const unconfiguredMeta = useMemo(() => {
    return PROVIDER_META.filter(
      (p) =>
        isProviderAvailable(p) &&
        !areAllFieldsConfigured(p, configuredKeys) &&
        (!lowerSearch ||
          p.name.toLowerCase().includes(lowerSearch) ||
          p.description.toLowerCase().includes(lowerSearch))
    );
  }, [configuredKeys, lowerSearch]);

  const unconfiguredBySection = useMemo(() => {
    const groups: Record<string, ProviderMeta[]> = {
      popular: [],
      language: [],
      media: [],
      gateways: [],
      search: [],
      compute: [],
      advanced: []
    };
    for (const meta of unconfiguredMeta) {
      groups[meta.section].push(meta);
    }
    return groups;
  }, [unconfiguredMeta]);

  const configuredBySection = useMemo(() => {
    const groups: Record<string, Array<{ secret: SecretResponse; meta: ProviderMeta }>> = {
      popular: [],
      language: [],
      media: [],
      gateways: [],
      search: [],
      compute: [],
      advanced: []
    };
    for (const item of matchedProviders.filter((p) => !p.secret.is_configured)) {
      groups[item.meta.section].push(item);
    }
    return groups;
  }, [matchedProviders]);

  const handleConnect = useCallback((secret: SecretResponse) => {
    const meta = getParentProviderMeta(secret.key);
    setEditingSecret(secret);
    setFormValue("");
    if (meta?.fields) {
      setFormValues({});
    }
    setDialogOpen(true);
  }, []);

  const handleManage = useCallback((secret: SecretResponse) => {
    const meta = getParentProviderMeta(secret.key);
    setEditingSecret(secret);
    setFormValue("");
    if (meta?.fields) {
      setFormValues({});
    }
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((secret: SecretResponse) => {
    setSecretToDelete(secret);
    setDeleteDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingSecret) return;

    const meta = getParentProviderMeta(editingSecret.key);

    try {
      if (meta?.fields) {
        // Multi-field provider: update all fields
        if (!meta.fields.every((f) => formValues[f.key])) {
          addNotification({
            type: "error",
            content: t("apiKey.allFieldsRequired"),
            dismissable: true
          });
          return;
        }
        for (const field of meta.fields) {
          await updateSecret(field.key, formValues[field.key]);
        }
      } else {
        // Single-field provider
        if (!formValue) {
          addNotification({
            type: "error",
            content: t("apiKey.secretRequired"),
            dismissable: true
          });
          return;
        }
        await updateSecret(editingSecret.key, formValue);
      }

      addNotification({
        type: "success",
        content: t("apiKey.updateSuccess", { name: meta?.name || editingSecret.key }),
        alert: true
      });
      setDialogOpen(false);
      setEditingSecret(null);
      setFormValue("");
      setFormValues({});
    } catch (err) {
      addNotification({
        type: "error",
        content: t("apiKey.updateFailed", { error: err instanceof Error ? err.message : String(err) }),
        dismissable: true
      });
    }
  }, [editingSecret, formValue, formValues, updateSecret, addNotification, t]);

  const confirmDelete = useCallback(async () => {
    if (!secretToDelete) return;
    try {
      const meta = getParentProviderMeta(secretToDelete.key);
      if (meta?.fields) {
        // Multi-field provider: delete all fields
        for (const field of meta.fields) {
          await deleteSecret(field.key);
        }
      } else {
        // Single-field provider
        await deleteSecret(secretToDelete.key);
      }
      addNotification({
        type: "success",
        content: t("apiKey.deleteSuccess", { name: meta?.name || secretToDelete.key }),
        alert: true
      });
    } catch (err) {
      addNotification({
        type: "error",
        content: t("apiKey.deleteFailed", { error: err instanceof Error ? err.message : String(err) }),
        dismissable: true
      });
    }
    setDeleteDialogOpen(false);
    setSecretToDelete(null);
  }, [secretToDelete, deleteSecret, addNotification, t]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingSecret(null);
    setFormValue("");
    setFormValues({});
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setSecretToDelete(null);
  }, []);

  // Force advanced section open while searching
  const forceAdvancedOpen = lowerSearch.length > 0;

  const hasContent = useMemo(() => {
    if (connected.length > 0) return true;
    for (const sectionKey of SECTION_ORDER) {
      const configured = configuredBySection[sectionKey] || [];
      const unconfigured = unconfiguredBySection[sectionKey] || [];
      if (configured.length > 0 || unconfigured.length > 0) return true;
    }
    return false;
  }, [connected, configuredBySection, unconfiguredBySection]);

  return (
    <FlexColumn sx={{ gap: "1.5rem" }}>
      <ProviderHero theme={theme} />

      {/* Show the onboarding banner only until the user connects their first
          provider — once anything is configured, the Connected Providers
          section above makes the banner redundant. */}
      {connected.length === 0 && <GetStartedBanner theme={theme} />}

      {/* Google Workspace has no API key — access rides on the Google login.
          Renders nothing when the backend does not offer the integration. */}
      <GoogleWorkspaceCard />

      {!hasContent && lowerSearch && (
        <EmptyState
          variant="no-results"
          title={t("apiKey.noProvidersFound")}
          description={t("apiKey.noProvidersMatch", { term: searchTerm })}
        />
      )}

      {connected.length > 0 && (
        <div>
          <SectionTitle
            title={t("apiKey.section.connectedProviders")}
            count={connected.length}
            theme={theme}
          />
          <FlexColumn sx={{ gap: theme.spacing(2) }}>
            {connected.map(({ secret, meta }) => (
              <ProviderCard
                key={meta.key}
                secret={secret}
                meta={meta}
                onConnect={handleConnect}
                onManage={handleManage}
                onDelete={handleDelete}
              />
            ))}
          </FlexColumn>
        </div>
      )}

      {SECTION_ORDER.map((sectionKey) => {
        const configured = configuredBySection[sectionKey] || [];
        const unconfigured = unconfiguredBySection[sectionKey] || [];
        const allInSection = [
          ...configured,
          ...unconfigured.map((meta) => ({
            secret: {
              key: meta.key,
              is_configured: false,
              description: meta.description,
              user_id: null,
              created_at: null,
              updated_at: null
            } as SecretResponse,
            meta
          }))
        ];

        if (allInSection.length === 0) return null;

        const sectionTitle = t(SECTION_TITLE_KEYS[sectionKey]);
        const isAdvanced = sectionKey === "advanced";

        const section = (
          <div key={sectionKey}>
            <SectionTitle
              title={sectionTitle}
              count={allInSection.length}
              theme={theme}
            />
            <FlexColumn sx={{ gap: theme.spacing(2) }}>
              {allInSection.map(({ secret, meta }) => (
                <ProviderCard
                  key={meta.key}
                  secret={secret}
                  meta={meta}
                  onConnect={handleConnect}
                  onManage={handleManage}
                  onDelete={handleDelete}
                />
              ))}
            </FlexColumn>
          </div>
        );

        if (isAdvanced) {
          return (
            <CollapsibleSection
              key={sectionKey}
              title={
                <SectionTitle
                  title={sectionTitle}
                  count={allInSection.length}
                  theme={theme}
                />
              }
              open={forceAdvancedOpen || advancedOpen}
              onToggle={setAdvancedOpen}
            >
              <FlexColumn sx={{ gap: theme.spacing(2) }}>
                {allInSection.map(({ secret, meta }) => (
                  <ProviderCard
                    key={meta.key}
                    secret={secret}
                    meta={meta}
                    onConnect={handleConnect}
                    onManage={handleManage}
                    onDelete={handleDelete}
                  />
                ))}
              </FlexColumn>
            </CollapsibleSection>
          );
        }

        return section;
      })}

      {/* Edit / Connect dialog */}
      {editingSecret && (() => {
        const meta = getParentProviderMeta(editingSecret.key);
        const isMultiField = !!meta?.fields && meta.fields.length > 0;
        const allFieldsFilled = isMultiField && meta?.fields
          ? meta.fields.every((f) => formValues[f.key])
          : formValue;

        return (
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            fullWidth
            title={
              <FlexRow align="center" gap={1}>
                <LockIcon sx={{ color: "var(--palette-primary-main)", fontSize: 20 }} />
                <Text size="normal" weight={600}>
                  {editingSecret?.is_configured
                    ? t("apiKey.dialogTitleUpdate", { name: meta?.name || editingSecret.key })
                    : t("apiKey.dialogTitleConnect", { name: meta?.name || editingSecret.key })}
                </Text>
              </FlexRow>
            }
            onConfirm={handleSave}
            onCancel={handleCloseDialog}
            confirmText={editingSecret?.is_configured ? t("apiKey.update") : t("apiKey.connect")}
            cancelText={t("apiKey.cancel")}
            confirmDisabled={!allFieldsFilled}
          >
            <FlexColumn sx={{ marginTop: theme.spacing(4), gap: theme.spacing(3) }}>
              {isMultiField ? (
                <>
                  {meta?.fields?.map((field) => (
                    <TextInput
                      key={field.key}
                      label={field.label}
                      type={field.secret ? "password" : "text"}
                      value={formValues[field.key] || ""}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value
                        }))
                      }
                      fullWidth
                      placeholder={t("apiKey.fieldPlaceholder", { label: field.label.toLowerCase() })}
                      autoFocus={field.key === meta.fields?.[0]?.key}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                  <Caption sx={{ opacity: 0.6 }}>
                    {t("apiKey.multiFieldCaption")}
                  </Caption>
                </>
              ) : (
                <>
                  <TextInput
                    label={t("apiKey.apiLabel")}
                    type="password"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    fullWidth
                    placeholder={t("apiKey.apiPlaceholder")}
                    autoFocus
                    variant="outlined"
                    size="small"
                  />
                  <Caption sx={{ opacity: 0.6 }}>
                    {t("apiKey.singleFieldCaption")}
                  </Caption>
                </>
              )}
            </FlexColumn>
          </Dialog>
        );
      })()}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        onConfirm={confirmDelete}
        title={t("apiKey.deleteTitle")}
        content={t("apiKey.deleteConfirm", { name: secretToDelete ? getParentProviderMeta(secretToDelete.key)?.name || secretToDelete.key : "" })}
        confirmText={t("apiKey.delete")}
        cancelText={t("apiKey.cancel")}
      />
    </FlexColumn>
  );
});

/* ------------------------------------------------------------------ */
//  Security notice (rendered in left sidebar footer)
/* ------------------------------------------------------------------ */

export const SecurityNotice = memo(function SecurityNotice() {
  const theme = useTheme();
  const { t } = useTranslation("models");
  return (
    <Card
      variant="outlined"
      padding="normal"
      sx={{
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: `rgba(${theme.vars.palette.success.mainChannel} / 0.06)`
      }}
    >
      <FlexRow align="flex-start" gap={1}>
        <ShieldIcon
          sx={{
            fontSize: 18,
            color: theme.vars.palette.success.main,
            marginTop: theme.spacing(0.5),
            flexShrink: 0
          }}
        />
        <FlexColumn sx={{ minWidth: 0 }}>
          <Text size="smaller" weight={600}>
            {t("apiKey.security.title")}
          </Text>
          <Caption size="smaller" sx={{ opacity: 0.6, lineHeight: 1.4, marginTop: theme.spacing(0.5) }}>
            {t("apiKey.security.description")}
          </Caption>
          <EditorButton
            density="compact"
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
           onClick={() =>
             window.open(
               "https://docs.brainvite.com/security",
               "_blank",
               "noopener,noreferrer"
             )
           }
            sx={{ alignSelf: "flex-start", marginTop: theme.spacing(1) }}
          >
            {t("apiKey.security.learnMore")}
          </EditorButton>
        </FlexColumn>
      </FlexRow>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
//  Right sidebar
/* ------------------------------------------------------------------ */

export const APIKeysRightSidebar = memo(function APIKeysRightSidebar() {
  const theme = useTheme();
  const { t } = useTranslation("models");

  const quickLinks = [
    {
      icon: <ModelTrainingIcon sx={{ fontSize: 18 }} />,
      title: t("apiKey.sidebar.supportedModelsTitle"),
      subtitle: t("apiKey.sidebar.supportedModelsSubtitle"),
      href: docsLink("providers")
    },
    {
      icon: <MenuBookIcon sx={{ fontSize: 18 }} />,
      title: t("apiKey.sidebar.apiDocsTitle"),
      subtitle: t("apiKey.sidebar.apiDocsSubtitle"),
      href: docsUrl("providers")
    },
    {
      icon: <HelpOutlineIcon sx={{ fontSize: 18 }} />,
      title: t("apiKey.sidebar.troubleshootingTitle"),
      subtitle: t("apiKey.sidebar.troubleshootingSubtitle"),
      href: docsLink("troubleshooting")
    }
  ];

  return (
    <FlexColumn
      sx={{
        width: 280,
        minWidth: 280,
        padding: theme.spacing(6, 4),
        gap: theme.spacing(4),
        overflowY: "auto",
        overflowX: "hidden"
      }}
    >
      {/* Quick Links */}
      <Card
        variant="outlined"
        padding="normal"
        sx={{
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${theme.vars.palette.divider}`
        }}
      >
        <Text size="small" weight={600} sx={{ marginBottom: theme.spacing(3) }}>
          {t("apiKey.sidebar.quickLinks")}
        </Text>
        <FlexColumn sx={{ gap: theme.spacing(0.5) }}>
          {quickLinks.map((link) => (
            <FlexRow
              key={link.title}
              align="center"
              gap={0.75}
              sx={{
                padding: theme.spacing(2, 2),
                borderRadius: BORDER_RADIUS.md,
                cursor: "pointer",
                transition: MOTION.background,
                "&:hover": {
                  backgroundColor: theme.vars.palette.action.hover
                }
              }}
              onClick={() => {
                if (link.href.startsWith("http")) {
                  window.open(link.href, "_blank", "noopener,noreferrer");
                } else {
                  window.location.href = link.href;
                }
              }}
            >
              <FlexRow
                align="center"
                justify="center"
                sx={{
                  color: theme.vars.palette.primary.main,
                  fontSize: 18,
                  width: 22,
                  flexShrink: 0
                }}
              >
                {link.icon}
              </FlexRow>
              <FlexColumn sx={{ flex: 1, minWidth: 0 }}>
                <Text size="smaller" weight={500}>{link.title}</Text>
                <Caption sx={{ opacity: 0.5, fontSize: theme.fontSizeSmaller, lineHeight: 1.3 }}>
                  {link.subtitle}
                </Caption>
              </FlexColumn>
              <Text
                sx={{
                  color: theme.vars.palette.text.secondary,
                  fontSize: 16,
                  flexShrink: 0,
                  marginLeft: theme.spacing(1)
                }}
              >
                ›
              </Text>
            </FlexRow>
          ))}
        </FlexColumn>
      </Card>

      {/* Promo card */}
      <Card
        variant="outlined"
        padding="normal"
        sx={{
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${theme.vars.palette.divider}`,
          background: `linear-gradient(135deg, rgba(${theme.vars.palette.primary.mainChannel} / 0.08) 0%, rgba(${theme.vars.palette.primary.mainChannel} / 0.02) 100%)`
        }}
      >
        <FlexRow align="center" gap={1} sx={{ marginBottom: theme.spacing(2) }}>
          <CardGiftcardIcon
            sx={{ color: theme.vars.palette.primary.main, fontSize: 20 }}
          />
          <Text size="small" weight={600}>
            {t("apiKey.sidebar.creditsTitle")}
          </Text>
        </FlexRow>
        <Caption sx={{ opacity: 0.6, lineHeight: 1.5, marginBottom: theme.spacing(3) }}>
          {t("apiKey.sidebar.creditsDesc")}
        </Caption>
        <EditorButton
          density="compact"
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={() =>
            window.open(
              "https://openrouter.ai/",
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          {t("apiKey.sidebar.viewOffers")}
        </EditorButton>
      </Card>
    </FlexColumn>
  );
});
