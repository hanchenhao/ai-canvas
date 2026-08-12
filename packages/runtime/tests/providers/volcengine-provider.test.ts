import { describe, it, expect, vi } from "vitest";
import { VolcengineProvider } from "../../src/providers/volcengine-provider.js";
import type { VideoModel } from "../../src/providers/types.js";

describe("VolcengineProvider", () => {
  it("throws if VOLCENGINE_API_KEY is missing", () => {
    expect(() => new VolcengineProvider({})).not.toThrow();
  });

  it("reports provider id as volcengine", () => {
    const provider = new VolcengineProvider({ VOLCENGINE_API_KEY: "k" });
    expect(provider.provider).toBe("volcengine");
  });

  it("returns required secrets", () => {
    expect(VolcengineProvider.requiredSecrets()).toEqual(["VOLCENGINE_API_KEY"]);
  });

  it("returns container env with VOLCENGINE_API_KEY", () => {
    const provider = new VolcengineProvider({ VOLCENGINE_API_KEY: "test-key" });
    expect(provider.getContainerEnv()).toEqual({
      VOLCENGINE_API_KEY: "test-key"
    });
  });

  it("returns empty video models without api key", async () => {
    const provider = new VolcengineProvider({});
    const models = await provider.getAvailableVideoModels();
    expect(models).toEqual([]);
  });

  it("returns video models with api key", async () => {
    const provider = new VolcengineProvider({ VOLCENGINE_API_KEY: "k" });
    const models = await provider.getAvailableVideoModels();
    expect(models.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        "doubao-seedance-1-0-pro-250528",
        "doubao-seedance-1-0-lite-t2v-250428",
        "doubao-seedance-1-0-lite-i2v-250428"
      ])
    );
    expect(models.every((m) => m.provider === "volcengine")).toBe(true);
  });

  it("rejects chat generation", async () => {
    const provider = new VolcengineProvider({ VOLCENGINE_API_KEY: "k" });
    await expect(
      provider.generateMessage({
        messages: [{ role: "user", content: "hi" }],
        model: "test"
      })
    ).rejects.toThrow(/chat generation/);
  });

  it("submits a text-to-video task and polls until succeeded", async () => {
    const responses: Array<() => Promise<any>> = [
      async () => ({
        ok: true,
        json: async () => ({ id: "task-42" })
      }),
      async () => ({
        ok: true,
        json: async () => ({ status: "queued" })
      }),
      async () => ({
        ok: true,
        json: async () => ({
          status: "succeeded",
          content: { video_url: "https://cdn.volcengine.com/v.mp4" }
        })
      }),
      async () => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => new Uint8Array([7, 7, 7]).buffer
      })
    ];
    const mockFetch = vi.fn(async (..._args: unknown[]) => {
      const next = responses.shift();
      if (!next) throw new Error("unexpected fetch call");
      return next();
    });

    const provider = new VolcengineProvider(
      { VOLCENGINE_API_KEY: "k" },
      {
        pollIntervalMs: 0,
        fetchFn: mockFetch as unknown as typeof fetch
      }
    );

    const model: VideoModel = {
      id: "doubao-seedance-1-0-pro-250528",
      name: "Seedance Pro",
      provider: "volcengine"
    };

    const bytes = await provider.textToVideo({
      model,
      prompt: "a cat surfing",
      durationSeconds: 5,
      resolution: "1080p"
    });
    expect(Array.from(bytes)).toEqual([7, 7, 7]);

    const urls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toBe(
      "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
    );
    expect(urls[1]).toContain("/contents/generations/tasks/task-42");
    expect(urls[3]).toBe("https://cdn.volcengine.com/v.mp4");

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as { body: string }).body
    );
    expect(body.model).toBe("doubao-seedance-1-0-pro-250528");
    expect(body.content).toEqual([{ type: "text", text: "a cat surfing" }]);
    expect(body.parameters.duration).toBe(5);
    expect(body.parameters.resolution).toBe("1080p");
  });

  it("submits an image-to-video task with image_url content", async () => {
    const responses: Array<() => Promise<any>> = [
      async () => ({
        ok: true,
        json: async () => ({ id: "t1" })
      }),
      async () => ({
        ok: true,
        json: async () => ({
          status: "succeeded",
          content: { video_url: "https://cdn.volcengine.com/v2.mp4" }
        })
      }),
      async () => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => new Uint8Array([1]).buffer
      })
    ];
    const mockFetch = vi.fn(async (..._args: unknown[]) => {
      const next = responses.shift();
      if (!next) throw new Error("unexpected fetch call");
      return next();
    });

    const provider = new VolcengineProvider(
      { VOLCENGINE_API_KEY: "k" },
      {
        pollIntervalMs: 0,
        fetchFn: mockFetch as unknown as typeof fetch
      }
    );

    const model: VideoModel = {
      id: "doubao-seedance-1-0-lite-i2v-250428",
      name: "Seedance Lite I2V",
      provider: "volcengine"
    };

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    ]);

    await provider.imageToVideo([pngBytes], {
      model,
      prompt: "wave effect",
      durationSeconds: 5,
      resolution: "720p"
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as { body: string }).body
    );
    expect(body.content).toHaveLength(2);
    expect(body.content[0]).toEqual({ type: "text", text: "wave effect" });
    expect(body.content[1].type).toBe("image_url");
    expect(body.content[1].image_url.url).toContain("data:image/png;base64,");
    expect(body.parameters.duration).toBe(5);
    expect(body.parameters.resolution).toBe("720p");
  });

  it("surfaces task failure with error message", async () => {
    const responses: Array<() => Promise<any>> = [
      async () => ({
        ok: true,
        json: async () => ({ id: "fail-task" })
      }),
      async () => ({
        ok: true,
        json: async () => ({
          status: "failed",
          error: { message: "Content policy violation" }
        })
      })
    ];
    const mockFetch = vi.fn(async (..._args: unknown[]) => {
      const next = responses.shift();
      if (!next) throw new Error("unexpected fetch call");
      return next();
    });

    const provider = new VolcengineProvider(
      { VOLCENGINE_API_KEY: "k" },
      {
        pollIntervalMs: 0,
        fetchFn: mockFetch as unknown as typeof fetch
      }
    );

    const model: VideoModel = {
      id: "doubao-seedance-1-0-pro-250528",
      name: "Seedance Pro",
      provider: "volcengine"
    };

    await expect(
      provider.textToVideo({ model, prompt: "test" })
    ).rejects.toThrow(/Content policy violation/);
  });

  it("surfaces submit HTTP errors", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    const provider = new VolcengineProvider(
      { VOLCENGINE_API_KEY: "bad" },
      {
        fetchFn: mockFetch as unknown as typeof fetch
      }
    );

    const model: VideoModel = {
      id: "doubao-seedance-1-0-pro-250528",
      name: "Seedance Pro",
      provider: "volcengine"
    };

    await expect(
      provider.textToVideo({ model, prompt: "test" })
    ).rejects.toThrow(/task submit failed: 401/);
  });
});
