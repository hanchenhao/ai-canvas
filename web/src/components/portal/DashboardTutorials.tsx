/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import type { Theme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TutorialCard } from "../tutorials/TutorialCard";
import { useTutorials } from "../tutorials/tutorialsData";
import { SPACING, getSpacingPx } from "../ui_primitives";
import { wrapStyles, SectionHeader, SectionLink } from "./dashboardChrome";

const gridStyles = (theme: Theme) =>
  css({
    paddingTop: getSpacingPx(SPACING.md),
    ".tut-grid": {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: getSpacingPx(SPACING.md),
      [theme.breakpoints.down("md")]: {
        gridTemplateColumns: "repeat(2, 1fr)"
      },
      [theme.breakpoints.down("sm")]: {
        gridTemplateColumns: "1fr"
      }
    }
  });

/** Dashboard section: the beginner tutorials, opening the Tutorials page. */
const DashboardTutorials: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const tutorials = useTutorials();

  const open = useCallback(
    (id: string) => navigate(`/tutorials?id=${id}`),
    [navigate]
  );

  return (
    <section css={gridStyles(theme)}>
      <div css={wrapStyles(theme)}>
        <SectionHeader title={t("common:dashboard.learnBasics")} count="new here? start here">
          <SectionLink onClick={() => navigate("/tutorials")}>
            All tutorials
          </SectionLink>
        </SectionHeader>
        <div className="tut-grid">
          {tutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} onClick={open} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(DashboardTutorials);
