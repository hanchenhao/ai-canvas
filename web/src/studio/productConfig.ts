import { getBuildEnv } from "../lib/buildEnv";

const configuredName = getBuildEnv("VITE_APP_NAME")?.trim();

/** Product-facing identity for the local desktop creator experience. */
export const PRODUCT_NAME = configuredName || "BrainVite-AI-Canvas";
