import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import CollectionList from "./CollectionList";

/**
 * Full-screen Collections page. Reachable from the logo menu; wraps the
 * collection list in the shared manager chrome (header + back button).
 */
const CollectionsExplorer: React.FC = () => {
  const { t } = useTranslation("collections");
  return (
    <ManagerPageLayout
      icon={<LibraryBooksOutlinedIcon sx={{ fontSize: 22 }} />}
      title={t("title.explorer")}
      subtitle={t("title.subtitle")}
      docsTopic="collections"
    >
      <CollectionList />
    </ManagerPageLayout>
  );
};

CollectionsExplorer.displayName = "CollectionsExplorer";

export default memo(CollectionsExplorer);
