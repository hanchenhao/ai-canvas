/** @jsxImportSource @emotion/react */
import React from "react";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { createStyles } from "./EmptyThreadList.styles";
import { EmptyState } from "../../ui_primitives";

export const EmptyThreadList: React.FC<{ isFiltered?: boolean }> = ({
  isFiltered = false
}) => {
  const theme = useTheme();
  const { t } = useTranslation("chat");
  return (
    <li css={createStyles(theme)}>
      <EmptyState
        variant="empty"
        title={isFiltered ? t("chat:list.noMatchingConversations") : t("chat:list.noConversationsYetShort")}
        description={
          isFiltered
            ? t("chat:list.tryDifferentSearch")
            : t("chat:list.startConversationPrompt")
        }
        size="small"
      />
    </li>
  );
};
