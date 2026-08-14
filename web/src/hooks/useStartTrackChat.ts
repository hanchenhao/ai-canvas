import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useGlobalChatStore from "../stores/GlobalChatStore";
import useMediaGenerationStore from "../stores/MediaGenerationStore";
import { useChatDraftStore } from "../stores/ChatDraftStore";
import { useWorkspaceTabsStore } from "../stores/WorkspaceTabsStore";
import useOnboardingStore from "../stores/OnboardingStore";
import { useNotificationStore } from "../stores/NotificationStore";
import {
  WELCOME_TRACKS,
  type WelcomeTrackId
} from "../components/portal/welcomeTracks";

/**
 * Opens a welcome-flow track as a chat tab: a fresh thread in the track's
 * composer mode, with the track's example prompt already in the box. Nothing
 * is sent — the user reads the prompt, edits it if they like, and presses
 * send.
 */
export const useStartTrackChat = (): ((
  trackId: WelcomeTrackId
) => Promise<void>) => {
  const navigate = useNavigate();
  const { t } = useTranslation("workspace");

  return useCallback(
    async (trackId: WelcomeTrackId) => {
      const track = WELCOME_TRACKS.find((t) => t.id === trackId);
      if (!track) {
        return;
      }
      useOnboardingStore.getState().markStep("open-template");

      // The composer reads both axes: the media mode decides what the send
      // generates, and the routing mode has to be plain chat rather than Pi.
      useMediaGenerationStore.getState().setMode(track.chatMode);
      useGlobalChatStore.getState().setMode("chat");

      try {
        const threadId = await useGlobalChatStore
          .getState()
          // Explicit null: a dashboard starter is a plain conversation, not
          // one bound to whatever workflow happens to be open.
          .createNewThread(t(`welcome.tracks.${track.id}.threadTitle`), null);
        useChatDraftStore
          .getState()
          .setDraft(threadId, t(`welcome.tracks.${track.id}.samplePrompt`));
        useWorkspaceTabsStore.getState().openTab({
          type: "chat",
          ref: threadId,
          mode: "view",
          title: t(`welcome.tracks.${track.id}.threadTitle`)
        });
        navigate("/workspace");
      } catch (error) {
        console.error("Failed to open starter chat:", error);
        useNotificationStore.getState().addNotification({
          type: "warning",
          alert: true,
          content: t("welcome.couldNotOpenChat", {
            label: t(`welcome.tracks.${track.id}.label`)
          })
        });
      }
    },
    [navigate, t]
  );
};
