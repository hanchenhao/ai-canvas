import type { MouseEvent } from "react";

import { useTranslation } from "react-i18next";
import {
  Text,
  Divider,
  ContextMenu,
  MenuItem
} from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StorageIcon from "@mui/icons-material/Storage";
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useSettingsStore } from "../../stores/SettingsStore";

const AssetGridContextMenu = () => {
  const { t } = useTranslation("canvas");
  const currentFolder = useAssetGridStore((state) => state.currentFolder);
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  const setCreateFolderDialogOpen = useAssetGridStore(
    (state) => state.setCreateFolderDialogOpen
  );
  const assetsOrder = useSettingsStore((state) => state.settings.assetsOrder);
  const setAssetsOrder = useSettingsStore((state) => state.setAssetsOrder);

  const withMenuClose =
    (action: () => void) =>
    (event?: MouseEvent<HTMLElement>) => {
      event?.stopPropagation();
      action();
      closeContextMenu();
    };

  const handleCreateFolder = withMenuClose(() => setCreateFolderDialogOpen(true));
  const handleSortByName = withMenuClose(() => setAssetsOrder("name"));
  const handleSortByDate = withMenuClose(() => setAssetsOrder("date"));
  const handleSortBySize = withMenuClose(() => setAssetsOrder("size"));

  if (!menuPosition) {return null;}

  return (
    <ContextMenu
      className="context-menu asset-grid-context-menu"
      open={menuPosition !== null}
      onContextMenu={(event) => event.preventDefault()}
      onClose={closeContextMenu}
      style={{ padding: "1em" }}
      position={menuPosition}
    >
      <MenuItem disabled>
        <Text className="title">
          Folder: {currentFolder?.name || "ASSETS"}
        </Text>
      </MenuItem>
      <Divider />
      <ContextMenuItem
        onClick={handleCreateFolder}
        label={t("canvas:assetGridContextMenu.createNewFolder")}
        IconComponent={<CreateNewFolderIcon />}
        tooltip={`Create a new folder in '${currentFolder?.name || "ASSETS"}' `}
      />
      <Divider />
      <ContextMenuItem
        onClick={handleSortByName}
        label={`Sort by name ${assetsOrder === "name" ? "✓" : ""}`}
        IconComponent={<SortByAlphaIcon />}
        tooltip={t("canvas:assetGridContextMenu.sortByName")}
      />
      <ContextMenuItem
        onClick={handleSortByDate}
        label={`Sort by date ${assetsOrder === "date" ? "✓" : ""}`}
        IconComponent={<AccessTimeIcon />}
        tooltip={t("canvas:assetGridContextMenu.sortByCreated")}
      />
      <ContextMenuItem
        onClick={handleSortBySize}
        label={`Sort by size ${assetsOrder === "size" ? "✓" : ""}`}
        IconComponent={<StorageIcon />}
        tooltip={t("canvas:assetGridContextMenu.sortBySize")}
      />
    </ContextMenu>
  );
};

export default AssetGridContextMenu;
