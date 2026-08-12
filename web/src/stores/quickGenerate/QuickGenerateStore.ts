/**
 * QuickGenerateStore
 *
 * Standalone generation jobs for the Studio quick-create cards. Unlike the
 * storyboard generation (one job per shot, tied to a board), these are
 * independent prompt-to-result runs whose output goes straight into the asset
 * library. Mirrors the WebSocket subscription pattern from
 * StoryboardGenerationStore.
 */

import { create } from "zustand";
import type { ImageRef, VideoRef } from "@nodetool-ai/protocol";
import {
  globalWebSocketManager,
  type WebSocketMessage
} from "../../lib/websocket/GlobalWebSocketManager";
import { normalizeOutputUpdateValue, isOutputUpdate } from "../outputUpdateValue";

export type QuickGenKind = "image" | "video";
export type QuickGenStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface QuickGenJob {
  id: string;
  kind: QuickGenKind;
  prompt: string;
  status: QuickGenStatus;
  progress: number;
  result?: ImageRef | VideoRef;
  error?: string;
  createdAt: number;
}

interface QuickGenJobContext {
  jobId: string;
  kind: QuickGenKind;
  outputNodeId: string;
}

interface QuickGenerateState {
  jobs: QuickGenJob[];
  addJob: (job: QuickGenJob) => void;
  updateStatus: (jobId: string, status: QuickGenStatus, extra?: Partial<QuickGenJob>) => void;
  updateProgress: (jobId: string, progress: number) => void;
  removeJob: (jobId: string) => void;
  clearCompleted: () => void;
}

export const useQuickGenerateStore = create<QuickGenerateState>((set) => ({
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateStatus: (jobId, status, extra) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, ...extra, status } : j
      )
    })),
  updateProgress: (jobId, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, progress: Math.max(0, Math.min(100, progress)) } : j
      )
    })),
  removeJob: (jobId) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) })),
  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter(
        (j) => j.status === "queued" || j.status === "running"
      )
    }))
}));

// ── WebSocket subscription ───────────────────────────────────────────────────

const subscriptions = new Map<string, () => void>();
const contexts = new Map<string, QuickGenJobContext>();
const outputs = new Map<string, unknown>();

function isMediaRefLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.uri || v.asset_id || v.data);
}

const toImageRef = (value: unknown): ImageRef | null => {
  if (isMediaRefLike(value)) return { ...value, type: "image" } as ImageRef;
  if (typeof value === "string" && value)
    return { type: "image", uri: value };
  return null;
};

const toVideoRef = (value: unknown): VideoRef | null => {
  if (isMediaRefLike(value)) return { ...value, type: "video" } as VideoRef;
  if (typeof value === "string" && value)
    return { type: "video", uri: value };
  return null;
};

const handleMessage = (jobId: string, message: WebSocketMessage): void => {
  const ctx = contexts.get(jobId);
  if (!ctx) return;
  const store = useQuickGenerateStore.getState();

  if (
    message.type === "node_progress" &&
    typeof message.progress === "number" &&
    typeof message.total === "number"
  ) {
    const pct = message.total > 0 ? (message.progress / message.total) * 100 : 0;
    store.updateProgress(jobId, pct);
    return;
  }

  if (isOutputUpdate(message) && message.node_id === ctx.outputNodeId) {
    outputs.set(jobId, normalizeOutputUpdateValue(message));
    return;
  }

  if (message.type !== "job_update") return;

  const status = message.status;
  if (status === "queued") {
    store.updateStatus(jobId, "queued");
    return;
  }
  if (status === "running") {
    store.updateStatus(jobId, "running");
    return;
  }

  if (status === "completed") {
    const value = outputs.get(jobId);
    const ref = ctx.kind === "image" ? toImageRef(value) : toVideoRef(value);
    if (!ref) {
      store.updateStatus(jobId, "failed", {
        error: "Generation completed but produced no output."
      });
    } else {
      store.updateStatus(jobId, "completed", { result: ref });
    }
    unsubscribe(jobId);
    return;
  }

  if (status === "failed" || status === "timed_out") {
    store.updateStatus(jobId, "failed", {
      error:
        typeof message.error === "string" && message.error.trim()
          ? message.error
          : `Job ${status}`
    });
    unsubscribe(jobId);
    return;
  }

  if (status === "cancelled") {
    store.updateStatus(jobId, "cancelled");
    unsubscribe(jobId);
  }
};

export const unsubscribe = (jobId: string): void => {
  const unsub = subscriptions.get(jobId);
  if (unsub) {
    unsub();
    subscriptions.delete(jobId);
  }
  contexts.delete(jobId);
  outputs.delete(jobId);
};

export const subscribeQuickGen = async (
  jobId: string,
  context: QuickGenJobContext
): Promise<void> => {
  if (subscriptions.has(jobId)) {
    contexts.set(jobId, context);
    return;
  }
  await globalWebSocketManager.ensureConnection();
  contexts.set(jobId, context);
  const unsub = globalWebSocketManager.subscribe(jobId, (msg) =>
    handleMessage(jobId, msg)
  );
  subscriptions.set(jobId, unsub);
};

export const __resetQuickGenForTests = (): void => {
  for (const unsub of subscriptions.values()) unsub();
  subscriptions.clear();
  contexts.clear();
  outputs.clear();
};
