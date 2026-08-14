import { BaseNode, prop } from "@nodetool-ai/node-sdk";
import type { NodeClass } from "@nodetool-ai/node-sdk";
import type { ProcessingContext } from "@nodetool-ai/runtime";
import { loadMediaRefBytes } from "@nodetool-ai/runtime";
import {
  bytesToBase64,
  generateSeedanceVideo,
  getVolcengineApiKey,
  inferImageMime,
  SEEDANCE_DURATIONS,
  SEEDANCE_RESOLUTIONS,
  videoRefFromBytes
} from "../volcengine-base.js";

export class VolcengineImageToVideoNode extends BaseNode {
  static readonly nodeType = "volcengine.ImageToVideo";
  static readonly body = "content_card";
  static readonly title = "Seedance Image to Video";
  static readonly description =
    "Animate a still image into a video using ByteDance Seedance models " +
    "via the Volcengine Ark platform.\n" +
    "video, generation, image-to-video, i2v, seedance, volcengine, doubao\n\n" +
    "Use cases:\n" +
    "- Bring a photo or render to life\n" +
    "- Add motion to product or character art\n" +
    "- Create animated intros from a key frame";
  static readonly metadataOutputTypes = { output: "video" };
  static readonly inlineFields: string[] = [];
  static readonly inputFields: string[] = ["image", "prompt"];
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
    type: "image",
    default: { type: "image", uri: "", asset_id: null, data: null },
    title: "Image",
    description: "The image to use as the first frame of the video."
  })
  declare image: any;

  @prop({
    type: "str",
    default: "",
    title: "Prompt",
    description: "Optional text prompt guiding the motion."
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

  async process(context?: ProcessingContext): Promise<Record<string, unknown>> {
    const apiKey = getVolcengineApiKey(this._secrets);

    const imageBytes = await loadMediaRefBytes(this.image, context);
    if (!imageBytes || imageBytes.length === 0) {
      throw new Error("An input image is required");
    }
    const mime = inferImageMime(imageBytes);
    const dataUrl = `data:${mime};base64,${bytesToBase64(imageBytes)}`;

    const model =
      (this.model && typeof this.model === "object" && this.model.id) ||
      (typeof this.model === "string" && this.model) ||
      "doubao-seedance-1-0-pro-250528";
    const duration = Number(this.duration ?? 5);
    const resolution = String(this.resolution ?? "1080p");

    const content: Record<string, unknown>[] = [
      {
        type: "image_url",
        image_url: { url: dataUrl }
      }
    ];
    const prompt = String(this.prompt ?? "");
    if (prompt) {
      content.unshift({ type: "text", text: prompt });
    }

    const body: Record<string, unknown> = {
      model,
      content,
      parameters: {
        duration: duration >= 9 ? 10 : 5,
        resolution
      }
    };

    const bytes = await generateSeedanceVideo(apiKey, body);
    return { output: videoRefFromBytes(bytes) };
  }
}

export const IMAGE_TO_VIDEO_NODES: readonly NodeClass[] = [
  VolcengineImageToVideoNode
];
