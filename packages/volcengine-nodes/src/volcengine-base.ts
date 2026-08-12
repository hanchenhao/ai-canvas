/**
 * Shared helpers and constants for the Volcengine (火山引擎) node pack.
 *
 * Nodes talk to the Ark platform REST API directly for Seedance video
 * generation. All network access goes through the global `fetch`.
 *
 * Docs: https://www.volcengine.com/docs/82379/1520757
 */

export const ARK_BASE_URL = "https://ark.cn-beijing.volces.com";

/** Resolve the Volcengine API key from injected secrets or the environment. */
export function getVolcengineApiKey(secrets: Record<string, string>): string {
  const key = secrets?.VOLCENGINE_API_KEY || process.env.VOLCENGINE_API_KEY || "";
  if (!key) throw new Error("VOLCENGINE_API_KEY is not configured");
  return key;
}

export function volcengineHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** Guess an image MIME type from magic bytes; defaults to PNG. */
export function inferImageMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) {
    return "image/webp";
  }
  return "image/png";
}

export function videoRefFromBytes(
  bytes: Uint8Array
): { type: "video"; data: string } {
  return { type: "video", data: bytesToBase64(bytes) };
}

// ---------------------------------------------------------------------------
// Catalogues
// ---------------------------------------------------------------------------

export const SEEDANCE_T2V_MODELS: string[] = [
  "doubao-seedance-1-0-pro-250528",
  "doubao-seedance-1-0-lite-t2v-250428"
];

export const SEEDANCE_I2V_MODELS: string[] = [
  "doubao-seedance-1-0-pro-250528",
  "doubao-seedance-1-0-lite-i2v-250428"
];

export const SEEDANCE_RESOLUTIONS: string[] = ["480p", "720p", "1080p"];
export const SEEDANCE_DURATIONS: number[] = [5, 10];

// ---------------------------------------------------------------------------
// Async video generation (submit → poll → download)
// ---------------------------------------------------------------------------

export interface VideoTaskOptions {
  pollIntervalMs?: number;
  maxAttempts?: number;
}

/**
 * Submit a Seedance video generation task, poll until it succeeds, and
 * download the resulting video file.
 */
export async function generateSeedanceVideo(
  apiKey: string,
  body: Record<string, unknown>,
  options: VideoTaskOptions = {}
): Promise<Uint8Array> {
  const submit = await fetch(`${ARK_BASE_URL}/api/v3/contents/generations/tasks`, {
    method: "POST",
    headers: volcengineHeaders(apiKey),
    body: JSON.stringify(body)
  });
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

  const videoUrl = await pollVideoTask(apiKey, taskId, options);
  return downloadVideo(videoUrl);
}

async function pollVideoTask(
  apiKey: string,
  taskId: string,
  options: VideoTaskOptions = {}
): Promise<string> {
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const maxAttempts = options.maxAttempts ?? 120;
  const url = `${ARK_BASE_URL}/api/v3/contents/generations/tasks/${encodeURIComponent(
    taskId
  )}`;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(url, { headers: volcengineHeaders(apiKey) });
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
      const message = (error?.message as string | undefined) ?? "Unknown error";
      throw new Error(`Volcengine video task failed: ${message}`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(
    `Volcengine task timed out after ${maxAttempts * pollIntervalMs}ms`
  );
}

async function downloadVideo(videoUrl: string): Promise<Uint8Array> {
  const dl = await fetch(videoUrl);
  if (!dl.ok) {
    throw new Error(`Failed to download Volcengine video from ${videoUrl}`);
  }
  return new Uint8Array(await dl.arrayBuffer());
}
