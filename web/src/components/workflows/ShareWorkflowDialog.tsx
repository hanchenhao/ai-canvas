/**
 * Share dialog for private workflow sharing.
 *
 * Owner-only. Mints role-scoped share links ("Can view" / "Can edit"),
 * lists collaborators who redeemed a link, and lets the owner change roles,
 * remove collaborators, or revoke links.
 */
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  FlexColumn,
  FlexRow,
  Text,
  Caption,
  Chip,
  Divider,
  CopyButton,
  DeleteButton,
  EditorButton,
  SelectField,
  LoadingSpinner,
  EmptyState,
  SPACING
} from "../ui_primitives";
import {
  useWorkflowSharing,
  shareUrlForToken,
  type ShareRole
} from "../../serverState/useWorkflowSharing";
import { useNotificationStore } from "../../stores/NotificationStore";

interface ShareWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

const ShareWorkflowDialog = ({
  open,
  onClose,
  workflowId,
  workflowName
}: ShareWorkflowDialogProps) => {
  const { t } = useTranslation("workspace");
  const { query, createLink, revokeLink, setRole, removeCollaborator } =
    useWorkflowSharing(open ? workflowId : null);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  const roleLabels = useMemo<Record<ShareRole, string>>(
    () => ({
      viewer: t("workspace:share.roleViewer"),
      editor: t("workspace:share.roleEditor")
    }),
    [t]
  );

  const roleOptions = useMemo(
    () => [
      { value: "viewer", label: roleLabels.viewer },
      { value: "editor", label: roleLabels.editor }
    ] as const,
    [roleLabels]
  );

  const activeShares = (query.data?.shares ?? []).filter(
    (share) => share.revoked_at == null
  );
  const collaborators = query.data?.collaborators ?? [];

  const handleCreateLink = useCallback(
    async (role: ShareRole) => {
      let share;
      try {
        share = await createLink.mutateAsync(role);
      } catch {
        addNotification({
          type: "error",
          content: t("workspace:share.createFailed"),
          alert: true
        });
        return;
      }
      // Clipboard access can be denied (permissions, insecure context); the
      // link exists either way and stays copyable from the list below.
      try {
        await navigator.clipboard.writeText(shareUrlForToken(share.token));
        addNotification({
          type: "success",
          content: t("workspace:share.linkCopied", { role: roleLabels[role] }),
          alert: true
        });
      } catch {
        addNotification({
          type: "info",
          content: t("workspace:share.linkCreated"),
          alert: true
        });
      }
    },
    [createLink, addNotification, t, roleLabels]
  );

  return (
    <Dialog
      className="share-workflow-dialog"
      open={open}
      onClose={onClose}
      title={t("workspace:share.title", { name: workflowName })}
      maxWidth="sm"
      fullWidth
    >
      <FlexColumn gap={SPACING.md} sx={{ pb: 2 }}>
        <Caption>
          {t("workspace:share.description")}
        </Caption>

        <FlexRow gap={SPACING.sm}>
          <EditorButton
            variant="outlined"
            disabled={createLink.isPending}
            onClick={() => void handleCreateLink("viewer")}
          >
            {t("workspace:share.copyViewLink")}
          </EditorButton>
          <EditorButton
            variant="outlined"
            disabled={createLink.isPending}
            onClick={() => void handleCreateLink("editor")}
          >
            {t("workspace:share.copyEditLink")}
          </EditorButton>
        </FlexRow>

        {query.isLoading && <LoadingSpinner />}

        {activeShares.length > 0 && (
          <FlexColumn gap={SPACING.xs}>
            <Text size="small">{t("workspace:share.activeLinks")}</Text>
            {activeShares.map((share) => (
              <FlexRow
                key={share.id}
                gap={SPACING.sm}
                align="center"
                justify="space-between"
              >
                <FlexRow gap={SPACING.sm} align="center">
                  <Chip label={roleLabels[share.role]} size="small" />
                  <CopyButton
                    value={shareUrlForToken(share.token)}
                    tooltip={t("workspace:share.copyShareLink")}
                  />
                </FlexRow>
                <EditorButton
                  density="compact"
                  disabled={revokeLink.isPending}
                  onClick={() => revokeLink.mutate(share.id)}
                >
                  {t("workspace:share.revoke")}
                </EditorButton>
              </FlexRow>
            ))}
          </FlexColumn>
        )}

        <Divider />

        <Text size="small">{t("workspace:share.peopleWithAccess")}</Text>
        {collaborators.length === 0 && !query.isLoading && (
          <EmptyState
            variant="empty"
            title={t("workspace:share.noCollaborators")}
            description={t("workspace:share.noCollaboratorsHint")}
          />
        )}
        {collaborators.map((collaborator) => (
          <FlexRow
            key={collaborator.user_id}
            gap={SPACING.sm}
            align="center"
            justify="space-between"
          >
            <Text
              size="small"
              sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {collaborator.user_id}
            </Text>
            <FlexRow gap={SPACING.sm} align="center">
              <SelectField
                label=""
                size="small"
                value={collaborator.role}
                options={roleOptions}
                disabled={setRole.isPending}
                onChange={(value) =>
                  setRole.mutate({
                    userId: collaborator.user_id,
                    role: value as ShareRole
                  })
                }
              />
              <DeleteButton
                tooltip={t("workspace:share.removeAccess")}
                disabled={removeCollaborator.isPending}
                onClick={() => removeCollaborator.mutate(collaborator.user_id)}
              />
            </FlexRow>
          </FlexRow>
        ))}
      </FlexColumn>
    </Dialog>
  );
};

export default memo(ShareWorkflowDialog);
