import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import PackageManager from "./PackageManager";

/**
 * Full-screen Package Manager page: the unified installer (runtimes and node
 * packs) wrapped in the shared manager chrome (header + back button).
 */
const PackagesPage: React.FC = () => {
  const { t } = useTranslation("packages");
  return (
    <ManagerPageLayout
      icon={<Inventory2OutlinedIcon sx={{ fontSize: 22 }} />}
      title={t("title.packageManager")}
      subtitle={t("title.subtitle")}
      docsTopic="nodePacks"
      padded={false}
    >
      <PackageManager />
    </ManagerPageLayout>
  );
};

PackagesPage.displayName = "PackagesPage";

export default memo(PackagesPage);
