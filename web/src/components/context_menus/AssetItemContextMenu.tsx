import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

import {
  Text,
  Divider,
  ContextMenu,
  MenuItem
} from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CompareIcon from "@mui/icons-material/Compare";
import TabIcon from "@mui/icons-material/Tab";
import MovieEditIcon from "@mui/icons-material/Movie";
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useAssetStore } from "../../stores/AssetStore";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { useWorkspaceTabsStore } from "../../stores/WorkspaceTabsStore";
import { assetTabType } from "../workspace/assetTabType";
import { useEditVideoAsset } from "../../hooks/useEditVideoAsset";
import { isElectron } from "../../utils/browser";
import { copyAssetToClipboard, isClipboardSupported } from "../../utils/clipboardUtils";
import AssetInfoPanel from "./AssetInfoPanel";
import { useShallow } from "zustand/react/shallow";

const AssetItemContextMenu = () => {
  const { t } = useTranslation("canvas");
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore((state) => state.closeContextMenu);

  const {
    setRenameDialogOpen,
    setMoveToFolderDialogOpen,
    setDeleteDialogOpen,
    selectedAssetIds,
    selectedAssets,
    openCompareView,
    setCreateFolderDialogOpen
  } = useAssetGridStore(
    useShallow((state) => ({
      setRenameDialogOpen: state.setRenameDialogOpen,
      setMoveToFolderDialogOpen: state.setMoveToFolderDialogOpen,
      setDeleteDialogOpen: state.setDeleteDialogOpen,
      selectedAssetIds: state.selectedAssetIds,
      selectedAssets: state.selectedAssets,
      openCompareView: state.openCompareView,
      setCreateFolderDialogOpen: state.setCreateFolderDialogOpen
    }))
  );

  const download = useAssetStore((state) => state.download);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const navigate = useNavigate();
  const editVideoAsset = useEditVideoAsset();

  const isFolder = selectedAssets.some(
    (asset) => asset.content_type === "folder"
  );

  // A single video opens in the timeline editor: its source timeline when one
  // exists, otherwise a fresh timeline wrapping the video.
  const singleVideo =
    selectedAssets.length === 1 &&
    selectedAssets[0]?.content_type?.startsWith("video/")
      ? selectedAssets[0]
      : null;

  const isSingleClipboardSupported =
    selectedAssets.length === 1 &&
    selectedAssets[0]?.content_type &&
    isClipboardSupported(selectedAssets[0].content_type);

  const isTwoImages =
    selectedAssets.length === 2 &&
    selectedAssets.every((asset) => asset.content_type?.startsWith("image/"));

  // Resolve the workspace tab type for a single selected asset ("Open as Tab").
  // Null when nothing is openable as a tab (multi-select, folder, or a content
  // type with no document surface, e.g. video).
  const openableTabType =
    selectedAssets.length === 1 && selectedAssets[0]
      ? assetTabType(selectedAssets[0])
      : null;

  const hasSelectedAssets = selectedAssets.length > 0 && !isFolder;

  const handleCopyToClipboard = useCallback(async () => {
    const asset = selectedAssets[0];
    if (!isSingleClipboardSupported || !asset?.get_url || !asset?.content_type) {
      return;
    }

    try {
      await copyAssetToClipboard(asset.content_type, asset.get_url, asset.name || undefined);

      const contentTypeLabel = asset.content_type.startsWith("image/")
        ? "Image"
        : asset.content_type.startsWith("video/")
        ? "Video info"
        : asset.content_type.startsWith("audio/")
        ? "Audio info"
        : "Content";

      addNotification({
        type: "success",
        content: `${contentTypeLabel} copied to clipboard`,
        alert: true
      });
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
      addNotification({
        type: "error",
        content: "Failed to copy to clipboard",
        alert: true
      });
    }
  }, [isSingleClipboardSupported, selectedAssets, addNotification]);

  const handleDownloadAssets = async (selectedAssetIds: string[]) => {
    addNotification({
      type: "info",
      content: "Download started. This may take a while.",
      alert: true
    });
    try {
      await download(selectedAssetIds);
      addNotification({
        type: "success",
        content: "Download finished successfully.",
        alert: true
      });
    } catch (error) {
      console.error("Download failed", error);
      addNotification({
        type: "error",
        content: "Download failed. Please check the console for more details.",
        alert: true
      });
    }
  };

  const withMenuClose =
    (action: () => Promise<void> | void) =>
    async (event?: MouseEvent<HTMLElement>) => {
      event?.stopPropagation();
      await action();
      closeContextMenu();
    };

  const openRenameDialog = withMenuClose(() => setRenameDialogOpen(true));
  const openMoveDialog = withMenuClose(() => setMoveToFolderDialogOpen(true));
  const openCreateFolderDialog = withMenuClose(() =>
    setCreateFolderDialogOpen(true)
  );
  const openDeleteDialog = withMenuClose(() => setDeleteDialogOpen(true));
  const downloadSelected = withMenuClose(async () => {
    await handleDownloadAssets(selectedAssetIds);
  });
  const copyToClipboard = withMenuClose(async () => {
    await handleCopyToClipboard();
  });
  const handleCompareImages = withMenuClose(() => {
    if (isTwoImages) {
      openCompareView(selectedAssets[0], selectedAssets[1]);
    }
  });

  const handleOpenAsTab = withMenuClose(() => {
    const asset = selectedAssets[0];
    if (openableTabType && asset) {
      openTab({
        type: openableTabType,
        ref: asset.id,
        mode: "view",
        title: asset.name || "Untitled"
      });
      navigate("/workspace");
    }
  });

  const handleEditVideo = withMenuClose(() => {
    if (singleVideo) {
      void editVideoAsset(singleVideo);
    }
  });

  const singleAsset =
    selectedAssets.length === 1 ? selectedAssets[0] : null;

  if (!menuPosition) {return null;}
  return (
    <>
      <ContextMenu
        className="context-menu asset-item-context-menu"
        open={menuPosition !== null}
        onClose={closeContextMenu}
        onContextMenu={(event) => event.preventDefault()}
        style={{ padding: "1em" }}
        position={menuPosition}
        paperSx={singleAsset ? { display: "flex", overflow: "visible" } : undefined}
      >
        <MenuItem disabled>
          <Text className="title">
            {isFolder
              ? t("canvas:assetItemContextMenu.folder")
              : t("canvas:assetItemContextMenu.itemCount", {
                  count: selectedAssetIds.length
                })}
          </Text>
        </MenuItem>
        <Divider />
        <ContextMenuItem
          onClick={openRenameDialog}
          label={t("canvas:contextMenu.rename")}
          IconComponent={<DriveFileRenameOutlineIcon />}
          tooltip={t("canvas:assetItemContextMenu.renameSelected")}
        />
        {openableTabType && (
          <ContextMenuItem
            onClick={handleOpenAsTab}
            label={t("canvas:assetItemContextMenu.openAsTab")}
            IconComponent={<TabIcon />}
            tooltip={t("canvas:assetItemContextMenu.openAsTabTooltip")}
          />
        )}
        {singleVideo && (
          <ContextMenuItem
            onClick={handleEditVideo}
            label={singleVideo.timeline_id ? t("canvas:assetItemContextMenu.editTimeline") : t("canvas:assetItemContextMenu.createTimelineFromVideo")}
            IconComponent={<MovieEditIcon />}
            tooltip={
              singleVideo.timeline_id
                ? t("canvas:assetItemContextMenu.editTimelineTooltip")
                : t("canvas:assetItemContextMenu.createTimelineTooltip")
            }
          />
        )}
        <Divider />
        <ContextMenuItem
          onClick={openMoveDialog}
          label={t("canvas:assetItemContextMenu.moveToFolder")}
          IconComponent={<DriveFileMoveIcon />}
          tooltip={t("canvas:assetItemContextMenu.moveToFolderTooltip")}
        />
        <ContextMenuItem
          onClick={openCreateFolderDialog}
          label={hasSelectedAssets ? t("canvas:assetItemContextMenu.moveToNewFolder") : t("canvas:assetItemContextMenu.createNewFolder")}
          IconComponent={<CreateNewFolderIcon />}
          tooltip={
            hasSelectedAssets
              ? t("canvas:assetItemContextMenu.moveToNewFolderTooltip")
              : t("canvas:assetItemContextMenu.createNewFolderTooltip")
          }
        />
        <Divider />
        <ContextMenuItem
          onClick={downloadSelected}
          label={t("canvas:assetItemContextMenu.downloadSelected")}
          IconComponent={<FileDownloadIcon />}
          tooltip={t("canvas:assetItemContextMenu.downloadSelectedTooltip")}
        />
        {isElectron && isSingleClipboardSupported && (
          <ContextMenuItem
            onClick={copyToClipboard}
            label={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? t("canvas:assetItemContextMenu.copyImage")
                : selectedAssets[0]?.content_type?.startsWith("video/")
                ? t("canvas:assetItemContextMenu.copyVideoInfo")
                : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? t("canvas:assetItemContextMenu.copyAudioInfo")
                : t("canvas:assetItemContextMenu.copyContent")
            }
            IconComponent={<ContentCopyIcon />}
            tooltip={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? t("canvas:assetItemContextMenu.copyImageTooltip")
                : selectedAssets[0]?.content_type?.startsWith("video/")
                ? t("canvas:assetItemContextMenu.copyVideoInfoTooltip")
                : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? t("canvas:assetItemContextMenu.copyAudioInfoTooltip")
                : t("canvas:assetItemContextMenu.copyContentTooltip")
            }
          />
        )}
        {isTwoImages && (
          <ContextMenuItem
            onClick={handleCompareImages}
            label={t("canvas:assetItemContextMenu.compareImages")}
            IconComponent={<CompareIcon />}
            tooltip={t("canvas:assetItemContextMenu.compareImagesTooltip")}
          />
        )}
        <Divider />
        <div style={{ height: ".5em" }} />
        <ContextMenuItem
          onClick={openDeleteDialog}
          label={t("canvas:contextMenu.delete")}
          addButtonClassName="delete"
          IconComponent={<RemoveCircleIcon />}
          tooltip={t("canvas:assetItemContextMenu.deleteSelected")}
        />
        {singleAsset && <AssetInfoPanel asset={singleAsset} />}
      </ContextMenu>
    </>
  );
};

export default memo(AssetItemContextMenu);
