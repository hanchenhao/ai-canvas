/** @jsxImportSource @emotion/react */
/**
 * Settings → Packages tab.
 *
 * Lists every discovered node pack with its load status and trust toggle.
 * Trust changes write `~/.config/nodetool/packs.json` and trigger a soft
 * reload. Install / uninstall are Electron-only and require a server restart.
 */

import { memo, useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import {
  AlertBanner,
  Chip,
  EditorButton,
  FlexColumn,
  FlexRow,
  LabeledSwitch,
  Text,
  TextInput,
  BORDER_RADIUS,
  MOTION
} from "../ui_primitives";
import { isElectron } from "../../lib/env";
import SandboxPackDisclosure from "../packages/SandboxPackDisclosure";
import usePacksStore, {
  type PackInfo,
  type SkipReason
} from "../../stores/PacksStore";
import { useShallow } from "zustand/react/shallow";

function statusColor(
  pack: PackInfo
): "success" | "warning" | "error" | "default" {
  if (pack.status === "loaded") {
    return pack.skippedNodes.length > 0 ? "warning" : "success";
  }
  if (pack.status === "skipped") return "warning";
  return "error";
}

function statusLabel(pack: PackInfo, t: TFunction): string {
  if (pack.status === "loaded") {
    return t("packages:packs.loadedCount", { count: pack.registered.length });
  }
  if (pack.status === "skipped") {
    return t("packages:packs.statusSkipped");
  }
  return t("packages:packs.statusError");
}

const SKIP_REASON_KEY: Record<SkipReason, string> = {
  "not-allowed": "skipNotAllowed",
  "api-version": "skipApiVersion",
  "reserved-namespace": "skipReservedNamespace",
  collision: "skipCollision",
  "no-node-type": "skipNoNodeType"
};

interface PackRowProps {
  pack: PackInfo;
  trusted: boolean;
  onTrustChange: (trusted: boolean) => void;
}

const PackRow = memo(function PackRow({
  pack,
  trusted,
  onTrustChange
}: PackRowProps) {
  const { t } = useTranslation("packages");
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    pack.registered.length > 0 ||
    pack.skippedNodes.length > 0 ||
    Boolean(pack.error);

  return (
    <FlexColumn
      gap={0.5}
      sx={(theme) => ({
        px: 2.25,
        py: 1.75,
        borderRadius: BORDER_RADIUS.xl,
        border: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: theme.vars.palette.background.paper,
        transition: `border-color ${MOTION.fast}`,
        "&:hover": { borderColor: theme.vars.palette.action.focus }
      })}
    >
      <FlexRow gap={3} align="center" sx={{ flexWrap: "wrap" }}>
        <FlexColumn gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <FlexRow gap={1} align="center" sx={{ flexWrap: "wrap" }}>
            <Text size="normal" weight={600} truncate>
              {pack.name}
            </Text>
            {pack.version && (
              <Text size="small" color="secondary" family="secondary">
                v{pack.version}
              </Text>
            )}
            <Chip
              label={statusLabel(pack, t)}
              color={statusColor(pack)}
              compact
            />
          </FlexRow>
          {pack.reason && (
            <Text size="small" color="secondary">
              {pack.reason}
            </Text>
          )}
        </FlexColumn>
        <FlexRow gap={1.5} align="center" sx={{ flexShrink: 0 }}>
          <LabeledSwitch
            label={t("packages:packs.trusted")}
            checked={trusted}
            onChange={onTrustChange}
          />
          {hasDetails && (
            <EditorButton
              density="compact"
              variant="outlined"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded
                ? t("packages:packs.hide")
                : t("packages:packs.details")}
            </EditorButton>
          )}
        </FlexRow>
      </FlexRow>

      {expanded && (
        <FlexColumn gap={1} sx={{ mt: 1 }}>
          {pack.error && (
            <AlertBanner severity="error" compact>
              {pack.error}
            </AlertBanner>
          )}
          {pack.registered.length > 0 && (
            <FlexColumn gap={0.5}>
              <Text size="small" weight={600}>
                {t("packages:packs.registeredCount", {
                  count: pack.registered.length
                })}
              </Text>
              {pack.registered.map((t) => (
                <Text key={t} size="small" family="secondary">
                  {t}
                </Text>
              ))}
            </FlexColumn>
          )}
          {pack.skippedNodes.length > 0 && (
            <FlexColumn gap={0.5}>
              <Text size="small" weight={600}>
                {t("packages:packs.skippedCount", {
                  count: pack.skippedNodes.length
                })}
              </Text>
              {pack.skippedNodes.map((s) => (
                <Text key={s.nodeType} size="small" family="secondary">
                  {s.nodeType} - {t(`packages:packs.${SKIP_REASON_KEY[s.reason]}`)}
                </Text>
              ))}
            </FlexColumn>
          )}
        </FlexColumn>
      )}
    </FlexColumn>
  );
});

type NodePackInstallMode = "sandbox-only" | "register" | "hybrid" | "unknown";

interface NodePackInstallStatus {
  mode: NodePackInstallMode;
  scripts: "skipped" | "ran";
  active: boolean;
  reason?: string;
}

interface NodePackActionResult {
  success: boolean;
  message: string;
  installation?: NodePackInstallStatus;
}

interface InstalledNodePack {
  name: string;
  version?: string;
  installation?: NodePackInstallStatus;
}

interface NodePacksApi {
  listInstalled: () => Promise<InstalledNodePack[]>;
  install: (spec: string) => Promise<NodePackActionResult>;
  trust: (name: string) => Promise<NodePackActionResult>;
}

function nodePacksApi(): NodePacksApi | undefined {
  const api = window.api as undefined | { nodePacks?: Partial<NodePacksApi> };
  const packs = api?.nodePacks;
  if (!packs?.listInstalled || !packs.install || !packs.trust) return undefined;
  return packs as NodePacksApi;
}

const MODE_KEY: Record<NodePackInstallMode, string> = {
  "sandbox-only": "modeSandboxOnly",
  register: "modeRegister",
  hybrid: "modeHybrid",
  unknown: "modeUnknown"
};

/**
 * What the install mode means for the user. Install is never authorization:
 * anything that runs host code stays inactive until trust is approved.
 */
function installStateText(
  status: NodePackInstallStatus,
  t: TFunction
): string {
  if (status.mode === "unknown") {
    return t("packages:packs.stateUnknownMode", {
      reason: status.reason ? ` ${status.reason}` : ""
    });
  }
  if (status.mode === "sandbox-only") {
    return t("packages:packs.stateSandboxOnly");
  }
  if (status.active) {
    return t("packages:packs.stateTrusted");
  }
  return t("packages:packs.stateInactive");
}

const InstalledPacksPanel = memo(function InstalledPacksPanel({
  packs,
  onChanged
}: {
  packs: InstalledNodePack[];
  onChanged: () => void;
}) {
  const { t } = useTranslation("packages");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<
    { name: string; ok: boolean; message: string } | null
  >(null);

  const handleTrust = useCallback(
    async (name: string) => {
      const api = nodePacksApi();
      if (!api) return;
      setBusy(name);
      setResult(null);
      try {
        const trusted = await api.trust(name);
        setResult({ name, ok: trusted.success, message: trusted.message });
        if (trusted.success) onChanged();
      } catch (err: unknown) {
        setResult({
          name,
          ok: false,
          message: err instanceof Error ? err.message : String(err)
        });
      } finally {
        setBusy(null);
      }
    },
    [onChanged]
  );

  if (packs.length === 0) return null;

  return (
    <FlexColumn gap={1.75}>
      <Text size="normal" weight={600}>
        {t("packages:packs.installedTitle", { count: packs.length })}
      </Text>
      <FlexColumn gap={1.25}>
        {packs.map((pack) => {
          const status = pack.installation;
          const needsTrust =
            status !== undefined &&
            !status.active &&
            (status.mode === "register" || status.mode === "hybrid");
          return (
            <FlexColumn
              key={pack.name}
              gap={0.75}
              sx={(theme) => ({
                px: 2.25,
                py: 1.75,
                borderRadius: BORDER_RADIUS.xl,
                border: `1px solid ${theme.vars.palette.divider}`,
                backgroundColor: theme.vars.palette.background.paper
              })}
            >
              <FlexRow gap={3} align="center" sx={{ flexWrap: "wrap" }}>
                <FlexColumn gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
                  <FlexRow gap={1} align="center" sx={{ flexWrap: "wrap" }}>
                    <Text size="normal" weight={600} truncate>
                      {pack.name}
                    </Text>
                    {pack.version && (
                      <Text size="small" color="secondary" family="secondary">
                        v{pack.version}
                      </Text>
                    )}
                    {status && (
                      <>
                        <Chip
                          label={t(`packages:packs.${MODE_KEY[status.mode]}`)}
                          compact
                        />
                        <Chip
                          label={
                            status.active
                              ? t("packages:packs.active")
                              : t("packages:packs.inactive")
                          }
                          color={
                            status.active
                              ? "success"
                              : status.mode === "unknown"
                                ? "error"
                                : "warning"
                          }
                          compact
                        />
                      </>
                    )}
                  </FlexRow>
                  <Text size="small" color="secondary">
                    {status
                      ? installStateText(status, t)
                      : t("packages:packs.stateUnknownLedger")}
                  </Text>
                </FlexColumn>
                {needsTrust && (
                  <EditorButton
                    variant="contained"
                    density="compact"
                    onClick={() => void handleTrust(pack.name)}
                    disabled={busy !== null}
                    sx={{ flexShrink: 0 }}
                  >
                    {busy === pack.name
                      ? t("packages:packs.verifying")
                      : t("packages:packs.trustAndRebuild")}
                  </EditorButton>
                )}
              </FlexRow>
              {(status?.mode === "sandbox-only" ||
                status?.mode === "hybrid") && (
                <SandboxPackDisclosure packName={pack.name} />
              )}
              {result?.name === pack.name && (
                <AlertBanner severity={result.ok ? "success" : "error"} compact>
                  {result.message}
                </AlertBanner>
              )}
            </FlexColumn>
          );
        })}
      </FlexColumn>
    </FlexColumn>
  );
});

const InstallPanel = memo(function InstallPanel({
  onInstalled
}: {
  onInstalled: () => void;
}) {
  const { t } = useTranslation("packages");
  const [spec, setSpec] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" }
    | { kind: "installing" }
    | { kind: "ok"; message: string }
    | { kind: "warn"; message: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const handleInstall = useCallback(async () => {
    const trimmed = spec.trim();
    if (!trimmed) return;
    setStatus({ kind: "installing" });
    try {
      const api = nodePacksApi();
      if (!api) {
        setStatus({
          kind: "err",
          message: t("packages:packs.installUnavailable")
        });
        return;
      }
      const result = await api.install(trimmed);
      // A pack that installed but stayed inactive is not an error: the message
      // says which mode applied and what approval it still needs.
      const inactive =
        !result.success && result.installation?.mode !== undefined;
      if (result.success || inactive) {
        setStatus({
          kind: inactive ? "warn" : "ok",
          message: result.message
        });
        setSpec("");
        onInstalled();
      } else {
        setStatus({ kind: "err", message: result.message });
      }
    } catch (err: unknown) {
      setStatus({
        kind: "err",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }, [spec, onInstalled, t]);

  return (
    <FlexColumn gap={1}>
      <Text size="normal" weight={600}>
        {t("packages:packs.installTitle")}
      </Text>
      <Text size="small" color="secondary">
        <Trans
          ns="packages"
          i18nKey="packs.installDescription1"
          components={{ code: <code /> }}
        />
      </Text>
      <Text size="small" color="secondary">
        {t("packages:packs.installDescription2")}
      </Text>
      <FlexRow gap={1} align="center">
        <TextInput
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && spec.trim() && status.kind !== "installing") {
              handleInstall();
            }
          }}
          placeholder="@scope/package or package@version"
          slotProps={{
            htmlInput: {
              "aria-label": t("packages:packs.packageToInstallAria")
            }
          }}
          fullWidth
          disabled={status.kind === "installing"}
        />
        <EditorButton
          variant="contained"
          onClick={handleInstall}
          disabled={!spec.trim() || status.kind === "installing"}
        >
          {status.kind === "installing"
            ? t("packages:button.installing")
            : t("packages:button.install")}
        </EditorButton>
      </FlexRow>
      {status.kind === "ok" && (
        <AlertBanner severity="success" compact>
          {status.message}
        </AlertBanner>
      )}
      {status.kind === "warn" && (
        <AlertBanner severity="warning" compact>
          {status.message}
        </AlertBanner>
      )}
      {status.kind === "err" && (
        <AlertBanner severity="error" compact>
          {status.message}
        </AlertBanner>
      )}
    </FlexColumn>
  );
});

function PackagesMenu() {
  const { t } = useTranslation("packages");
  const {
    packs,
    trust,
    isLoading,
    error,
    fetch,
    setTrusted,
    setAllowUnlisted,
    reload
  } = usePacksStore(
    useShallow((state) => ({
      packs: state.packs,
      trust: state.trust,
      isLoading: state.isLoading,
      error: state.error,
      fetch: state.fetch,
      setTrusted: state.setTrusted,
      setAllowUnlisted: state.setAllowUnlisted,
      reload: state.reload
    }))
  );

  const [installed, setInstalled] = useState<InstalledNodePack[]>([]);

  const refreshInstalled = useCallback(async () => {
    const api = nodePacksApi();
    if (!api) return;
    try {
      setInstalled(await api.listInstalled());
    } catch {
      setInstalled([]);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    void refreshInstalled();
  }, [refreshInstalled]);

  const trustedSet = new Set(trust.allowlist);
  const isTrusted = (name: string) =>
    trust.allowlist.includes("*") || trustedSet.has(name);

  return (
    <FlexColumn gap={3.5} sx={{ maxWidth: 880 }}>
      <FlexColumn gap={1.75}>
        <Text size="normal" weight={600}>
          {t("packages:packs.trustDefaults")}
        </Text>
        <FlexRow
          gap={3}
          align="center"
          sx={(theme) => ({
            px: 2.25,
            py: 2,
            borderRadius: BORDER_RADIUS.xl,
            border: `1px solid rgba(${theme.vars.palette.warning.mainChannel} / 0.18)`,
            backgroundColor: `rgba(${theme.vars.palette.warning.mainChannel} / 0.04)`
          })}
        >
          <FlexColumn gap={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Text size="normal" weight={500}>
              {t("packages:packs.allowUnlistedTitle")}
            </Text>
            <Text size="small" color="secondary">
              {t("packages:packs.allowUnlistedHint")}
            </Text>
          </FlexColumn>
          <LabeledSwitch
            label=""
            checked={trust.allowUnlisted}
            onChange={(v) => void setAllowUnlisted(v)}
          />
        </FlexRow>
      </FlexColumn>

      {isElectron && (
        <InstallPanel
          onInstalled={() => {
            void reload();
            void refreshInstalled();
          }}
        />
      )}

      {isElectron && (
        <InstalledPacksPanel
          packs={installed}
          onChanged={() => {
            void reload();
            void refreshInstalled();
          }}
        />
      )}

      <FlexColumn gap={1.75}>
        <FlexRow gap={1} align="center" justify="space-between">
          <Text size="normal" weight={600}>
            {t("packages:packs.discoveredCount", { count: packs.length })}
          </Text>
          <EditorButton
            variant="outlined"
            density="compact"
            onClick={() => void reload()}
            disabled={isLoading}
          >
            {isLoading
              ? t("packages:packs.reloading")
              : t("packages:packs.reload")}
          </EditorButton>
        </FlexRow>

        {error && (
          <AlertBanner severity="error" compact>
            {error}
          </AlertBanner>
        )}

        {!isLoading && packs.length === 0 ? (
          <FlexRow
            sx={(theme) => ({
              px: 2.75,
              py: 2.75,
              borderRadius: BORDER_RADIUS.xl,
              border: `1px dashed ${theme.vars.palette.divider}`,
              backgroundColor: theme.vars.palette.background.default
            })}
          >
            <Text size="small" color="secondary">
              <Trans
                ns="packages"
                i18nKey={
                  isElectron ? "packs.emptyElectron" : "packs.emptyPlain"
                }
                components={{ code: <code /> }}
              />
            </Text>
          </FlexRow>
        ) : (
          <FlexColumn gap={1.25}>
            {packs.map((pack) => (
              <PackRow
                key={pack.name}
                pack={pack}
                trusted={isTrusted(pack.name)}
                onTrustChange={(trusted) => void setTrusted(pack.name, trusted)}
              />
            ))}
          </FlexColumn>
        )}
      </FlexColumn>
    </FlexColumn>
  );
}

export default memo(PackagesMenu);
