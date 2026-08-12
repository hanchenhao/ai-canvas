import React, { useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import isEqual from "../../utils/isEqual";
import PropertyLabel from "../node/PropertyLabel";
import { PropertyProps } from "../node/PropertyInput";
import Select from "../inputs/Select";
import { trpcClient } from "../../trpc/client";

const fetchFonts = async (): Promise<string[]> => {
  const { fonts } = await trpcClient.fonts.list.query();
  return fonts;
};

interface FontValue {
  type: "font";
  name: string;
}

const FontProperty: React.FC<PropertyProps<FontValue | null>> = ({
  property,
  propertyIndex,
  value,
  onChange,
  tabIndex
}) => {
  const id = `font-${property.name}-${propertyIndex}`;
  const { t } = useTranslation("properties");

  const {
    data: fonts,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["fonts"],
    queryFn: fetchFonts
  });

  const handleChange = useCallback(
    (fontName: string) => {
      onChange({ type: "font", name: fontName });
    },
    [onChange]
  );

  const currentValue =
    value && typeof value === "object" && value.type === "font"
      ? value.name
      : "";

  const options = useMemo(() => {
    if (!fonts || isLoading || isError)
      {return [{ value: "", label: t("font.selectFont") }];}

    return [
      { value: "", label: t("font.selectFont") },
      ...fonts
        .map((fontName) => ({
          value: fontName || "",
          label: fontName || t("font.unnamedFont")
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];
  }, [fonts, isLoading, isError, t]);

  return (
    <div className="font-property">
      <PropertyLabel
        name={property.name}
        description={property.description}
        id={id}
      />
      <div className="select-wrapper">
        {isLoading ? (
          <div className="loading-state">{t("font.loading")}</div>
        ) : isError ? (
          <div className="error-state">{t("font.loadError")}</div>
        ) : (
          <Select
            value={currentValue}
            onChange={handleChange}
            options={options}
            tabIndex={tabIndex}
            placeholder={t("font.selectFont")}
          />
        )}
      </div>
    </div>
  );
};

export default memo(FontProperty, isEqual);
