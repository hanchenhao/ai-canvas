/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";

const FolderPathProperty = (props: PropertyProps) => {
  const { t } = useTranslation("properties");
  return (
    <BasePathProperty
      {...props}
      pathType="folder_path"
      dialogTitle={t("properties:selectFolderTitle")}
      onlyDirs={true}
    />
  );
};

export default memo(FolderPathProperty, isEqual);
