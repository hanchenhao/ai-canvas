/**
 * modeProviderSetup — maps a composer media mode to the provider capability it
 * needs, plus the message shown when no provider with that capability is
 * configured. Used by the composer's setup banner and its send gate to route
 * the user into the provider-onboarding dialog instead of letting a send fail.
 */
import type { MediaMode } from "../../../stores/MediaGenerationStore";
import type { OnboardingCapability } from "../../../stores/ProviderOnboardingStore";

/** Backend capability a mode's generation request is served by. Modes that are
 *  not selectable yet (retake, extend, …) map to null and are never gated. */
export const capabilityForMode = (
  mode: MediaMode
): OnboardingCapability | null => {
  switch (mode) {
    case "chat":
      return "generate_message";
    case "image":
    case "image_edit":
      return "text_to_image";
    case "video":
    case "image_to_video":
      return "text_to_video";
    case "audio":
      return "text_to_speech";
    default:
      return null;
  }
};

/**
 * One-liner reason shown in the setup banner. Returns a `chat:` namespace
 * translation key — callers translate via `useTranslation`. Null when the mode
 * has no setup copy (modes that are not selectable yet).
 */
export const setupReasonKeyForMode = (mode: MediaMode): string | null => {
  switch (mode) {
    case "chat":
      return "chat:composer.setupChat";
    case "image":
      return "chat:composer.setupImage";
    case "image_edit":
      return "chat:composer.setupImageEdit";
    case "video":
      return "chat:composer.setupVideo";
    case "image_to_video":
      return "chat:composer.setupImageToVideo";
    case "audio":
      return "chat:composer.setupAudio";
    default:
      return null;
  }
};
