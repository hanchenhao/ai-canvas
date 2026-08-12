/**
 * Volcengine Provider — exposes ByteDance's Seedance video generation models
 * through the standard {@link BaseProvider} interface via the Ark platform
 * (火山方舟).
 *
 *   - textToVideo  → POST /api/v3/contents/generations/tasks (text content)
 *   - imageToVideo → POST /api/v3/contents/generations/tasks (text + image)
 *
 * Ark uses an async task model: submit returns a task id, poll until
 * `succeeded`, then download the result video URL.
 *
 * Docs: https://www.volcengine.com/docs/82379/1520757
 */

import { BaseProvider } from "./base-provider.js";
import { safeFetch } from "./safe-url.js";
import { createLogger } from "@nodetool-ai/config";
import type {
  ImageToVideoParams,
  Message,
  ProviderStreamItem,
  TextToVideoParams,
  VideoModel
} from "./types.js";

// Stryker disable next-line StringLiteral: logger name is diagnostic.
const log = createLogger("nodetool.runtime.providers.volcengine");

const ARK_BASE_URL = "https://ark.cn-beijing.volces.com";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 120; // 10 minutes @ 5s

/** Seedance models exposed to the generic video composer. */
const VOLCENGINE_VIDEO_MODELS: VideoModel[] = [
  {
    id: "doubao-seedance-1-0-pro-250528",
    name: "Seedance 1.0 Pro",
    provider: "volcengine",
    supportedTasks: ["text_to_video", "image_to_video"],
    resolutions: ["480p", "720p", "1080p"],
    durations: [5, 10]
  },
  {
    id: "doubao-seedance-1-0-lite-t2v-250428",
    name: "Seedance 1.0 Lite (T2V)",
    provider: "volcengine",
    supportedTasks: ["text_to_video"],
    resolutions: ["480p", "720p", "1080p"],
    durations: [5]
  },
  {
    id: "doubao-seedance-1-0-lite-i2v-250428",
    name: "Seedance 1.0 Lite (I2V)",
    provider: "volcengine",
    supportedTasks: ["image_to_video"],
    resolutions: ["480p", "720p", "1080p"],
    durations: [5]
  }
];

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function detectImageMime(image: Uint8Array): string {
  if (image[0] === 0xff && image[1] === 0xd8) return "image/jpeg";
  if (image[0] === 0x89 && image[1] === 0x50) return "image/png";
  if (image[0] === 0x52 && image[1] === 0x49 && image[8] === 0x57) {
    return "image/webp";
  }
  return "image/png";
}

export interface VolcengineProviderOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  fetchFn?: typeof fetch;
}

export class VolcengineProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly _fetch: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(
    secrets: Record<string, unknown> = {},
    options: VolcengineProviderOptions = {}
  ) {
    super("volcengine");
    this.apiKey = (secrets["VOLCENGINE_API_KEY"] as string) ?? "";
    this._fetch = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  }

  static override requiredSecrets(): string[] {
    return ["VOLCENGINE_API_KEY"];
  }

  override getContainerEnv(): Record<string, string> {
    return { VOLCENGINE_API_KEY: this.apiKey };
  }

  private requireApiKey(): string {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new Error("VOLCENGINE_API_KEY is not configured");
    }
    return this.apiKey;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.requireApiKey()}`,
      "Content-Type": "application/json"
    };
  }

  async generateMessage(
    _args: Parameters<BaseProvider["generateMessage"]>[0]
  ): Promise<Message> {
    throw new Error("volcengine does not support chat generation");
  }

  // eslint-disable-next-line require-yield
  async *generateMessages(
    _args: Parameters<BaseProvider["generateMessages"]>[0]
  ): AsyncGenerator<ProviderStreamItem> {
    throw new Error("volcengine does not support chat generation");
  }

  override async getAvailableVideoModels(): Promise<VideoModel[]> {
    if (!this.apiKey) return [];
    return VOLCENGINE_VIDEO_MODELS;
  }

  // ---------------------------------------------------------------------------
  // Video generation — async task + poll
  // ---------------------------------------------------------------------------

  override async textToVideo(params: TextToVideoParams): Promise<Uint8Array> {
    return this._generateVideo({
      modelId: params.model.id,
      prompt: params.prompt,
      durationSeconds: params.durationSeconds,
      resolution: params.resolution,
      signal: this._timeoutSignal(params.timeoutSeconds)
    });
  }

  override async imageToVideo(
    images: Uint8Array[],
    params: ImageToVideoParams
  ): Promise<Uint8Array> {
    return this._generateVideo({
      modelId: params.model.id,
      prompt: params.prompt ?? undefined,
      firstFrame: images[0],
      durationSeconds: params.durationSeconds,
      resolution: params.resolution,
      signal: this._timeoutSignal(params.timeoutSeconds)
    });
  }

  private _timeoutSignal(
    timeoutSeconds?: number | null
  ): AbortSignal | undefined {
    return timeoutSeconds && timeoutSeconds > 0
      ? AbortSignal.timeout(timeoutSeconds * 1000)
      : undefined;
  }

  private async _generateVideo(opts: {
    modelId: string;
    prompt?: string;
    firstFrame?: Uint8Array;
    durationSeconds?: number | null;
    resolution?: string | null;
    signal?: AbortSignal;
  }): Promise<Uint8Array> {
    const content: Record<string, unknown>[] = [];
    if (opts.prompt) {
      content.push({ type: "text", text: opts.prompt });
    }
    if (opts.firstFrame) {
      const mime = detectImageMime(opts.firstFrame);
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${bytesToBase64(opts.firstFrame)}`
        }
      });
    }

    const parameters: Record<string, unknown> = {};
    if (opts.resolution) {
      const r = opts.resolution.toLowerCase();
      if (r.includes("1080")) parameters.resolution = "1080p";
      else if (r.includes("720")) parameters.resolution = "720p";
      else if (r.includes("480")) parameters.resolution = "480p";
    }
    if (opts.durationSeconds) {
      parameters.duration = opts.durationSeconds >= 9 ? 10 : 5;
    }

    const body: Record<string, unknown> = {
      model: opts.modelId,
      content
    };
    if (Object.keys(parameters).length > 0) body.parameters = parameters;

    log.debug("Volcengine video submit", { model: opts.modelId });

    const submit = await this._fetch(
      `${ARK_BASE_URL}/api/v3/contents/generations/tasks`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: opts.signal
      }
    );
    if (!submit.ok) {
      throw new Error(
        `Volcengine task submit failed: ${submit.status} ${await submit.text()}`
      );
    }

    const submitData = (await submit.json()) as Record<string, unknown>;
    const taskId = submitData.id as string | undefined;
    if (!taskId) {
      throw new Error(
        `Volcengine submit returned no task id: ${JSON.stringify(submitData)}`
      );
    }

    const videoUrl = await this._pollTask(taskId, opts.signal);
    return this._downloadVideo(videoUrl, opts.signal);
  }

  private async _pollTask(
    taskId: string,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${ARK_BASE_URL}/api/v3/contents/generations/tasks/${encodeURIComponent(
      taskId
    )}`;
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const res = await this._fetch(url, { headers: this.headers(), signal });
      if (!res.ok) {
        throw new Error(
          `Volcengine task poll failed: ${res.status} ${await res.text()}`
        );
      }
      const data = (await res.json()) as Record<string, unknown>;
      const status = String(data.status ?? "").toLowerCase();

      if (status === "succeeded") {
        const content = data.content as Record<string, unknown> | undefined;
        const videoUrl = content?.video_url as string | undefined;
        if (!videoUrl) {
          throw new Error(
            `Volcengine task succeeded but returned no video_url: ${JSON.stringify(data)}`
          );
        }
        return videoUrl;
      }

      if (status === "failed") {
        const error = data.error as Record<string, unknown> | undefined;
        const message =
          (error?.message as string | undefined) ?? "Unknown error";
        throw new Error(`Volcengine video task failed: ${message}`);
      }

      log.debug(
        `Volcengine task ${taskId} status: ${status} (attempt ${attempt + 1})`
      );
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
    throw new Error(
      `Volcengine task ${taskId} timed out after ${this.maxPollAttempts * this.pollIntervalMs}ms`
    );
  }

  private async _downloadVideo(
    videoUrl: string,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    // safeFetch: video_url is provider-returned (externally influenced).
    const dl = await safeFetch(videoUrl, { signal }, 5, this._fetch);
    if (!dl.ok) {
      throw new Error(
        `Failed to download Volcengine video: ${dl.status} ${videoUrl}`
      );
    }
    return new Uint8Array(await dl.arrayBuffer());
  }
}
