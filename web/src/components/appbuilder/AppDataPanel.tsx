/**
 * The half of an application document Puck does not own: its operations,
 * variables, and resource bindings.
 *
 * Until this existed the three lists were reachable only through the agent's
 * `ui_app_*` tools, so declaring a variable or binding a second workflow meant
 * asking the agent to do it. Every edit goes through app-runtime's `doc-ops`,
 * the same pure functions the agent tools and the CLI harness call, so both
 * paths produce identical documents.
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useQuery } from "@tanstack/react-query";
import AddIcon from "@mui/icons-material/Add";
import {
  addOperation,
  addResource,
  declareVariable,
  removeOperation,
  removeResource,
  removeVariable,
  updateOperation,
  updateVariable,
  type AppDocMeta,
  type OperationBinding,
  type OperationPolicy,
  type ResourceBinding,
  type ResourceKind,
  type VariableDeclaration
} from "@nodetool-ai/app-runtime";

import { trpcClient } from "../../trpc/client";
import { workflowListQueryKey } from "../../serverState/workflowQueryKeys";
import {
  Box,
  Caption,
  Card,
  CollapsibleSection,
  DeleteButton,
  EditorButton,
  FlexColumn,
  FlexRow,
  LabeledSwitch,
  ScrollArea,
  SelectField,
  Text,
  TextInput,
  BORDER_RADIUS,
  SPACING
} from "../ui_primitives";

export interface AppDataPanelProps {
  meta: AppDocMeta;
  onChange: (next: AppDocMeta) => void;
  /** The workflow the builder opened with — the default for a new operation. */
  workflowId: string;
  workflowName?: string;
}

const policyOptions = (t: TFunction) => [
  { label: t("applications:dataPanel.policyReplace"), value: "replace" },
  { label: t("applications:dataPanel.policyQueue"), value: "queue" },
  { label: t("applications:dataPanel.policyParallel"), value: "parallel" }
];

const scopeOptions = (t: TFunction) => [
  { label: t("applications:dataPanel.scopeSession"), value: "instance" },
  { label: t("applications:dataPanel.scopeUser"), value: "user" }
];

/**
 * The node-SDK type names a variable may declare. A variable is a typed slot,
 * not a free-form bag, so the list is closed — anything richer is a node.
 */
const typeOptions = (t: TFunction) => [
  { label: t("applications:dataPanel.typeAny"), value: "" },
  { label: t("applications:dataPanel.typeText"), value: "str" },
  { label: t("applications:dataPanel.typeNumber"), value: "float" },
  { label: t("applications:dataPanel.typeInteger"), value: "int" },
  { label: t("applications:dataPanel.typeBoolean"), value: "bool" },
  { label: t("applications:dataPanel.typeList"), value: "list" },
  { label: t("applications:dataPanel.typeRecord"), value: "dict" }
];

const resourceKindOptions = (
  t: TFunction
): { label: string; value: ResourceKind }[] => [
  { label: t("applications:dataPanel.kindAsset"), value: "asset" },
  { label: t("applications:dataPanel.kindTimeline"), value: "timeline" },
  { label: t("applications:dataPanel.kindStoryboard"), value: "storyboard" },
  { label: t("applications:dataPanel.kindSketch"), value: "sketch" }
];

/** A row in one of the three lists: a bordered card with a delete affordance. */
const EntryCard: React.FC<{
  title: string;
  subtitle?: string;
  onDelete: () => void;
  deleteLabel: string;
  children: React.ReactNode;
}> = ({ title, subtitle, onDelete, deleteLabel, children }) => (
  <Card
    variant="outlined"
    padding="none"
    sx={{ p: SPACING.md, borderRadius: BORDER_RADIUS.md }}
  >
    <FlexColumn gap={SPACING.sm} fullWidth>
      <FlexRow align="center" justify="space-between" gap={SPACING.sm} fullWidth>
        <Box sx={{ minWidth: 0 }}>
          <Text size="small" weight={600} truncate>
            {title}
          </Text>
          {subtitle ? (
            <Caption color="secondary" sx={{ display: "block" }}>
              {subtitle}
            </Caption>
          ) : null}
        </Box>
        <DeleteButton onClick={onDelete} tooltip={deleteLabel} />
      </FlexRow>
      {children}
    </FlexColumn>
  </Card>
);

const OperationRow: React.FC<{
  operation: OperationBinding;
  workflowOptions: { label: string; value: string }[];
  onPatch: (patch: Partial<OperationBinding>) => void;
  onRemove: () => void;
}> = ({ operation, workflowOptions, onPatch, onRemove }) => {
  const { t } = useTranslation("applications");
  // A release pins a workflow this app can no longer list (deleted, or owned
  // elsewhere); keep it selectable rather than silently switching the binding.
  const options = workflowOptions.some((o) => o.value === operation.workflowId)
    ? workflowOptions
    : [
        { label: operation.workflowId, value: operation.workflowId },
        ...workflowOptions
      ];
  return (
    <EntryCard
      title={operation.name || operation.id}
      subtitle={`id: ${operation.id}`}
      onDelete={onRemove}
      deleteLabel={t("applications:dataPanel.removeOperation", {
        name: operation.name || operation.id
      })}
    >
      <TextInput
        label={t("applications:dataPanel.name")}
        value={operation.name}
        size="small"
        fullWidth
        onChange={(e) => onPatch({ name: e.target.value })}
      />
      <SelectField
        label={t("applications:dataPanel.workflow")}
        value={operation.workflowId}
        options={options}
        onChange={(value) => onPatch({ workflowId: value })}
      />
      <SelectField
        label={t("applications:dataPanel.whileRunning")}
        value={operation.policy}
        options={policyOptions(t)}
        onChange={(value) => onPatch({ policy: value as OperationPolicy })}
      />
      <TextInput
        label={t("applications:dataPanel.timeoutMs")}
        type="number"
        value={operation.timeoutMs == null ? "" : String(operation.timeoutMs)}
        size="small"
        fullWidth
        onChange={(e) =>
          onPatch({
            timeoutMs: e.target.value === "" ? undefined : Number(e.target.value)
          })
        }
      />
    </EntryCard>
  );
};

const VariableRow: React.FC<{
  variable: VariableDeclaration;
  onPatch: (patch: Partial<VariableDeclaration>) => void;
  onRemove: () => void;
}> = ({ variable, onPatch, onRemove }) => {
  const { t } = useTranslation("applications");
  return (
  <EntryCard
    title={variable.name || variable.id}
    subtitle={`var:${variable.id}`}
    onDelete={onRemove}
    deleteLabel={t("applications:dataPanel.removeVariable", {
      name: variable.name || variable.id
    })}
  >
    <TextInput
      label={t("applications:dataPanel.name")}
      value={variable.name}
      size="small"
      fullWidth
      onChange={(e) => onPatch({ name: e.target.value })}
    />
    <SelectField
      label={t("applications:dataPanel.type")}
      value={variable.type?.type ?? ""}
      options={typeOptions(t)}
      onChange={(value) => onPatch({ type: value ? { type: value } : null })}
    />
    <TextInput
      label={t("applications:dataPanel.default")}
      value={variable.default == null ? "" : String(variable.default)}
      size="small"
      fullWidth
      onChange={(e) =>
        onPatch({ default: e.target.value === "" ? undefined : e.target.value })
      }
    />
    <SelectField
      label={t("applications:dataPanel.scope")}
      value={variable.scope}
      options={scopeOptions(t)}
      onChange={(value) => onPatch({ scope: value as "instance" | "user" })}
    />
    <LabeledSwitch
      // The label associates through `htmlFor`, so the control needs an id.
      id={`persist-${variable.id}`}
      label={t("applications:dataPanel.rememberBetweenVisits")}
      checked={variable.persist}
      // doc-ops downgrades persist on an instance-scoped variable, so the
      // control says why it will not stick rather than letting it flip back.
      disabled={variable.scope !== "user"}
      onChange={(checked) => onPatch({ persist: checked })}
    />
    {variable.scope !== "user" ? (
      <Caption color="secondary">{t("applications:dataPanel.rememberHint")}</Caption>
    ) : null}
  </EntryCard>
  );
};

const ResourceRow: React.FC<{
  resource: ResourceBinding;
  onRemove: () => void;
}> = ({ resource, onRemove }) => {
  const { t } = useTranslation("applications");
  return (
  <EntryCard
    title={resource.name || resource.id}
    subtitle={`${resource.kind} · ${
      resource.scope.fixedId
        ? `pinned ${resource.scope.fixedId}`
        : `project ${resource.scope.projectId}`
    }`}
    onDelete={onRemove}
    deleteLabel={t("applications:dataPanel.removeResource", {
      name: resource.name || resource.id
    })}
  >
    <Caption color="secondary">
      {t("applications:dataPanel.allows", {
        operations: resource.operations.join(", ")
      })}
    </Caption>
  </EntryCard>
  );
};

/** The "add a resource binding" form — the one entry that needs a scope up front. */
const AddResourceForm: React.FC<{ onAdd: (input: {
  name: string;
  kind: ResourceKind;
  projectId: string;
}) => void }> = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("asset");
  const [projectId, setProjectId] = useState("");
  const { t } = useTranslation("applications");

  const submit = useCallback(() => {
    if (!projectId.trim()) return;
    onAdd({ name: name.trim() || kind, kind, projectId: projectId.trim() });
    setName("");
    setProjectId("");
  }, [kind, name, onAdd, projectId]);

  return (
    <FlexColumn gap={SPACING.sm} fullWidth>
      <TextInput
        label={t("applications:dataPanel.name")}
        value={name}
        size="small"
        fullWidth
        onChange={(e) => setName(e.target.value)}
      />
      <SelectField
        label={t("applications:dataPanel.kind")}
        value={kind}
        options={resourceKindOptions(t)}
        onChange={(value) => setKind(value as ResourceKind)}
      />
      <TextInput
        label={t("applications:dataPanel.projectId")}
        value={projectId}
        size="small"
        fullWidth
        onChange={(e) => setProjectId(e.target.value)}
      />
      <EditorButton
        size="small"
        variant="outlined"
        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        disabled={!projectId.trim()}
        onClick={submit}
      >
        {t("applications:dataPanel.addResource")}
      </EditorButton>
    </FlexColumn>
  );
};

const AppDataPanel: React.FC<AppDataPanelProps> = ({
  meta,
  onChange,
  workflowId,
  workflowName
}) => {
  const { t } = useTranslation("applications");
  const { data: workflows } = useQuery({
    queryKey: workflowListQueryKey(200),
    queryFn: () => trpcClient.workflows.list.query({ limit: 200 }),
    staleTime: 60_000
  });

  const workflowOptions = useMemo(() => {
    const listed = (workflows?.workflows ?? []).map((workflow) => ({
      label: workflow.name || workflow.id,
      value: workflow.id
    }));
    if (!workflowId || listed.some((o) => o.value === workflowId)) return listed;
    return [{ label: workflowName || workflowId, value: workflowId }, ...listed];
  }, [workflowId, workflowName, workflows]);

  const addOp = useCallback(() => {
    if (!workflowId) return;
    onChange(
      addOperation(meta, {
        name: `Operation ${meta.operations.length + 1}`,
        workflowId
      }).meta
    );
  }, [meta, onChange, workflowId]);

  const addVar = useCallback(() => {
    onChange(
      declareVariable(meta, {
        name: `variable_${meta.variables.length + 1}`,
        scope: "instance"
      }).meta
    );
  }, [meta, onChange]);

  const addRes = useCallback(
    (input: { name: string; kind: ResourceKind; projectId: string }) => {
      onChange(
        addResource(meta, {
          name: input.name,
          kind: input.kind,
          scope: { projectId: input.projectId }
        }).meta
      );
    },
    [meta, onChange]
  );

  return (
    <ScrollArea fullHeight>
      <FlexColumn gap={SPACING.lg} padding={SPACING.lg} fullWidth>
        <CollapsibleSection title={t("applications:dataPanel.operations")} defaultOpen compact>
          <FlexColumn gap={SPACING.md} fullWidth>
            <Caption color="secondary">
              {t("applications:dataPanel.operationsHint")}
            </Caption>
            {meta.operations.map((operation) => (
              <OperationRow
                key={operation.id}
                operation={operation}
                workflowOptions={workflowOptions}
                onPatch={(patch) =>
                  onChange(updateOperation(meta, operation.id, patch).meta)
                }
                onRemove={() =>
                  onChange(removeOperation(meta, operation.id).meta)
                }
              />
            ))}
            <EditorButton
              size="small"
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              disabled={!workflowId}
              onClick={addOp}
            >
              {t("applications:dataPanel.addOperation")}
            </EditorButton>
          </FlexColumn>
        </CollapsibleSection>

        <CollapsibleSection title={t("applications:dataPanel.variables")} defaultOpen compact>
          <FlexColumn gap={SPACING.md} fullWidth>
            <Caption color="secondary">
              {t("applications:dataPanel.variablesHint")}
            </Caption>
            {meta.variables.map((variable) => (
              <VariableRow
                key={variable.id}
                variable={variable}
                onPatch={(patch) =>
                  onChange(updateVariable(meta, variable.id, patch).meta)
                }
                onRemove={() => onChange(removeVariable(meta, variable.id).meta)}
              />
            ))}
            <EditorButton
              size="small"
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={addVar}
            >
              {t("applications:dataPanel.addVariable")}
            </EditorButton>
          </FlexColumn>
        </CollapsibleSection>

        <CollapsibleSection title={t("applications:dataPanel.resources")} compact>
          <FlexColumn gap={SPACING.md} fullWidth>
            <Caption color="secondary">
              {t("applications:dataPanel.resourcesHint")}
            </Caption>
            {meta.resources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                onRemove={() => onChange(removeResource(meta, resource.id).meta)}
              />
            ))}
            <AddResourceForm onAdd={addRes} />
          </FlexColumn>
        </CollapsibleSection>
      </FlexColumn>
    </ScrollArea>
  );
};

export default AppDataPanel;
