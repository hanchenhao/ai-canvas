/**
 * Under Jest there is no Vite build, so no build-time overrides exist —
 * every Studio default (kie provider, Seedance model, "AI Canvas" name)
 * applies. Mirrors production when no VITE_STUDIO_* / VITE_APP_NAME is set.
 */
export const studioVideoProvider: string | undefined = undefined;
export const studioVideoModel: string | undefined = undefined;
export const studioVideoModelName: string | undefined = undefined;
export const studioAppName: string | undefined = undefined;
