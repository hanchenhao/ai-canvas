const configuredName = import.meta.env.VITE_APP_NAME?.trim();

/** Product-facing identity for the self-hosted creator experience. */
export const PRODUCT_NAME = configuredName || "AI Canvas";
