import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import ManagerPageLayout from "../../panels/ManagerPageLayout";
import ModelListIndex from "./ModelListIndex";

/**
 * Full-screen Model Manager page. Reachable from the logo menu; wraps the
 * model list in the shared manager chrome (header + back button).
 */
const ModelsPage: React.FC = () => {
  const { t } = useTranslation("huggingface");
  return (
  <ManagerPageLayout
    icon={<ViewInArOutlinedIcon sx={{ fontSize: 22 }} />}
    title={t("huggingface:modelList.modelManager")}
    subtitle="Browse, download, and manage local AI models."
    docsTopic="modelsManager"
    padded={false}
  >
    <ModelListIndex />
  </ManagerPageLayout>
  );
};

ModelsPage.displayName = "ModelsPage";

export default memo(ModelsPage);
