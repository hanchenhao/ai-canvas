import { PropertyProps } from "../node/PropertyInput";
import ListTable, { ListDataType } from "../node/DataTable/ListTable";
import { memo, useCallback, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Select from "../inputs/Select";
import PropertyLabel from "../node/PropertyLabel";
import { SPACING, getSpacingPx } from "../ui_primitives";
import isEqual from "../../utils/isEqual";

const detectTypeFromList = (list: unknown[]) => {
  if (list.length === 0) {
    return "string";
  }
  const first = list[0];
  if (typeof first === "number") {
    if (Number.isInteger(first)) {
      return "int";
    }
    return "float";
  } else if (typeof first === "string") {
    return "string";
  } else if (typeof first === "object") {
    return "string";
  }
  return "string";
};

const ListProperty = (props: PropertyProps) => {
  const { t } = useTranslation("properties");
  const id = `list-${props.property.name}-${props.propertyIndex}`;
  const dataTypes = useMemo(() => ["int", "string", "datetime", "float"], []);

  const value = props.value || [];
  const [dataType, setDataType] = useState<ListDataType>(
    detectTypeFromList(value)
  );

  const handleDataTypeChange = useCallback(
    (newValue: string) => {
      setDataType(newValue as ListDataType);
    },
    []
  );

  const options = useMemo(
    () =>
      dataTypes.map((type) => ({
        label: type,
        value: type
      })),
    [dataTypes]
  );

  const containerStyle = useMemo(() => ({ marginBottom: getSpacingPx(SPACING.md) }), []);

 if (props.nodeType === "nodetool.constant.List") {
   return (
      <>
        <div style={containerStyle}>
          <PropertyLabel name={t("properties:dataType")} id={id} />
          <Select
            value={dataType}
            onChange={handleDataTypeChange}
            options={options}
            label={t("properties:dataType")}
            placeholder={t("properties:selectTypePlaceholder")}
          />
        </div>
        <ListTable
          data={value}
          onDataChange={props.onChange}
          editable={true}
          data_type={dataType}
        />
      </>
    );
  } else {
    return (
      <>
        <PropertyLabel
          name={props.property.name}
          description={props.property.description}
          id={id}
        />
      </>
    );
  }
};

export default memo(ListProperty, isEqual);
