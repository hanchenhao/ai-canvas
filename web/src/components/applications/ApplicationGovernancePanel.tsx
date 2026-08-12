/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { RouterOutputs } from "../../trpc/client";
import {
  useApplicationBudget,
  useApplicationInvocations,
  useApplicationUsage,
  useApplicationVersions,
  usePublishApplication,
  useReleaseApplicationVersion,
  useReleasedApplicationVersion,
  useSetApplicationBudget
} from "../../hooks/useApplications";
import {
  AlertBanner,
  Button,
  Caption,
  Chip,
  Divider,
  EmptyState,
  FlexColumn,
  FlexRow,
  LoadingSpinner,
  SectionHeader,
  SelectField,
  Text,
  TextInput,
  SPACING
} from "../ui_primitives";

type Version = RouterOutputs["applications"]["versions"][number];
type BudgetPeriod = RouterOutputs["applications"]["setBudget"]["period"];

const PERIOD_OPTIONS = [
  { value: "day", labelKey: "budget.periodDay" },
  { value: "month", labelKey: "budget.periodMonth" },
  { value: "total", labelKey: "budget.periodTotal" }
] as const;

const isBudgetPeriod = (value: string): value is BudgetPeriod =>
  PERIOD_OPTIONS.some((option) => option.value === value);

const formatUsd = (value: number): string => `$${value.toFixed(4)}`;

const formatDate = (iso: string): string => new Date(iso).toLocaleString();

type ParsedLimit = { ok: true; value: number | null } | { ok: false };

/** Empty means no ceiling; anything else must be a non-negative number. */
const parseLimit = (raw: string): ParsedLimit => {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0
    ? { ok: true, value }
    : { ok: false };
};

const LIMIT_HINT_KEY = "budget.limitHint";

/** "2 workflows · asset (read, create)" — what a release is allowed to touch. */
const capabilitySummary = (
  version: Version,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const workflows = version.capabilities.workflows.length;
  const parts = [
    t(
      workflows === 1
        ? "versions.workflowCount"
        : "versions.workflowCountOther",
      { count: workflows }
    ),
    ...version.capabilities.resources.map(
      (resource) => `${resource.kind} (${resource.operations.join(", ")})`
    )
  ];
  return parts.join(" · ");
};

interface VersionRowProps {
  version: Version;
  onRelease: (version: number) => void;
  releasing: boolean;
}

const VersionRow = memo(function VersionRow({
  version,
  onRelease,
  releasing
}: VersionRowProps) {
  const { t } = useTranslation("applications");
  const handleRelease = useCallback(
    () => onRelease(version.version),
    [onRelease, version.version]
  );
  return (
    <FlexRow align="center" justify="space-between" gap={2} fullWidth>
      <FlexColumn gap={0.5} sx={{ minWidth: 0 }}>
        <FlexRow align="center" gap={1}>
          <Text weight={600}>{t("version.versionN", { n: version.version })}</Text>
          {version.released && (
            <Chip label={t("version.released")} size="small" />
          )}
        </FlexRow>
        <Caption>{capabilitySummary(version, t)}</Caption>
        <Caption>{formatDate(version.createdAt)}</Caption>
      </FlexColumn>
      {!version.released && (
        <Button
          size="small"
          variant="outlined"
          disabled={releasing}
          onClick={handleRelease}
        >
          {t("version.rollbackTo", { n: version.version })}
        </Button>
      )}
    </FlexRow>
  );
});

interface BudgetSectionProps {
  applicationId: string;
}

const BudgetSection = memo(function BudgetSection({
  applicationId
}: BudgetSectionProps) {
  const { t } = useTranslation("applications");
  const periodOptions = useMemo(
    () =>
      PERIOD_OPTIONS.map((o) => ({
        value: o.value,
        label: t(o.labelKey as `budget.${string}`)
      })),
    [t]
  );
  const {
    data: budget,
    isLoading,
    isError,
    error
  } = useApplicationBudget(applicationId);
  const { data: usage } = useApplicationUsage(applicationId);
  const setBudget = useSetApplicationBudget();

  const [period, setPeriod] = useState<BudgetPeriod>("month");
  const [maxUsd, setMaxUsd] = useState("");
  const [maxInvocations, setMaxInvocations] = useState("");

  // Seed the form from the stored budget once it arrives (and whenever the
  // app changes), so the fields show what is actually in force.
  useEffect(() => {
    setPeriod(budget?.period ?? "month");
    setMaxUsd(budget?.maxUsd == null ? "" : String(budget.maxUsd));
    setMaxInvocations(
      budget?.maxInvocations == null ? "" : String(budget.maxInvocations)
    );
  }, [budget]);

  const handlePeriodChange = useCallback((value: string) => {
    if (isBudgetPeriod(value)) setPeriod(value);
  }, []);

  const parsedUsd = parseLimit(maxUsd);
  const parsedInvocations = parseLimit(maxInvocations);
  const canSave = parsedUsd.ok && parsedInvocations.ok;

  const handleSave = useCallback(() => {
    const usd = parseLimit(maxUsd);
    const invocations = parseLimit(maxInvocations);
    if (!usd.ok || !invocations.ok) return;
    setBudget.mutate({
      id: applicationId,
      period,
      maxUsd: usd.value,
      maxInvocations: invocations.value
    });
  }, [applicationId, maxInvocations, maxUsd, period, setBudget]);

  if (isLoading) return <LoadingSpinner text={t("loading.budget")} />;

  if (isError) {
    return (
      <AlertBanner severity="error">
        {error?.message
          ? t("error.loadBudget", { message: error.message })
          : t("error.loadBudgetFallback")}
      </AlertBanner>
    );
  }

  return (
    <FlexColumn gap={SPACING.md} fullWidth>
      <SectionHeader title={t("budget.title")} />
      <Caption>{t("budget.description")}</Caption>
      <SelectField
        label={t("budget.period")}
        value={period}
        onChange={handlePeriodChange}
        options={periodOptions}
        size="small"
      />
      <TextInput
        label={t("budget.maxSpend")}
        size="small"
        inputMode="decimal"
        value={maxUsd}
        errorMessage={parsedUsd.ok ? undefined : t(LIMIT_HINT_KEY)}
        onChange={(event) => setMaxUsd(event.target.value)}
      />
      <TextInput
        label={t("budget.maxInvocations")}
        size="small"
        inputMode="numeric"
        value={maxInvocations}
        errorMessage={parsedInvocations.ok ? undefined : t(LIMIT_HINT_KEY)}
        onChange={(event) => setMaxInvocations(event.target.value)}
      />
      <FlexRow gap={2} align="center">
        <Button
          variant="contained"
          size="small"
          disabled={setBudget.isPending || !canSave}
          onClick={handleSave}
        >
          {t("budget.save")}
        </Button>
      </FlexRow>
      {setBudget.isError && (
        <AlertBanner severity="error">
          {t("error.saveBudget", { message: setBudget.error.message })}
        </AlertBanner>
      )}
      {usage && (
        <Caption>
          {t("budget.usageSummary", {
            spent: formatUsd(usage.spentUsd),
            count: usage.invocations,
            since: usage.since
              ? t("budget.sinceDate", { date: formatDate(usage.since) })
              : ""
          })}
        </Caption>
      )}
    </FlexColumn>
  );
});

interface InvocationsSectionProps {
  applicationId: string;
}

const InvocationsSection = memo(function InvocationsSection({
  applicationId
}: InvocationsSectionProps) {
  const { t } = useTranslation("applications");
  const { data, isLoading, isError, error } =
    useApplicationInvocations(applicationId);

  if (isLoading) return <LoadingSpinner text={t("loading.invocations")} />;

  if (isError) {
    return (
      <AlertBanner severity="error">
        {error?.message
          ? t("error.loadInvocations", { message: error.message })
          : t("error.loadInvocationsFallback")}
      </AlertBanner>
    );
  }

  const invocations = data ?? [];

  return (
    <FlexColumn gap={SPACING.md} fullWidth>
      <SectionHeader title={t("invocations.title")} />
      {invocations.length === 0 ? (
        <EmptyState
          title={t("empty.noInvocations")}
          description={t("empty.noInvocationsDesc")}
        />
      ) : (
        <FlexColumn gap={SPACING.sm} fullWidth>
          {invocations.map((record) => (
            <FlexRow
              key={record.id}
              align="center"
              justify="space-between"
              gap={2}
              fullWidth
            >
              <FlexColumn gap={0.5} sx={{ minWidth: 0 }}>
                <Text weight={600}>{record.operationId}</Text>
                <Caption>
                  {`${formatDate(record.createdAt)} · ${record.status}${
                    record.version === null ? "" : ` · v${record.version}`
                  }`}
                </Caption>
              </FlexColumn>
              <Text>
                {formatUsd(record.actualUsd ?? record.estimatedUsd)}
                {record.actualUsd === null ? t("invocations.estimated") : ""}
              </Text>
            </FlexRow>
          ))}
        </FlexColumn>
      )}
    </FlexColumn>
  );
});

export interface ApplicationGovernancePanelProps {
  applicationId: string;
}

/**
 * Publish and governance for one app: cut a version, see what each version is
 * allowed to do, roll the release back, and cap what the released app may
 * spend.
 */
const ApplicationGovernancePanel = ({
  applicationId
}: ApplicationGovernancePanelProps) => {
  const { t } = useTranslation("applications");
  const {
    data: versions,
    isLoading,
    isError,
    error
  } = useApplicationVersions(applicationId);
  const { data: released } = useReleasedApplicationVersion(applicationId);
  const publish = usePublishApplication();
  const release = useReleaseApplicationVersion();

  const handlePublish = useCallback(() => {
    publish.mutate({ id: applicationId });
  }, [applicationId, publish]);

  const handleRelease = useCallback(
    (version: number) => {
      release.mutate({ id: applicationId, version });
    },
    [applicationId, release]
  );

  const sortedVersions = useMemo(
    () => [...(versions ?? [])].sort((a, b) => b.version - a.version),
    [versions]
  );

  return (
    <FlexColumn gap={SPACING.lg} fullWidth>
      <FlexRow align="center" justify="space-between" gap={2} fullWidth>
        <FlexColumn gap={0.5}>
          <SectionHeader title={t("release.title")} />
          <Caption>
            {released
              ? t("release.serving", {
                  n: released.version,
                  summary: capabilitySummary(released, t)
                })
              : t("release.nothingReleased")}
          </Caption>
        </FlexColumn>
        <Button
          variant="contained"
          size="small"
          disabled={publish.isPending}
          onClick={handlePublish}
        >
          {t("release.publish")}
        </Button>
      </FlexRow>
      {publish.isError && (
        <AlertBanner severity="error">
          {t("error.publish", { message: publish.error.message })}
        </AlertBanner>
      )}
      {release.isError && (
        <AlertBanner severity="error">
          {t("error.release", { message: release.error.message })}
        </AlertBanner>
      )}

      <Divider />

      <FlexColumn gap={SPACING.md} fullWidth>
        <SectionHeader title={t("versions.title")} />
        {isLoading ? (
          <LoadingSpinner text={t("loading.versions")} />
        ) : isError ? (
          <AlertBanner severity="error">
            {error?.message
              ? t("error.loadVersions", { message: error.message })
              : t("error.loadVersionsFallback")}
          </AlertBanner>
        ) : sortedVersions.length === 0 ? (
          <EmptyState
            title={t("empty.noVersions")}
            description={t("empty.noVersionsDesc")}
          />
        ) : (
          <FlexColumn gap={SPACING.md} fullWidth>
            {sortedVersions.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                onRelease={handleRelease}
                releasing={release.isPending}
              />
            ))}
          </FlexColumn>
        )}
      </FlexColumn>

      <Divider />

      <BudgetSection applicationId={applicationId} />

      <Divider />

      <InvocationsSection applicationId={applicationId} />
    </FlexColumn>
  );
};

export default memo(ApplicationGovernancePanel);
