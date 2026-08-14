import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import DashboardTemplates from "./DashboardTemplates";

/**
 * Full-screen Examples page. Reachable from the logo menu and the dashboard's
 * "Browse all" link; wraps the example/template browser in the shared manager
 * chrome (header + back button) and lets it own its scroll.
 */
const ExamplesPage: React.FC = () => {
  const { t } = useTranslation("common");
  return (
    <ManagerPageLayout
      icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: 22 }} />}
      title={t("common:page.examples")}
      subtitle={t("common:page.examplesSubtitle")}
      docsTopic="examples"
      padded={false}
    >
      <DashboardTemplates fullPage />
    </ManagerPageLayout>
  );
};

ExamplesPage.displayName = "ExamplesPage";

export default memo(ExamplesPage);
