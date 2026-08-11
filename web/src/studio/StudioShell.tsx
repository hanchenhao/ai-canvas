/** @jsxImportSource @emotion/react */
/**
 * Product chrome for the creator-facing experience. The advanced NodeTool
 * workspace remains available, but the primary navigation uses the language
 * of image and video creation rather than infrastructure and node graphs.
 */

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MovieFilterRoundedIcon from "@mui/icons-material/MovieFilterRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  EditorButton,
  FlexColumn,
  FlexRow,
  SPACING,
  Text,
  ThemeToggleButton
} from "../components/ui_primitives";
import { useStudioAssistantModel } from "./useStudioAssistantModel";
import { StudioProvider } from "./StudioContext";
import { PRODUCT_NAME } from "./productConfig";

export interface StudioShellProps {
  /** Page title shown next to the brand; omit on the home screen. */
  title?: string;
  /** Show the back-to-home button (every page except home). */
  showBack?: boolean;
  /** Page-specific header actions (e.g. "Create video"). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const StudioShell = ({
  title,
  showBack = true,
  actions,
  children
}: StudioShellProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  useStudioAssistantModel();
  return (
    <StudioProvider>
      <FlexColumn fullHeight sx={{ width: "100%", minHeight: 0 }}>
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
          {showBack && (
            <EditorButton
              size="small"
              startIcon={<ArrowBackRoundedIcon fontSize="small" />}
              onClick={() => navigate("/studio")}
            >
              {t("common:studio.home")}
            </EditorButton>
          )}
          {!showBack && (
            <FlexRow align="center" gap={SPACING.sm}>
              <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
              <Text size="normal" weight={600}>
                {PRODUCT_NAME}
              </Text>
            </FlexRow>
          )}
          {title && (
            <Text size="normal" color="secondary" truncate>
              {title}
            </Text>
          )}
          <FlexRow sx={{ flex: 1 }} />
          <FlexRow
            align="center"
            gap={SPACING.xs}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            <EditorButton
              startIcon={<MovieFilterRoundedIcon fontSize="small" />}
              onClick={() => navigate("/studio")}
            >
              {t("common:studio.homeNav")}
            </EditorButton>
            <EditorButton
              startIcon={<AccountTreeRoundedIcon fontSize="small" />}
              onClick={() => navigate("/workspace")}
            >
              {t("common:studio.canvas")}
            </EditorButton>
            <EditorButton
              startIcon={<CollectionsRoundedIcon fontSize="small" />}
              onClick={() => navigate("/assets")}
            >
              {t("common:studio.assets")}
            </EditorButton>
          </FlexRow>
          {actions}
          <EditorButton
            startIcon={<SettingsRoundedIcon fontSize="small" />}
            onClick={() => navigate("/settings")}
          >
            {t("common:studio.modelSettings")}
          </EditorButton>
          <ThemeToggleButton />
        </FlexRow>
        <FlexColumn sx={{ flex: 1, minHeight: 0, width: "100%" }}>
          {children}
        </FlexColumn>
      </FlexColumn>
    </StudioProvider>
  );
};

export default StudioShell;
