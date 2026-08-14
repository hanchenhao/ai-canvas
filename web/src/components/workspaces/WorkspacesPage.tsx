import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import WorkspacesManager from "./WorkspacesManager";

/**
 * Full-screen Workspaces page. Reachable from the logo menu; wraps the
 * workspace manager in the shared manager chrome (header + back button).
 */
const WorkspacesPage: React.FC = () => {
  const { t } = useTranslation("workspace");
  return (
    <ManagerPageLayout
      icon={<FolderSpecialOutlinedIcon sx={{ fontSize: 22 }} />}
      title={t("workspace:manager.pageTitle")}
      subtitle={t("workspace:manager.pageSubtitle")}
      docsTopic="workspaces"
    >
      <WorkspacesManager />
    </ManagerPageLayout>
  );
};

WorkspacesPage.displayName = "WorkspacesPage";

export default memo(WorkspacesPage);
