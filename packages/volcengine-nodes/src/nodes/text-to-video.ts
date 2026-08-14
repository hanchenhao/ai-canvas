import { BaseNode, prop } from "@nodetool-ai/node-sdk";
import type { NodeClass } from "@nodetool-ai/node-sdk";
import {
  generateSeedanceVideo,
  getVolcengineApiKey,
  SEEDANCE_DURATIONS,
  SEEDANCE_RESOLUTIONS,
  videoRefFromBytes
} from "../volcengine-base.js";

export class VolcengineTextToVideoNode extends BaseNode {
  static readonly nodeType = "volcengine.TextToVideo";
  static readonly body = "content_card";
  static readonly title = "Seedance Text to Video";
  static readonly description =
    "Generate video from a text prompt using ByteDance Seedance models " +
    "via the Volcengine Ark platform.\n" +
    "video, generation, text-to-video, t2v, seedance, volcengine, doubao\n\n" +
    "Use cases:\n" +
    "- Create cinematic clips from a text description\n" +
    "- Generate short-form social video content\n" +
    "- Prototype motion and scene concepts";
  static readonly metadataOutputTypes = { output: "video" };
  static readonly inlineFields: string[] = [];
  static readonly inputFields: string[] = ["prompt"];
  static readonly requiredSettings = ["VOLCENGINE_API_KEY"];
  static readonly autoSaveAsset = true;

  @prop({
    type: "video_model",
    default: {
      type: "video_model",
      provider: "volcengine",
      id: "doubao-seedance-1-0-pro-250528",
      name: "Seedance 1.0 Pro",
      path: null,
      supported_tasks: ["text_to_video", "image_to_video"]
    },
    title: "Model",
    description: "Seedance video model from the Ark platform."
  })
  declare model: any;

  @prop({
    type: "str",
    default: "A serene mountain landscape at sunrise",
    title: "Prompt",
    description: "Text prompt describing the desired video."
  })
  declare prompt: any;

  @prop({
    type: "int",
    default: 5,
    title: "Duration",
    description: "Video duration in seconds.",
    values: SEEDANCE_DURATIONS
  })
  declare duration: any;

  @prop({
    type: "enum",
    default: "1080p",
    title: "Resolution",
    description: "Output resolution.",
    values: SEEDANCE_RESOLUTIONS
  })
  declare resolution: any;

  async process(): Promise<Record<string, unknown>> {
    const apiKey = getVolcengineApiKey(this._secrets);

    const prompt = String(this.prompt ?? "");
    if (!prompt) throw new Error("Prompt is required");

    const model =
      (this.model && typeof this.model === "object" && this.model.id) ||
      (typeof this.model === "string" && this.model) ||
      "doubao-seedance-1-0-pro-250528";
    const duration = Number(this.duration ?? 5);
    const resolution = String(this.resolution ?? "1080p");

    const body: Record<string, unknown> = {
      model,
      content: [{ type: "text", text: prompt }],
      parameters: {
        duration: duration >= 9 ? 10 : 5,
        resolution
      }
    };

    const bytes = await generateSeedanceVideo(apiKey, body);
    return { output: videoRefFromBytes(bytes) };
  }
}

export const TEXT_TO_VIDEO_NODES: readonly NodeClass[] = [
  VolcengineTextToVideoNode
];
