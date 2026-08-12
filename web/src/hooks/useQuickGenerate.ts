/**
 * useQuickGenerate
 *
 * Prompt-to-result generation for the Studio quick-create cards. Builds a
 * minimal 2-node workflow (gen → output), runs it through the per-job
 * WorkflowRunner, and hands the job off to QuickGenerateStore for WebSocket
 * tracking. Reuses the same pattern as useGenerateShot.
 */

import { useCallback } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { NodeData } from "../stores/NodeData";
import type { WorkflowAttributes } from "../stores/ApiTypes";
import { getWorkflowRunnerStore } from "../stores/WorkflowRunner";
import {
  useQuickGenerateStore,
  subscribeQuickGen,
  type QuickGenKind
} from "../stores/quickGenerate/QuickGenerateStore";
import { STUDIO_STILL_MODEL, STUDIO_CLIP_MODEL } from "../studio/curatedModels";

const GEN_ID = "gen";
const OUT_ID = "out";

let jobCounter = 0;
const nextWorkflowId = (): string => `quick-gen-${Date.now()}-${jobCounter++}`;

const makeWorkflow = (id: string, name: string): WorkflowAttributes => ({
  id,
  name,
  description: "",
  access: "private",
  thumbnail: "",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  settings: { hide_ui: true },
  run_mode: "workflow",
  workspace_id: null
});

const makeNode = (
  id: string,
  type: string,
  properties: Record<string, unknown>,
  workflowId: string
): Node<NodeData> => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {
    properties,
    selectable: true,
    dynamic_properties: {},
    workflow_id: workflowId
  }
});

const outputEdge = (): Edge => ({
  id: `${GEN_ID}-${OUT_ID}`,
  source: GEN_ID,
  sourceHandle: "output",
  target: OUT_ID,
  targetHandle: "value"
});

export interface QuickGenerateResult {
  generateImage: (prompt: string, aspectRatio?: string) => Promise<void>;
  generateVideo: (prompt: string, aspectRatio?: string) => Promise<void>;
  generateVideoFromImage: (prompt: string, imageRef: unknown, aspectRatio?: string) => Promise<void>;
}

export const useQuickGenerate = (): QuickGenerateResult => {
  const addJob = useQuickGenerateStore((s) => s.addJob);

  const startJob = useCallback(
    async (
      kind: QuickGenKind,
      prompt: string,
      nodes: Node<NodeData>[],
      edges: Edge[]
    ): Promise<void> => {
      const workflowId = nextWorkflowId();
      const workflow = makeWorkflow(workflowId, prompt.slice(0, 40) || `Quick ${kind}`);
      const runnerStore = getWorkflowRunnerStore(workflowId);
      const jobId = await runnerStore.getState().run({}, workflow, nodes, edges, undefined, undefined, true);
      if (!jobId) throw new Error("Workflow runner did not return a job id");
      addJob({ id: jobId, kind, prompt, status: "queued", progress: 0, createdAt: Date.now() });
      await subscribeQuickGen(jobId, { jobId, kind, outputNodeId: OUT_ID });
    },
    [addJob]
  );

  const generateImage = useCallback(
    async (prompt: string, aspectRatio = "1:1"): Promise<void> => {
      const p = prompt.trim();
      if (!p) throw new Error("Prompt is required");
      const workflowId = nextWorkflowId();
      const nodes: Node<NodeData>[] = [
        makeNode(GEN_ID, "nodetool.image.TextToImage", {
          prompt: p, aspect_ratio: aspectRatio, model: STUDIO_STILL_MODEL
        }, workflowId),
        makeNode(OUT_ID, "nodetool.output.Output", { name: "image" }, workflowId)
      ];
      await startJob("image", p, nodes, [outputEdge()]);
    },
    [startJob]
  );

  const generateVideo = useCallback(
    async (prompt: string, aspectRatio = "16:9"): Promise<void> => {
      const p = prompt.trim();
      if (!p) throw new Error("Prompt is required");
      const workflowId = nextWorkflowId();
      const nodes: Node<NodeData>[] = [
        makeNode(GEN_ID, "nodetool.video.TextToVideo", {
          prompt: p, aspect_ratio: aspectRatio, model: STUDIO_CLIP_MODEL
        }, workflowId),
        makeNode(OUT_ID, "nodetool.output.Output", { name: "video" }, workflowId)
      ];
      await startJob("video", p, nodes, [outputEdge()]);
    },
    [startJob]
  );

  const generateVideoFromImage = useCallback(
    async (prompt: string, imageRef: unknown, aspectRatio = "16:9"): Promise<void> => {
      const p = prompt.trim();
      if (!p) throw new Error("Prompt is required");
      const workflowId = nextWorkflowId();
      const nodes: Node<NodeData>[] = [
        makeNode(GEN_ID, "nodetool.video.ImageToVideo", {
          image: imageRef, prompt: p, aspect_ratio: aspectRatio, model: STUDIO_CLIP_MODEL
        }, workflowId),
        makeNode(OUT_ID, "nodetool.output.Output", { name: "video" }, workflowId)
      ];
      await startJob("video", p, nodes, [outputEdge()]);
    },
    [startJob]
  );

  return { generateImage, generateVideo, generateVideoFromImage };
};

export default useQuickGenerate;
