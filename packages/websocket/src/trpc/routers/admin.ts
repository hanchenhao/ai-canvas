import { z } from "zod";
import { loadAssetStorageConfig } from "@nodetool-ai/config";
import { Secret } from "@nodetool-ai/models";
import { router } from "../index.js";
import { protectedProcedure } from "../middleware.js";
import { requireAdmin } from "../admin-auth.js";

const providerStatus = z.object({
  id: z.string(),
  name: z.string(),
  secretKey: z.string(),
  configured: z.boolean(),
  source: z.enum(["database", "environment", "none"])
});

const storageStatus = z.object({
  kind: z.enum(["file", "s3", "supabase", "invalid"]),
  bucket: z.string().nullable(),
  region: z.string().nullable(),
  endpoint: z.string().nullable(),
  forcePathStyle: z.boolean().nullable(),
  error: z.string().nullable()
});

const statusOutput = z.object({
  version: z.string(),
  nodeVersion: z.string(),
  uptimeSeconds: z.number(),
  secretEncryptionConfigured: z.boolean(),
  providers: z.array(providerStatus),
  storage: storageStatus
});

const PROVIDERS = [
  { id: "minimax", name: "MiniMax", secretKey: "MINIMAX_API_KEY" },
  { id: "kie", name: "Seedance（KIE）", secretKey: "KIE_API_KEY" },
  {
    id: "atlascloud",
    name: "Seedance（AtlasCloud）",
    secretKey: "ATLASCLOUD_API_KEY"
  }
] as const;

export const adminRouter = router({
  status: protectedProcedure.output(statusOutput).query(async ({ ctx }) => {
    requireAdmin(ctx.userId);

    const [storedSecrets] = await Secret.listForUser(ctx.userId, 1000);
    const storedKeys = new Set(storedSecrets.map((secret) => secret.key));
    const providers = PROVIDERS.map((provider) => {
      const source = storedKeys.has(provider.secretKey)
        ? ("database" as const)
        : process.env[provider.secretKey]
          ? ("environment" as const)
          : ("none" as const);
      return { ...provider, configured: source !== "none", source };
    });

    let storage: z.infer<typeof storageStatus>;
    try {
      const config = loadAssetStorageConfig();
      storage = {
        kind: config.kind,
        bucket:
          config.kind === "s3" || config.kind === "supabase"
            ? config.bucket
            : null,
        region: config.kind === "s3" ? (config.region ?? null) : null,
        endpoint: config.kind === "s3" ? (config.endpoint ?? null) : null,
        forcePathStyle:
          config.kind === "s3" ? (config.forcePathStyle ?? null) : null,
        error: null
      };
    } catch (error) {
      storage = {
        kind: "invalid",
        bucket: null,
        region: null,
        endpoint: null,
        forcePathStyle: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return {
      version: process.env.npm_package_version ?? "development",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      secretEncryptionConfigured: Boolean(process.env.SECRETS_MASTER_KEY),
      providers,
      storage
    };
  })
});
