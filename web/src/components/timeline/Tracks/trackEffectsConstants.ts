/**
 * Static effect metadata for TrackEffectsPanel.
 *
 * Extracted from TrackEffectsPanel.tsx to keep the panel component focused on
 * rendering/interaction. These are pure data keyed by TrackEffect["type"].
 */
import type { TrackEffect } from "@nodetool-ai/timeline";

/** Device-rack width (px) per effect type. */
export const DEVICE_WIDTHS: Record<TrackEffect["type"], number> = {
  gain: 200,
  eq3: 420,
  filter: 240,
  compressor: 380,
  colorCorrection: 320,
  videoBlur: 220,
  sharpen: 240,
  vignette: 260,
  chromaKey: 280
};

/** Effect types available on audio tracks. */
export const AUDIO_EFFECT_TYPES: TrackEffect["type"][] = [
  "gain",
  "eq3",
  "filter",
  "compressor"
];

/** Effect types available on video tracks. */
export const VIDEO_EFFECT_TYPES: TrackEffect["type"][] = [
  "colorCorrection",
  "videoBlur",
  "sharpen",
  "vignette",
  "chromaKey"
];
