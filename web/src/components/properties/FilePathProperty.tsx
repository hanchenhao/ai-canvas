/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";

const FilePathProperty = (props: PropertyProps) => {
  const { t } = useTranslation("properties");
  return (
    <BasePathProperty
      {...props}
      pathType="file_path"
      dialogTitle={t("properties:selectFile")}
      onlyDirs={false}
    />
  );
};

export default memo(FilePathProperty, isEqual);
