/** @jsxImportSource @emotion/react */
/**
 * Editor toolbar control for arming a workflow's trigger nodes.
 *
 * Renders nothing for a workflow whose graph has no trigger nodes. For a
 * workflow that does, it shows an aggregate Active/Partly active/Inactive
 * toggle plus a per-trigger row (kind, its own enable switch, schedule, last
 * fired, last error, "Fire now") and, for a webhook trigger, its delivery URL
 * and shared secret.
 *
 * Backed by `triggers.listByWorkflow`
 * (`packages/websocket/src/trpc/routers/triggers.ts`), which returns every
 * registration for the workflow — enabled or not — so every trigger node has
 * a discoverable registration id and the toggle can arm a trigger that has
 * never been enabled before.
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Popover,
  ToolbarIconButton,
  LabeledSwitch,
  StatusIndicator,
  FlexColumn,
  FlexRow,
  Text,
  Label,
  Caption,
  Divider,
  EditorButton,
  TextInput,
  CopyButton,
  SPACING,
  BORDER_RADIUS,
  getSpacingPx
} from "../ui_primitives";
import BoltIcon from "@mui/icons-material/Bolt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useNodes } from "../../contexts/NodeContext";
import type { NodeStoreState } from "../../stores/NodeStore";
import {
  useWorkflowTriggers,
  useSetTriggerEnabled,
  useFireTrigger,
  webhookDeliveryUrl,
  type TriggerRegistrationStatus
} from "../../serverState/useTriggers";
import {
  TRIGGER_KIND_BY_NODE_TYPE,
  describeTriggerDisabledReason,
  isTriggerNodeType
} from "@nodetool-ai/protocol";
import { formatSchedule } from "../../utils/triggerSchedule";

/** Stable empty fallback, so a pending query doesn't hand every render a new
 * array identity and re-create the callbacks that close over it. */
const NO_REGISTRATIONS: readonly TriggerRegistrationStatus[] = [];

interface TriggerNodeSummary {
  nodeId: string;
  kind: string;
}

/** Aggregate of every registration behind the workflow-level switch. */
type ActivationState =
  | "loading"
  | "error"
  | "unregistered"
  | "inactive"
  | "mixed"
  | "active";

const TRIGGER_KIND_KEYS: Readonly<Record<string, string>> = {
  webhook: "kindWebhook",
  schedule: "kindSchedule",
  file_watch: "kindFileWatch",
  manual: "kindManual"
};

const kindLabel = (t: TFunction, kind: string): string =>
  TRIGGER_KIND_KEYS[kind] ? t(`common:panels.${TRIGGER_KIND_KEYS[kind]}`) : kind;

const formatLastFired = (t: TFunction, iso: string | null): string => {
  if (!iso) return t("common:panels.never");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

/** Text on the workflow-level switch — honest about what we actually know. */
const SWITCH_DESCRIPTION_KEYS: Readonly<Record<ActivationState, string>> = {
  loading: "switchChecking",
  error: "switchLoadError",
  unregistered: "switchUnregistered",
  inactive: "switchListens",
  mixed: "switchMixed",
  active: "switchListens"
};

const STATUS_LABEL_KEYS: Readonly<Record<ActivationState, string>> = {
  loading: "stateLoading",
  error: "stateUnavailable",
  unregistered: "stateNotRegistered",
  inactive: "stateInactive",
  mixed: "stateMixed",
  active: "stateActive"
};

const STATUS_KINDS: Readonly<
  Record<ActivationState, "success" | "error" | "warning" | "pending" | "default">
> = {
  loading: "pending",
  error: "error",
  unregistered: "default",
  inactive: "default",
  mixed: "warning",
  active: "success"
};

interface WebhookDeliveryDetailsProps {
  webhookToken: string;
  webhookSecret: string;
}

/** The delivery URL and shared secret a sender needs to POST events. The
 * secret stays masked until the user explicitly reveals it. */
const WebhookDeliveryDetails: React.FC<WebhookDeliveryDetailsProps> = ({
  webhookToken,
  webhookSecret
}) => {
  const { t } = useTranslation("common");
  const [revealed, setRevealed] = useState(false);
  const url = webhookDeliveryUrl(webhookToken);

  return (
    <FlexColumn gap={SPACING.xs}>
      <FlexRow gap={SPACING.xs} align="center">
        <TextInput
          label={t("common:panels.webhookUrl")}
          hideLabel
          value={url}
          size="small"
          fullWidth
          slotProps={{ input: { readOnly: true } }}
        />
        <CopyButton value={url} tooltip={t("common:panels.copyWebhookUrl")} />
      </FlexRow>
      <FlexRow gap={SPACING.xs} align="center">
        <TextInput
          label={t("common:panels.webhookSecret")}
          hideLabel
          type={revealed ? "text" : "password"}
          value={webhookSecret}
          size="small"
          fullWidth
          slotProps={{ input: { readOnly: true } }}
        />
        <ToolbarIconButton
          icon={
            revealed ? (
              <VisibilityOffIcon fontSize="small" />
            ) : (
              <VisibilityIcon fontSize="small" />
            )
          }
          tooltip={revealed ? t("common:panels.hideSecret") : t("common:panels.showSecret")}
          ariaLabel={revealed ? t("common:panels.hideWebhookSecret") : t("common:panels.showWebhookSecret")}
          onClick={() => setRevealed((r) => !r)}
        />
        <CopyButton value={webhookSecret} tooltip={t("common:panels.copyWebhookSecret")} />
      </FlexRow>
      <Caption>{t("common:panels.sendWebhookHeader")}</Caption>
    </FlexColumn>
  );
};

const TriggerActivationButton: React.FC = () => {
  const { t } = useTranslation("common");
  const workflowId = useNodes((state) => state.workflow?.id || null);
  // This button sits in the always-mounted floating toolbar, and a node drag
  // pushes a fresh `nodes` array ~60x/s. Collect in one pass rather than
  // filter-then-map, and hand back the previous array whenever the trigger set
  // is unchanged — the common case, since most workflows have none at all. The
  // stable reference also replaces the per-frame deep `isEqual` with identity.
  const triggerNodesSelector = useMemo(() => {
    let lastResult: TriggerNodeSummary[] = [];
    return (state: NodeStoreState) => {
      const next: TriggerNodeSummary[] = [];
      for (const node of state.nodes) {
        if (!isTriggerNodeType(node.type)) continue;
        next.push({
          nodeId: node.id,
          kind: TRIGGER_KIND_BY_NODE_TYPE[node.type as string] ?? "manual"
        });
      }
      if (
        next.length === lastResult.length &&
        next.every(
          (t, i) =>
            t.nodeId === lastResult[i].nodeId && t.kind === lastResult[i].kind
        )
      ) {
        return lastResult;
      }
      lastResult = next;
      return next;
    };
  }, []);
  const triggerNodes = useNodes(triggerNodesSelector);
  const hasTriggerNodes = triggerNodes.length > 0;

  const {
    data: registrations,
    isLoading,
    isError
  } = useWorkflowTriggers(workflowId, { enabled: hasTriggerNodes });
  const rows = registrations ?? NO_REGISTRATIONS;
  const setTriggerEnabled = useSetTriggerEnabled(workflowId);
  const fireTrigger = useFireTrigger(workflowId);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
    []
  );
  const handleClose = useCallback(() => setAnchorEl(null), []);

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows]);
  const state: ActivationState = isLoading
    ? "loading"
    : isError
      ? "error"
      : rows.length === 0
        ? "unregistered"
        : enabledCount === 0
          ? "inactive"
          : enabledCount === rows.length
            ? "active"
            : "mixed";
  // A trigger the dispatcher gave up on is a failure the user has to see, even
  // though the row now reads as plain "Inactive".
  const hasError = rows.some((r) => r.last_error || r.disabled_reason);
  const canToggle = state !== "loading" && state !== "error" && rows.length > 0;

  const handleToggle = useCallback(
    async (nextActive: boolean) => {
      // Sequential, not a parallel fan-out: each call invalidates the same
      // query key, and a failure part-way through must not stop the rest.
      for (const reg of rows.filter((r) => r.enabled !== nextActive)) {
        try {
          await setTriggerEnabled.mutateAsync({
            id: reg.id,
            enabled: nextActive
          });
        } catch {
          // The mutation's onError already told the user. Keep going so one
          // rejected registration doesn't strand the others.
        }
      }
    },
    [rows, setTriggerEnabled]
  );

  const handleRowToggle = useCallback(
    (registrationId: string, nextEnabled: boolean) => {
      setTriggerEnabled.mutate({ id: registrationId, enabled: nextEnabled });
    },
    [setTriggerEnabled]
  );

  const handleFire = useCallback(
    (registrationId: string) => {
      fireTrigger.mutate({ registrationId });
    },
    [fireTrigger]
  );

  if (!hasTriggerNodes) {
    return null;
  }

  // Lowercase matches the pre-i18n label ("Triggers: active"); no-op for CJK.
  const stateLabel = t(`common:panels.${STATUS_LABEL_KEYS[state]}`).toLowerCase();
  const buttonLabel = rows.some((r) => r.disabled_reason)
    ? t("common:panels.triggersButtonStateDisabled", { state: stateLabel })
    : hasError && (state === "active" || state === "mixed")
      ? t("common:panels.triggersButtonStateFailed", { state: stateLabel })
      : t("common:panels.triggersButtonState", { state: stateLabel });

  return (
    <>
      <ToolbarIconButton
        className="composer-action"
        icon={<BoltIcon />}
        tooltip={buttonLabel}
        onClick={handleOpen}
        active={state === "active" || state === "mixed"}
        variant={hasError || state === "error" ? "error" : "default"}
        ariaLabel={buttonLabel}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        placement="bottom-right"
      >
        <FlexColumn
          gap={SPACING.lg}
          padding={SPACING.xl}
          sx={{
            // Full 360px on a desktop toolbar; inset by one panel gutter on a
            // phone, where the popover would otherwise overflow the viewport.
            width: `min(360px, calc(100vw - ${getSpacingPx(SPACING.xxxl)}))`
          }}
          role="region"
          aria-label={t("common:panels.triggerStatus")}
        >
          <FlexRow justify="space-between" align="center">
            <Text size="big">{t("common:panels.triggers")}</Text>
            <StatusIndicator
              status={STATUS_KINDS[state]}
              label={t(`common:panels.${STATUS_LABEL_KEYS[state]}`)}
              size="small"
            />
          </FlexRow>

          <LabeledSwitch
            label={t("common:panels.workflowActive")}
            description={t(`common:panels.${SWITCH_DESCRIPTION_KEYS[state]}`)}
            checked={state === "active"}
            onChange={(next) => {
              void handleToggle(next);
            }}
            disabled={!canToggle}
            id="trigger-activation-switch"
          />

          <Divider />

          <FlexColumn gap={SPACING.md}>
            {triggerNodes.map(({ nodeId, kind }) => {
              const reg: TriggerRegistrationStatus | undefined = rows.find(
                (r) => r.node_id === nodeId
              );
              const schedule =
                kind === "schedule"
                  ? formatSchedule(reg?.interval_seconds, reg?.next_fire_at)
                  : null;
              const stoppedBecause = describeTriggerDisabledReason(
                reg?.disabled_reason,
                reg?.consecutive_failures
              );
              return (
                <FlexColumn
                  key={nodeId}
                  gap={SPACING.xs}
                  role="group"
                  aria-label={t("common:panels.triggerGroupAria", { kind: kindLabel(t, kind), id: nodeId })}
                  sx={{
                    borderRadius: BORDER_RADIUS.md,
                    padding: SPACING.md
                  }}
                >
                  <FlexRow justify="space-between" align="center">
                    <Label>{kindLabel(t, kind)}</Label>
                    <StatusIndicator
                      status={
                        reg?.enabled
                          ? "success"
                          : stoppedBecause
                            ? "error"
                            : "pending"
                      }
                      label={
                        reg?.enabled
                          ? t("common:panels.triggerActive")
                          : stoppedBecause
                            ? t("common:panels.triggerStopped")
                            : t("common:panels.triggerInactive")
                      }
                      size="small"
                    />
                  </FlexRow>
                  <LabeledSwitch
                    size="small"
                    label={t("common:panels.triggerEnabled")}
                    checked={Boolean(reg?.enabled)}
                    disabled={!reg}
                    onChange={(next) => reg && handleRowToggle(reg.id, next)}
                    id={`trigger-enabled-${nodeId}`}
                  />
                  {isLoading && <Caption>{t("common:panels.checkingStatus")}</Caption>}
                  {isError && (
                    <Caption color="error">
                      {t("common:panels.triggerLoadError")}
                    </Caption>
                  )}
                  {schedule && <Caption>{schedule}</Caption>}
                  {!isLoading && !isError && (
                    <Caption>
                      {t("common:panels.lastFired", { time: formatLastFired(t, reg?.last_fired_at ?? null) })}
                    </Caption>
                  )}
                  {stoppedBecause && (
                    <Caption color="error">
                      {stoppedBecause} {t("common:panels.triggerRetryHint")}
                    </Caption>
                  )}
                  {reg?.last_error && (
                    <Caption color="error">{t("common:panels.lastError", { message: reg.last_error })}</Caption>
                  )}
                  {kind === "webhook" &&
                    reg?.webhook_token &&
                    reg?.webhook_secret && (
                      <WebhookDeliveryDetails
                        webhookToken={reg.webhook_token}
                        webhookSecret={reg.webhook_secret}
                      />
                    )}
                  <FlexRow justify="flex-end">
                    <EditorButton
                      size="small"
                      disabled={!reg?.enabled || fireTrigger.isPending}
                      onClick={() => reg && handleFire(reg.id)}
                    >
                      {t("common:panels.fireNow")}
                    </EditorButton>
                  </FlexRow>
                </FlexColumn>
              );
            })}
          </FlexColumn>
        </FlexColumn>
      </Popover>
    </>
  );
};

export default TriggerActivationButton;
