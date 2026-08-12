/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React from "react";
import { useTranslation } from "react-i18next";

import {
  ToolbarIconButton,
  Checkbox,
  Box,
  EditorMenu,
  EditorMenuItem,
  ListItemText
} from "../ui_primitives";
import CategoryIcon from "@mui/icons-material/Category";
import StraightenIcon from "@mui/icons-material/Straighten";
import useModelFiltersStore, {
  SizeBucket,
  TypeTag
} from "../../stores/ModelFiltersStore";

const barStyles = css({
  display: "flex",
  gap: 0,
  alignItems: "center",
  flexWrap: "nowrap"
});

const typeOptions: TypeTag[] = [
  "instruct",
  "chat",
  "base",
  "sft",
  "dpo",
  "reasoning",
  "code",
  "math"
];
const sizeOptions: SizeBucket[] = [
  "1-2B",
  "3-7B",
  "8-15B",
  "16-34B",
  "35-70B",
  "70B+"
];

interface ModelFiltersBarProps {
  quantList?: string[];
}

const ModelFiltersBar: React.FC<ModelFiltersBarProps> = () => {
  const selectedTypes = useModelFiltersStore((state) => state.selectedTypes);
  const sizeBucket = useModelFiltersStore((state) => state.sizeBucket);
  const toggleType = useModelFiltersStore((state) => state.toggleType);
  const setSizeBucket = useModelFiltersStore((state) => state.setSizeBucket);
  const { t } = useTranslation("models");

  // Local anchors for persistent menus
  const [typeAnchor, setTypeAnchor] = React.useState<null | HTMLElement>(null);
  const [sizeAnchor, setSizeAnchor] = React.useState<null | HTMLElement>(null);

  const openType = Boolean(typeAnchor);
  const openSize = Boolean(sizeAnchor);

  return (
    <Box css={barStyles} className="model-menu__filters-bar">
      {/* Type dropdown (multi) */}
      <ToolbarIconButton
        icon={<CategoryIcon fontSize="small" />}
        tooltip={selectedTypes.length ? t("filters.typeSelected", { types: selectedTypes.join(", ") }) : t("filters.filterByType")}
        onClick={(e) => setTypeAnchor(e.currentTarget)}
        size="small"
        active={selectedTypes.length > 0 || openType}
        nodrag={false}
      />
      <EditorMenu
        anchorEl={typeAnchor}
        open={openType}
        onClose={() => setTypeAnchor(null)}
        keepMounted
      >
        {typeOptions.map((t) => (
          <EditorMenuItem
            key={t}
            onClick={(e) => {
              e.stopPropagation();
              toggleType(t);
            }}
          >
            <Checkbox size="small" checked={selectedTypes.includes(t)} />
            <ListItemText primary={t} />
          </EditorMenuItem>
        ))}
      </EditorMenu>

      {/* Size dropdown (single) */}
      <ToolbarIconButton
        icon={<StraightenIcon fontSize="small" />}
        tooltip={sizeBucket ? t("filters.sizeSelected", { size: sizeBucket }) : t("filters.filterBySize")}
        onClick={(e) => setSizeAnchor(e.currentTarget)}
        size="small"
        active={!!sizeBucket || openSize}
        nodrag={false}
      />
      <EditorMenu
        anchorEl={sizeAnchor}
        open={openSize}
        onClose={() => setSizeAnchor(null)}
        keepMounted
      >
        <EditorMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setSizeBucket(null);
          }}
        >
          <ListItemText primary={t("filters.anySize")} />
        </EditorMenuItem>
        {sizeOptions.map((s) => (
          <EditorMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              setSizeBucket(s);
            }}
            selected={sizeBucket === s}
          >
            <ListItemText primary={s} />
          </EditorMenuItem>
        ))}
      </EditorMenu>

    </Box>
  );
};

export default ModelFiltersBar;
