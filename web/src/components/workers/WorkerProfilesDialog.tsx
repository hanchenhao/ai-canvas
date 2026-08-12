import React, { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlexColumn,
  FlexRow,
  Card,
  Text,
  Caption,
  Chip,
  Dialog,
  EditorButton,
  TextInput,
  SelectField,
  CollapsibleSection,
  AlertBanner,
  WarningBanner
} from "../ui_primitives";
import type {
  CreateWorkerProfileInput,
  WorkerProfile,
  WorkerTarget,
  TokenPolicy
} from "../../hooks/useWorkers";

// The secret each provider's API needs before a worker can be provisioned.
const API_KEY_BY_TARGET: Record<WorkerTarget, string> = {
  runpod: "RUNPOD_API_KEY",
  vast: "VAST_API_KEY"
};

// A profile is a reusable template (target, image, GPU spec, token policy,
// lifecycle limits); provisioning rents a GPU box from it.

// The default NodeTool worker image. Editable — only override if you publish
// your own build of `python -m nodetool.worker`.
const DEFAULT_WORKER_IMAGE = "ghcr.io/nodetool-ai/nodetool-worker:latest";
// Combined worker + ComfyUI image. A worker from this image fronts a
// loopback-only ComfyUI and reports `worker.status.comfy.enabled: true`, so it
// can run the "Run ComfyUI Workflow (Worker)" node.
const COMFY_WORKER_IMAGE = "ghcr.io/nodetool-ai/nodetool-worker-comfy:latest";
// Sentinel select value that keeps the free-text image field for a custom build.
const CUSTOM_IMAGE = "__custom_image__";
const IMAGE_PRESETS = [
  { value: DEFAULT_WORKER_IMAGE, labelKey: "option.nodeToolWorker" },
  { value: COMFY_WORKER_IMAGE, labelKey: "option.nodeToolWorkerComfy" },
  { value: CUSTOM_IMAGE, labelKey: "option.customImage" }
] as const;
const DEFAULT_IDLE_TIMEOUT = "30";
// Persistent volume default — big enough for several HF image models. Models
// download here and survive a stop/resume.
const DEFAULT_DISK_GB = "100";

// Sentinel select value that reveals a free-text GPU id field for ids not in
// the curated list below.
const CUSTOM_GPU = "__custom__";

const TARGET_OPTIONS = [
  { value: "runpod", label: "RunPod" },
  { value: "vast", label: "Vast" }
] as const;

// GPU ids are PROVIDER-NATIVE and differ per target: RunPod wants the full
// `gpuTypeId` ("NVIDIA A40"), Vast wants its short `gpu_name` ("A40"). The
// dropdowns map a friendly "name · VRAM" label to the exact id each API needs,
// so the user never has to know the raw string. Ordered by VRAM.
// RunPod can also provision a CPU-only pod (no GPU). An empty id means "no
// GPU" — the provider maps that to `computeType: "CPU"`. Vast's empty id, by
// contrast, means "any GPU", so this option is RunPod-only.
const CPU_MACHINE = "";

const RUNPOD_GPU_OPTIONS = [
  { value: CPU_MACHINE, labelKey: "option.cpuOnly" },
  { value: "NVIDIA RTX A5000", label: "RTX A5000 · 24 GB" },
  { value: "NVIDIA GeForce RTX 4090", label: "RTX 4090 · 24 GB" },
  { value: "NVIDIA L4", label: "L4 · 24 GB" },
  { value: "NVIDIA RTX A6000", label: "RTX A6000 · 48 GB" },
  { value: "NVIDIA A40", label: "A40 · 48 GB" },
  { value: "NVIDIA L40S", label: "L40S · 48 GB" },
  { value: "NVIDIA A100 80GB PCIe", label: "A100 · 80 GB" },
  { value: "NVIDIA H100 80GB HBM3", label: "H100 · 80 GB" },
  { value: CUSTOM_GPU, labelKey: "option.otherGpu" }
] as const;

// Vast searches the marketplace, so "Any" (empty id) is valid and picks the
// cheapest offer. RunPod provisions a specific pod type, so a GPU is required.
const VAST_GPU_OPTIONS = [
  { value: "", labelKey: "option.anyCheapest" },
  { value: "RTX_3090", label: "RTX 3090 · 24 GB" },
  { value: "RTX_4090", label: "RTX 4090 · 24 GB" },
  { value: "RTX_A6000", label: "RTX A6000 · 48 GB" },
  { value: "A40", label: "A40 · 48 GB" },
  { value: "L40S", label: "L40S · 48 GB" },
  { value: "A100_PCIE", label: "A100 · 80 GB" },
  { value: "A100_SXM4", label: "A100 SXM4 · 80 GB" },
  { value: "H100_PCIE", label: "H100 · 80 GB" },
  { value: CUSTOM_GPU, labelKey: "option.otherGpu" }
] as const;

// Default GPU per target: a solid mid-range card for RunPod, and "Any cheapest"
// for Vast.
const DEFAULT_GPU: Record<WorkerTarget, string> = {
  runpod: "NVIDIA A40",
  vast: ""
};

// vCPU choices for a CPU-only RunPod pod. The provider passes this as the pod's
// vCPU count; RunPod selects a matching CPU flavor.
const VCPU_OPTIONS = [
  { value: "2", label: "2 vCPU" },
  { value: "4", label: "4 vCPU" },
  { value: "8", label: "8 vCPU" },
  { value: "16", label: "16 vCPU" },
  { value: "32", label: "32 vCPU" }
] as const;
const DEFAULT_VCPU = "4";

const TOKEN_POLICY_OPTIONS = [
  { value: "generate", labelKey: "option.tokenGenerate" },
  { value: "fixed", labelKey: "option.tokenFixed" }
] as const;

interface WorkerProfilesDialogProps {
  open: boolean;
  onClose: () => void;
  profiles: WorkerProfile[];
  createProfile: (input: CreateWorkerProfileInput) => Promise<WorkerProfile>;
  deleteProfile: (name: string) => Promise<void>;
  /**
   * Whether each provider's API key is available (store OR env), from the
   * server. `undefined` while loading — we only warn on an explicit `false`.
   */
  apiKeyStatus?: Record<WorkerTarget, boolean>;
}

function parseMinutes(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

const WorkerProfilesDialog: React.FC<WorkerProfilesDialogProps> = ({
  open,
  onClose,
  profiles,
  createProfile,
  deleteProfile,
  apiKeyStatus
}) => {
  const { t } = useTranslation(["workers", "common"]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<WorkerTarget>("runpod");
  const [image, setImage] = useState(DEFAULT_WORKER_IMAGE);
  // `gpu` holds the select value (a provider id, "" for Any, or CUSTOM_GPU);
  // `customGpu` holds the free-text id when CUSTOM_GPU is picked.
  const [gpu, setGpu] = useState(DEFAULT_GPU.runpod);
  const [customGpu, setCustomGpu] = useState("");
  const [vcpu, setVcpu] = useState(DEFAULT_VCPU);
  const [disk, setDisk] = useState(DEFAULT_DISK_GB);
  const [tokenPolicy, setTokenPolicy] = useState<TokenPolicy>("generate");
  const [idleTimeout, setIdleTimeout] = useState(DEFAULT_IDLE_TIMEOUT);
  const [maxLifetime, setMaxLifetime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warn (don't block: a profile is just a template) when the selected
  // provider's API key isn't available yet — provisioning would fail without it.
  // `apiKeyStatus` reflects store OR env (the same resolution provisioning uses),
  // so an env-provided key does NOT false-warn. Only warn on an explicit false.
  const apiKeyName = API_KEY_BY_TARGET[target];
  const apiKeyMissing = apiKeyStatus?.[target] === false;

  // Translate options that carry a labelKey; passthrough ones with a fixed label
  // (hardware product names stay in English).
  const translateOptions = useCallback(
    (opts: readonly { value: string; labelKey?: string; label?: string }[]) =>
      opts.map((o) => ({
        value: o.value,
        label: o.labelKey ? t(o.labelKey) : (o.label ?? "")
      })),
    [t]
  );

  const gpuOptions = translateOptions(
    target === "runpod" ? RUNPOD_GPU_OPTIONS : VAST_GPU_OPTIONS
  );
  const targetOptions = translateOptions(TARGET_OPTIONS);
  const imagePresets = translateOptions(IMAGE_PRESETS);
  const tokenPolicyOptions = translateOptions(TOKEN_POLICY_OPTIONS);
  const vcpuOptions = VCPU_OPTIONS;
  // The provider-native GPU id we'll actually submit ("" means "any/none").
  const resolvedGpu = gpu === CUSTOM_GPU ? customGpu.trim() : gpu;
  // RunPod CPU-only pod: the curated "CPU only" entry (empty id) on RunPod.
  // (Vast's empty id means "any GPU", so it is not a CPU machine.)
  const isCpuMachine = target === "runpod" && gpu === CPU_MACHINE;
  // Valid unless the user picked "Other" but left the id blank. RunPod "CPU
  // only" and Vast "Any" (both empty) are valid selections.
  const gpuOk = gpu !== CUSTOM_GPU || resolvedGpu.length > 0;

  const canCreate =
    name.trim().length > 0 && image.trim().length > 0 && gpuOk && !busy;

  // GPU ids are provider-specific, so switching target invalidates the current
  // pick — reset it to that target's default.
  const handleTargetChange = useCallback((value: WorkerTarget) => {
    setTarget(value);
    setGpu(DEFAULT_GPU[value]);
    setCustomGpu("");
  }, []);

  const resetForm = useCallback(() => {
    setName("");
    setTarget("runpod");
    setImage(DEFAULT_WORKER_IMAGE);
    setGpu(DEFAULT_GPU.runpod);
    setCustomGpu("");
    setVcpu(DEFAULT_VCPU);
    setDisk(DEFAULT_DISK_GB);
    setTokenPolicy("generate");
    setIdleTimeout(DEFAULT_IDLE_TIMEOUT);
    setMaxLifetime("");
  }, []);

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    const input: CreateWorkerProfileInput = {
      name: name.trim(),
      target,
      image: image.trim(),
      token_policy: tokenPolicy
    };
    const spec: Record<string, unknown> = {};
    if (resolvedGpu) {
      spec.gpu = resolvedGpu;
    }
    if (isCpuMachine) {
      // CPU-only pod: no GPU id, carry the vCPU count instead.
      const vcpuCount = parseMinutes(vcpu);
      if (vcpuCount !== undefined) {
        spec.vcpu = vcpuCount;
      }
    }
    const diskGb = parseMinutes(disk); // reused positive-integer parse
    if (diskGb !== undefined) {
      spec.disk = diskGb;
    }
    if (Object.keys(spec).length > 0) {
      input.spec = spec;
    }
    const idle = parseMinutes(idleTimeout);
    if (idle !== undefined) {
      input.idle_timeout_minutes = idle;
    }
    const lifetime = parseMinutes(maxLifetime);
    if (lifetime !== undefined) {
      input.max_lifetime_minutes = lifetime;
    }

    setBusy(true);
    setError(null);
    try {
      await createProfile(input);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [
    canCreate,
    name,
    target,
    image,
    resolvedGpu,
    isCpuMachine,
    vcpu,
    disk,
    tokenPolicy,
    idleTimeout,
    maxLifetime,
    createProfile,
    resetForm
  ]);

  const handleDelete = useCallback(
    async (profileName: string) => {
      setBusy(true);
      setError(null);
      try {
        await deleteProfile(profileName);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [deleteProfile]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("title.manageProfiles")}
      minWidth={480}
      actions={
        <FlexRow gap={2}>
          <EditorButton variant="text" onClick={onClose}>
            {t("common:button.close")}
          </EditorButton>
          <EditorButton
            variant="outlined"
            onClick={handleCreate}
            disabled={!canCreate}
            aria-label={t("aria.createProfile")}
          >
            {t("button.createProfile")}
          </EditorButton>
        </FlexRow>
      }
    >
      <FlexColumn gap={3} sx={{ pt: 1 }}>
        {error && (
          <AlertBanner
            severity="error"
            compact
            onClose={() => setError(null)}
          >
            {error}
          </AlertBanner>
        )}

        <FlexColumn gap={1}>
          <Text size="small" weight={600}>
            {t("title.existingProfiles")}
          </Text>
          {profiles.length === 0 ? (
            <Caption size="small">{t("caption.noProfiles")}</Caption>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} variant="outlined" padding="compact">
                <FlexRow align="center" justify="space-between" gap={2}>
                  <FlexColumn gap={0.5}>
                    <FlexRow gap={1.5} align="center">
                      <Text size="normal" weight={600}>
                        {profile.name}
                      </Text>
                      <Chip label={profile.target} compact color="info" />
                    </FlexRow>
                    <Caption size="small">{profile.image}</Caption>
                  </FlexColumn>
                  <EditorButton
                    density="compact"
                    variant="text"
                    disabled={busy}
                    aria-label={t("aria.deleteProfile", { name: profile.name })}
                    onClick={() => handleDelete(profile.name)}
                  >
                    {t("button.delete")}
                  </EditorButton>
                </FlexRow>
              </Card>
            ))
          )}
        </FlexColumn>

        <FlexColumn gap={2}>
          <FlexColumn gap={0.5}>
            <Text size="small" weight={600}>
              {t("title.createProfile")}
            </Text>
            <Caption size="small">{t("caption.profileTemplate")}</Caption>
          </FlexColumn>

          <TextInput
            label={t("label.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={t("helper.name")}
            fullWidth
            compact
          />

          <SelectField
            label={t("label.provider")}
            value={target}
            onChange={(value) => handleTargetChange(value as WorkerTarget)}
            options={targetOptions}
            variant="outlined"
            size="small"
            description={t("helper.provider")}
          />

          {apiKeyMissing && (
            <WarningBanner
              compact
              message={t("warning.apiKeyMissing", { apiKeyName })}
              description={t("warning.apiKeyMissingDesc", {
                provider: target === "runpod" ? "RunPod" : "Vast.ai"
              })}
            />
          )}

          <SelectField
            label={t("label.gpu")}
            value={gpu}
            onChange={setGpu}
            options={gpuOptions}
            variant="outlined"
            size="small"
            description={
              target === "runpod" ? t("helper.gpuRunpod") : t("helper.gpuVast")
            }
          />
          {gpu === CUSTOM_GPU && (
            <TextInput
              label={
                target === "runpod"
                  ? t("label.gpuIdRunpod")
                  : t("label.gpuIdVast")
              }
              value={customGpu}
              onChange={(e) => setCustomGpu(e.target.value)}
              helperText={
                target === "runpod"
                  ? t("helper.gpuIdRunpod")
                  : t("helper.gpuIdVast")
              }
              fullWidth
              compact
            />
          )}
          {isCpuMachine && (
            <SelectField
              label={t("label.vcpu")}
              value={vcpu}
              onChange={setVcpu}
              options={vcpuOptions}
              variant="outlined"
              size="small"
              description={t("helper.vcpu")}
            />
          )}

          <TextInput
            label={t("label.disk")}
            value={disk}
            onChange={(e) => setDisk(e.target.value)}
            type="number"
            helperText={t("helper.disk")}
            fullWidth
            compact
          />

          <TextInput
            label={t("label.idleTimeout")}
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(e.target.value)}
            type="number"
            helperText={t("helper.idleTimeout")}
            fullWidth
            compact
          />

          <CollapsibleSection
            title={
              <Text size="small" weight={600}>
                {t("title.advanced")}
              </Text>
            }
            defaultOpen={false}
          >
            <FlexColumn gap={2} sx={{ pt: 1 }}>
              <SelectField
                label={t("label.workerImagePreset")}
                value={
                  IMAGE_PRESETS.some((p) => p.value === image)
                    ? image
                    : CUSTOM_IMAGE
                }
                onChange={(value) => {
                  if (value !== CUSTOM_IMAGE) setImage(value);
                }}
                options={imagePresets}
                variant="outlined"
                size="small"
                description={t("helper.workerImagePreset")}
              />
              <TextInput
                label={t("label.workerImage")}
                value={image}
                onChange={(e) => setImage(e.target.value)}
                helperText={t("helper.workerImage")}
                fullWidth
                compact
              />
              <SelectField
                label={t("label.tokenPolicy")}
                value={tokenPolicy}
                onChange={(value) => setTokenPolicy(value as TokenPolicy)}
                options={tokenPolicyOptions}
                variant="outlined"
                size="small"
                description={t("helper.tokenPolicy")}
              />
              <TextInput
                label={t("label.maxLifetime")}
                value={maxLifetime}
                onChange={(e) => setMaxLifetime(e.target.value)}
                type="number"
                helperText={t("helper.maxLifetime")}
                fullWidth
                compact
              />
            </FlexColumn>
          </CollapsibleSection>
        </FlexColumn>
      </FlexColumn>
    </Dialog>
  );
};

export default memo(WorkerProfilesDialog);
