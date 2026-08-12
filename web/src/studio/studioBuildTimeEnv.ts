/**
 * Build-time Studio env reads, isolated in their own module so Jest can map
 * it to a mock — `import.meta.env` does not survive the CommonJS transform.
 * Mirrors `lib/supabaseBuildTimeEnv.ts`.
 */

export const studioVideoProvider: string | undefined =
  import.meta.env.VITE_STUDIO_VIDEO_PROVIDER?.trim() || undefined;
export const studioVideoModel: string | undefined =
  import.meta.env.VITE_STUDIO_VIDEO_MODEL?.trim() || undefined;
export const studioVideoModelName: string | undefined =
  import.meta.env.VITE_STUDIO_VIDEO_MODEL_NAME?.trim() || undefined;
export const studioAppName: string | undefined =
  import.meta.env.VITE_APP_NAME?.trim() || undefined;
