/** @jsxImportSource @emotion/react */
import React, { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  Text,
  TextInput,
  FlexColumn,
  SelectField,
  type SelectOption
} from "../ui_primitives";
import ExternalLink from "../common/ExternalLink";
import { useSearchProviderCalloutStore } from "../../stores/SearchProviderCalloutStore";
import useRemoteSettingsStore from "../../stores/RemoteSettingStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { formatSettingLabel } from "../menus/settingsLabel";
import {
  SEARCH_PROVIDER_CONFIGS,
  SUGGESTED_SERP_PROVIDER,
  type SerpProviderId
} from "../../utils/searchProviders";

/**
 * Pre-run prompt shown when a node uses a web-search tool but no search
 * provider is configured. Lets the user pick a provider and paste its API key
 * inline (Brave is suggested as a free default) instead of opening Settings.
 * Mounted once at the app root; driven by {@link useSearchProviderCalloutStore}.
 */
const SearchProviderSetupDialog: React.FC = () => {
  const { t } = useTranslation(["models"]);
  const open = useSearchProviderCalloutStore((s) => s.open);
  const nodes = useSearchProviderCalloutStore((s) => s.nodes);
  const dismiss = useSearchProviderCalloutStore((s) => s.dismiss);

  const updateSettings = useRemoteSettingsStore((s) => s.updateSettings);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<SerpProviderId>(
    SUGGESTED_SERP_PROVIDER
  );
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const config = SEARCH_PROVIDER_CONFIGS[provider];

  const providerOptions = useMemo<SelectOption[]>(
    () =>
      Object.values(SEARCH_PROVIDER_CONFIGS).map((cfg) => ({
        value: cfg.id,
        label: cfg.free
          ? `${cfg.label} ${t("models:apiKey.searchProvider.freeSuffix")}`
          : cfg.label
      })),
    [t]
  );

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value as SerpProviderId);
    setCredentials({});
  }, []);

  const handleCredentialChange = useCallback(
    (field: string) => (e: unknown) => {
      const target = e as { target: { value: string } };
      setCredentials((prev) => ({ ...prev, [field]: target.target.value }));
    },
    []
  );

  const allFilled = useMemo(
    () =>
      config.credentialFields.every(
        (field) => (credentials[field] ?? "").trim().length > 0
      ),
    [config, credentials]
  );

  const handleSave = useCallback(async () => {
    if (!allFilled || saving) return;
    setSaving(true);
    try {
      const secrets: Record<string, string> = {};
      for (const field of config.credentialFields) {
        secrets[field] = credentials[field].trim();
      }
      await updateSettings({ SERP_PROVIDER: provider }, secrets);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      addNotification({
        content: t("models:apiKey.searchProvider.setup.saveSuccess", {
          name: config.label
        }),
        type: "success",
        alert: true
      });
      dismiss();
    } catch (error) {
      addNotification({
        content:
          error instanceof Error
            ? error.message
            : t("models:apiKey.searchProvider.setup.saveFailed"),
        type: "error",
        alert: true
      });
    } finally {
      setSaving(false);
    }
  }, [
    allFilled,
    saving,
    config,
    credentials,
    provider,
    updateSettings,
    queryClient,
    addNotification,
    dismiss
  ]);

  const nodeNames = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.nodeTitle))).join(", "),
    [nodes]
  );

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      title={t("models:apiKey.searchProvider.setup.title")}
      onConfirm={handleSave}
      onCancel={dismiss}
      confirmText={t("models:apiKey.searchProvider.setup.confirm")}
      cancelText={t("models:apiKey.searchProvider.setup.cancel")}
      confirmDisabled={!allFilled}
      isLoading={saving}
      content={
        <FlexColumn gap={2}>
          <Text>
            {nodeNames
              ? t("models:apiKey.searchProvider.setup.introWithNodes", {
                  nodes: nodeNames
                })
              : t("models:apiKey.searchProvider.setup.introGeneric")}
            {t("models:apiKey.searchProvider.setup.addOneBelow")}
          </Text>

          <SelectField
            label={t("models:apiKey.searchProvider.setup.selectLabel")}
            value={provider}
            onChange={handleProviderChange}
            options={providerOptions}
            description={t(
              `models:apiKey.searchProvider.providers.${config.id}.description`
            )}
            size="small"
          />

          {config.credentialFields.map((field) => (
            <TextInput
              key={field}
              type="password"
              autoComplete="off"
              id={`${field.toLowerCase()}-setup-input`}
              label={formatSettingLabel(field)}
              value={credentials[field] ?? ""}
              onChange={handleCredentialChange(field)}
              variant="standard"
              size="small"
              onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
            />
          ))}

          <ExternalLink
            href={config.getApiKeyUrl}
            tooltipText={t(
              "models:apiKey.searchProvider.setup.getKeyTooltip",
              { name: config.label }
            )}
          >
            {t(
              `models:apiKey.searchProvider.providers.${config.id}.getKeyLabel`
            )}
          </ExternalLink>
        </FlexColumn>
      }
    />
  );
};

SearchProviderSetupDialog.displayName = "SearchProviderSetupDialog";

export default memo(SearchProviderSetupDialog);
