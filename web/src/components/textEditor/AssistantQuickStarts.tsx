/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import type React from "react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DataObjectIcon from "@mui/icons-material/DataObject";
import NotesIcon from "@mui/icons-material/Notes";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { MOTION, BORDER_RADIUS } from "../ui_primitives";

interface QuickStart {
  icon: React.ReactNode;
  labelKey: string;
  promptKey: string;
}

interface AssistantQuickStartsProps {
  propertyName: string;
  onQuickStart: (prompt: string) => void;
}

const QUICK_STARTS: QuickStart[] = [
  {
    icon: <AutoFixHighIcon />,
    labelKey: "quickStart.draftFromScratch",
    promptKey: "quickStart.draftFromScratchPrompt"
  },
  {
    icon: <DataObjectIcon />,
    labelKey: "quickStart.addInputVariables",
    promptKey: "quickStart.addInputVariablesPrompt"
  },
  {
    icon: <NotesIcon />,
    labelKey: "quickStart.makeConcise",
    promptKey: "quickStart.makeConcisePrompt"
  },
  {
    icon: <ArticleOutlinedIcon />,
    labelKey: "quickStart.addSystemRole",
    promptKey: "quickStart.addSystemRolePrompt"
  }
];

const styles = (theme: Theme) =>
  css({
    display: "flex",
    flexDirection: "column",
    gap: "1.1em",
    padding: "1.5em 1em 0.5em",
    ".hero": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "0.5em"
    },
    ".hero-badge": {
      width: "3em",
      height: "3em",
      borderRadius: BORDER_RADIUS.lg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: theme.vars.palette.primary.main,
      background: `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`,
      border: `1px solid rgba(${theme.vars.palette.primary.mainChannel} / 0.25)`,
      marginBottom: "0.25em",
      svg: { fontSize: "1.6em" }
    },
    ".hero-title": {
      margin: 0,
      fontSize: "var(--fontSizeBig)",
      fontWeight: 600,
      color: theme.vars.palette.text.primary
    },
    ".hero-text": {
      margin: 0,
      maxWidth: "22em",
      fontSize: "var(--fontSizeSmall)",
      lineHeight: 1.5,
      color: theme.vars.palette.text.secondary
    },
    ".quick-label": {
      fontSize: "var(--fontSizeSmaller)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.vars.palette.text.disabled,
      paddingLeft: "0.2em"
    },
    ".quick-list": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5em"
    },
    ".quick-item": {
      display: "flex",
      alignItems: "center",
      gap: "0.75em",
      width: "100%",
      padding: "0.7em 0.85em",
      borderRadius: BORDER_RADIUS.lg,
      cursor: "pointer",
      textAlign: "left",
      color: theme.vars.palette.text.primary,
      backgroundColor: `rgba(${theme.vars.palette.background.paperChannel} / 0.5)`,
      border: `1px solid rgba(${theme.vars.palette.common.whiteChannel} / 0.06)`,
      transition: `all ${MOTION.fast}`,
      "&:hover": {
        borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.5)`,
        backgroundColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.08)`,
        transform: "translateX(2px)"
      },
      ".quick-icon": {
        display: "flex",
        color: theme.vars.palette.primary.light,
        svg: { fontSize: "var(--fontSizeBig)" }
      },
      ".quick-text": {
        flex: 1,
        fontSize: "var(--fontSizeSmall)",
        fontWeight: 500
      },
      ".quick-arrow": {
        display: "flex",
        color: theme.vars.palette.text.disabled,
        svg: { fontSize: "var(--fontSizeNormal)" }
      }
    }
  });

const AssistantQuickStarts = ({
  propertyName,
  onQuickStart
}: AssistantQuickStartsProps) => {
  const { t } = useTranslation("chat");
  const theme = useTheme();
  const target = `the "${propertyName}" value`;

  return (
    <div className="assistant-quick-starts" css={styles(theme)}>
      <div className="hero">
        <div className="hero-badge">
          <AutoAwesomeIcon />
        </div>
        <h3 className="hero-title">{t("quickStart.title")}</h3>
        <p className="hero-text">
          {t("quickStart.subtitle")}
        </p>
      </div>
      <span className="quick-label">{t("quickStart.quickStarts")}</span>
      <div className="quick-list">
        {QUICK_STARTS.map((item) => (
          <button
            key={item.labelKey}
            type="button"
            className="quick-item"
            onClick={() => onQuickStart(t(item.promptKey, { target }))}
          >
            <span className="quick-icon">{item.icon}</span>
            <span className="quick-text">{t(item.labelKey)}</span>
            <span className="quick-arrow">
              <ChevronRightIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(AssistantQuickStarts);
