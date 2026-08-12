import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProvidersByCapability } from "../../../hooks/useProviders";
import { openProviderOnboarding } from "../../../stores/ProviderOnboardingStore";
import type { MediaMode } from "../../../stores/MediaGenerationStore";
import { capabilityForMode, setupReasonKeyForMode } from "./modeProviderSetup";

export interface ModeProviderSetup {
  /** True when the mode needs a capability no configured provider serves. */
  needsSetup: boolean;
  /** Banner copy for the current mode (null when nothing is needed). */
  reason: string | null;
  /** Open the provider-onboarding dialog filtered to the mode's capability. */
  openSetup: () => void;
}

/**
 * Watches whether the selected composer mode has a configured provider behind
 * it. The providers endpoint only lists providers whose credential is present,
 * so an empty capability-filtered list means the mode cannot run until the
 * user connects a provider. Pass null (e.g. Pi mode) to disable the check.
 * While the provider query is loading or errored the check stays quiet — the
 * connection banner already surfaces fetch errors.
 */
export const useModeProviderSetup = (
  mode: MediaMode | null
): ModeProviderSetup => {
  const { t } = useTranslation("chat");
  const capability = mode ? capabilityForMode(mode) : null;
  const { providers, isLoading, error } = useProvidersByCapability(
    capability ?? "generate_message"
  );
  const needsSetup =
    capability !== null && !isLoading && !error && providers.length === 0;
  const reasonKey = needsSetup && mode ? setupReasonKeyForMode(mode) : null;
  const reason = reasonKey ? t(reasonKey) : null;

  const openSetup = useCallback(() => {
    if (!capability) {
      return;
    }
    openProviderOnboarding({
      capability,
      reason: (mode && setupReasonKeyForMode(mode) && t(setupReasonKeyForMode(mode)!)) || undefined
    });
  }, [capability, mode, t]);

  return { needsSetup, reason, openSetup };
};
