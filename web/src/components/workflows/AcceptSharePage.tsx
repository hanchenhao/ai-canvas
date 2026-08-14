/**
 * Landing page for workflow share links (`/share/:token`).
 *
 * Redeems the token, which registers the signed-in user as a collaborator,
 * then forwards to the workflow in the editor. Invalid or revoked links get
 * an error state instead of a redirect.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertBanner,
  EditorButton,
  FlexColumn,
  LoadingSpinner,
  Text,
  SPACING
} from "../ui_primitives";
import { useAcceptShare } from "../../serverState/useWorkflowSharing";

const AcceptSharePage = () => {
  const { t } = useTranslation("common");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const accept = useAcceptShare();
  const redeemedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || redeemedToken.current === token) return;
    redeemedToken.current = token;
    accept
      .mutateAsync(token)
      .then((result) => {
        navigate(`/editor/${result.workflow.id}`, { replace: true });
      })
      .catch(() => {
        // Error state rendered below from the mutation.
      });
  }, [token, accept, navigate]);

  return (
    <FlexColumn
      align="center"
      justify="center"
      gap={SPACING.lg}
      sx={{ width: "100%", height: "100%", p: 4 }}
    >
      {accept.isError ? (
        <>
          <AlertBanner severity="error">
            {t("workspace:share.invalidLink")}
          </AlertBanner>
          <EditorButton variant="outlined" onClick={() => navigate("/editor")}>
            {t("workspace:share.goToEditor")}
          </EditorButton>
        </>
      ) : (
        <>
          <LoadingSpinner />
          <Text size="small">{t("common:workflowsExtra.openingSharedWorkflow")}</Text>
        </>
      )}
    </FlexColumn>
  );
};

export default AcceptSharePage;
