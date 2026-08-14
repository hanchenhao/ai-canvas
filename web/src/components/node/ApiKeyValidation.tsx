import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, EditorButton } from "../ui_primitives";
import { useApiKeyValidation } from "../../hooks/useApiKeyValidation";
import { getRequiredSecretKeyForNamespace } from "../../utils/nodeProvider";
import { openProviderOnboarding } from "../../stores/ProviderOnboardingStore";

interface ApiKeyValidationProps {
  nodeNamespace: string;
}

const ApiKeyValidation: React.FC<ApiKeyValidationProps> = React.memo(
  ({ nodeNamespace }) => {
    const { t } = useTranslation("canvas");
    const missingAPIKey = useApiKeyValidation(nodeNamespace);

    const handleConnectProvider = useCallback(() => {
      openProviderOnboarding({
        highlightSecretKey:
          getRequiredSecretKeyForNamespace(nodeNamespace) ?? undefined,
        reason: "This node needs a provider key. Connect it to run the node."
      });
    }, [nodeNamespace]);

    const content = useMemo(() => {
      if (!missingAPIKey || typeof missingAPIKey !== "string") {return null;}

      return (
        <>
          <Text
            className="node-status"
            size="smaller"
            sx={{
              width: "100%",
              textAlign: "center",
              textTransform: "uppercase",
              padding: ".5em !important",
              marginBottom: "0"
            }}
          >
            {String(missingAPIKey)} is missing!
          </Text>
          <EditorButton
            className="api-key-button"
            variant="contained"
            color="primary"
            size="small"
            onClick={handleConnectProvider}
            sx={{
              margin: "0 1em",
              padding: ".2em 0 0",
              height: "1.8em",
              lineHeight: "1.2em",
              color: "var(--palette-grey-1000)",
              backgroundColor: "var(--palette-warning-main)",
              fontSize: "var(--fontSizeSmaller)",
              borderRadius: ".1em"
            }}
          >
            {t("canvas:node.connectProvider")}
          </EditorButton>
        </>
      );
    }, [missingAPIKey, handleConnectProvider, t]);

    return content;
  }
);

ApiKeyValidation.displayName = "ApiKeyValidation";

export default ApiKeyValidation;
