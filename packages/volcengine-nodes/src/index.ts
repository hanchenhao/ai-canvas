import type { NodeClass } from "@nodetool-ai/node-sdk";
import { TEXT_TO_VIDEO_NODES } from "./nodes/text-to-video.js";
import { IMAGE_TO_VIDEO_NODES } from "./nodes/image-to-video.js";

export { VolcengineTextToVideoNode } from "./nodes/text-to-video.js";
export { VolcengineImageToVideoNode } from "./nodes/image-to-video.js";

export const VOLCENGINE_NODES: readonly NodeClass[] = [
  ...TEXT_TO_VIDEO_NODES,
  ...IMAGE_TO_VIDEO_NODES
];

export function registerVolcengineNodes(registry: {
  register: (nodeClass: NodeClass) => void;
}): void {
  for (const nodeClass of VOLCENGINE_NODES) {
    registry.register(nodeClass);
  }
}
