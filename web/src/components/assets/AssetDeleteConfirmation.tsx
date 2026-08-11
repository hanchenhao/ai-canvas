/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

import React, { useState, useCallback, useEffect } from "react";
import InsertDriveFile from "@mui/icons-material/InsertDriveFile";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useAssetDeletion } from "../../serverState/useAssetDeletion";
import { useAssets } from "../../serverState/useAssets";
import AssetTree from "./AssetTree";
import { Asset } from "../../stores/ApiTypes";
import { useAuth } from "../../stores/useAuth";
import { useNotificationStore } from "../../stores/NotificationStore";
import {
  Dialog,
  DialogActionButtons,
  LoadingSpinner,
  ListGroup,
  ListItemRow,
  Text
} from "../ui_primitives";

const styles = css({
  ".asset-delete-confirmation-content": {
    position: "relative",
    minWidth: "600px",
    minHeight: "200px",
    maxHeight: "60vh"
  }
});

interface AssetDeleteConfirmationProps {
  assets: string[];
}

const AssetDeleteConfirmation: React.FC<AssetDeleteConfirmationProps> = ({
  assets
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [folderCount, setFolderCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [fileAssets, setFileAssets] = useState<Asset[]>([]);
  const [isAssetTreeLoading, setIsAssetTreeLoading] = useState(true);
  const [isPreparingDelete, setIsPreparingDelete] = useState(true);
  const [showRootFolderWarning, setShowRootFolderWarning] = useState(false);
  const dialogOpen = useAssetGridStore((state) => state.deleteDialogOpen);
  const setDialogOpen = useAssetGridStore((state) => state.setDeleteDialogOpen);
  const { mutation } = useAssetDeletion();
  const { refetchAssetsAndFolders } = useAssets();
  const selectedAssets = useAssetGridStore((state) => state.selectedAssets);
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { t } = useTranslation(["common"]);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  useEffect(() => {
    if (!dialogOpen) {return;} // Only process when dialog is actually open

    const countAssetTypes = () => {
      setIsPreparingDelete(true);
      let folders = 0;
      let files = 0;
      const fileAssetsTemp: Asset[] = [];
      setTotalAssets(0);
      let hasRootFolder = false;

      for (const asset of selectedAssets) {
        if (asset.content_type === "folder") {
          folders++;
          if (asset.id === "1" || (user && asset.id === user.id)) {
            hasRootFolder = true;
          }
        } else {
          files++;
          fileAssetsTemp.push(asset);
        }
      }

      setFolderCount(folders);
      setFileCount(files);
      setFileAssets(fileAssetsTemp);
      if (folders === 0) {
        setIsAssetTreeLoading(false);
      }
      if (files > 0 && folders === 0) {
        setTotalAssets(files);
      }
      setIsPreparingDelete(false);
      setShowRootFolderWarning(hasRootFolder);
    };

    countAssetTypes();
  }, [dialogOpen, selectedAssets, user]);

  const handleClose = useCallback(() => {
    // Blur focused element to prevent aria-hidden focus warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setDialogOpen(false);
  }, [setDialogOpen]);

  const handleTotalAssetsCalculated = useCallback((assetCount: number) => {
    setTotalAssets(assetCount);
  }, []);

  const executeDeletion = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await mutation.mutateAsync(assets);
      if (response === undefined) {
        console.error("Received undefined response from server");
      } else if (typeof response === "object" && response !== null) {
        console.info("Deleted asset IDs:", (response as { deleted_asset_ids?: string[] }).deleted_asset_ids);
      }
      // Blur focused element to prevent aria-hidden focus warning
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setDialogOpen(false);
      // Invalidate all asset queries (including workflow-specific ones)
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await refetchAssetsAndFolders();
      const parts = [
        folderCount > 0
          ? `${folderCount} folder${folderCount !== 1 ? "s" : ""}`
          : null,
        fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? "s" : ""}` : null
      ].filter((part): part is string => part !== null);
      addNotification({
        type: "success",
        alert: true,
        content: t("common:dialog.deleteSuccess", { items: parts.join(" and ") || "selection" })
      });
    } catch (error) {
      addNotification({
        type: "error",
        alert: true,
        content: t("common:dialog.deleteFailed", {
          error: error instanceof Error ? error.message : "unknown error"
        })
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    mutation,
    assets,
    setDialogOpen,
    refetchAssetsAndFolders,
    queryClient,
    addNotification,
    folderCount,
    fileCount,
    t
  ]);

  const getDialogTitle = () => {
    if (isAssetTreeLoading && folderCount > 0) {
      return t("common:dialog.deleteAssetPreparing");
    } else if (showRootFolderWarning) {
      return t("common:dialog.deleteAssetRootWarning");
    } else if (folderCount === 1 && fileCount === 0) {
      return t("common:dialog.deleteFolderOne", {
        count: totalAssets - 1
      });
    } else if (folderCount > 0) {
      return t("common:dialog.deleteFoldersFiles", {
        folderCount,
        fileCount,
        total: totalAssets
      });
    } else {
      return t("common:dialog.deleteFiles", {
        count: fileCount
      });
    }
  };

  return (
    <Dialog
      css={styles}
      className="asset-delete-confirmation"
      open={dialogOpen}
      onClose={handleClose}
      disableRestoreFocus
      title={getDialogTitle()}
    >
      <div className="asset-delete-confirmation-content">
        <Text
          color="secondary"
          style={{ marginBottom: "1em" }}
        >
          {t("common:dialog.deleteAssetHint")}
        </Text>
        {isPreparingDelete ? (
          <LoadingSpinner size="small" />
        ) : (
          <>
            {!showRootFolderWarning && (
              <>
                {folderCount > 0 ? (
                  assets.map((assetId) => (
                    <AssetTree
                      key={assetId}
                      folderId={assetId}
                      onTotalAssetsCalculated={handleTotalAssetsCalculated}
                      onLoading={setIsAssetTreeLoading}
                    />
                  ))
                ) : (
                  <ListGroup compact flush>
                    {fileAssets.map((file) => (
                      <ListItemRow
                        key={file.id}
                        primary={file.name}
                        icon={<InsertDriveFile />}
                      />
                    ))}
                  </ListGroup>
                )}
              </>
            )}
          </>
        )}
      </div>
      <DialogActionButtons
        onConfirm={executeDeletion}
        onCancel={handleClose}
        confirmText={t("common:button.delete")}
        cancelText={t("common:button.cancel")}
        isLoading={isLoading}
        confirmDisabled={isAssetTreeLoading || showRootFolderWarning}
        destructive={true}
      />
    </Dialog>
  );
};

export default AssetDeleteConfirmation;
