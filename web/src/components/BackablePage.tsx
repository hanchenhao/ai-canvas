/**
 * Layout for full-page routes that have no navigation chrome of their own:
 * a slim header with a back button and an optional title. Back goes one
 * history entry back when the app navigated in-session, and falls back to
 * /studio on a cold first load (the Electron common case). Cmd/Ctrl+[ does
 * the same, except while typing in a field.
 */

import React, { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  EditorButton,
  FlexColumn,
  FlexRow,
  SPACING,
  Text
} from "./ui_primitives";

export interface BackablePageProps {
  /** Page title shown next to the back button. */
  title?: string;
  /** Class applied to the outer container (e.g. "page-enter"). */
  className?: string;
  children: React.ReactNode;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select") !== null
  );
};

const BackablePage = ({ title, className, children }: BackablePageProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["common"]);

  // React Router keys the initial history entry "default"; any later entry
  // (or a POP back to it) means there is somewhere in-app to return to.
  const canGoBack = location.key !== "default";
  const goBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate("/studio");
    }
  }, [canGoBack, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "[" &&
        (event.metaKey || event.ctrlKey) &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBack]);

  return (
    <FlexColumn fullHeight className={className} sx={{ width: "100%", minHeight: 0 }}>
      <FlexRow
        align="center"
        gap={SPACING.md}
        sx={{
          flexShrink: 0,
          px: SPACING.lg,
          py: SPACING.sm,
          borderBottom: `1px solid ${theme.vars.palette.divider}`
        }}
      >
        <EditorButton
          size="small"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          onClick={goBack}
        >
          {t("common:button.back")}
        </EditorButton>
        {title && (
          <Text size="normal" color="secondary" truncate>
            {title}
          </Text>
        )}
      </FlexRow>
      <FlexColumn fullHeight sx={{ minHeight: 0, flex: 1 }}>
        {children}
      </FlexColumn>
    </FlexColumn>
  );
};

export default BackablePage;
