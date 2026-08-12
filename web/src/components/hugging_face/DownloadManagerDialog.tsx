/** @jsxImportSource @emotion/react */
import React, { memo, useMemo } from "react";
import { css } from "@emotion/react";
import { useTranslation, Trans } from "react-i18next";

import AnnouncementIcon from "@mui/icons-material/Announcement";
import {
  Dialog,
  CloseButton,
  Text,
  FlexColumn,
  Divider,
  EditorButton,
  Box,
  SPACING,
  getSpacingPx,
  DialogTitle,
  DialogContent,
  DialogActions
} from "../ui_primitives";
import { useModelDownloadStore } from "../../stores/ModelDownloadStore";
import { useShallow } from "zustand/react/shallow";
import { DownloadProgress } from "./DownloadProgress";
import { useTheme } from "@mui/material/styles";
import { type Theme } from "@mui/material/styles";

import isEqual from "../../utils/isEqual";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import DownloadingIcon from "@mui/icons-material/Downloading";
import {
  isFileExplorerAvailable,
  openHuggingfacePath,
  openOllamaPath
} from "../../utils/fileExplorer";
import { isLocalhost, isProduction } from "../../lib/env";
import { isElectron } from "../../utils/browser";

const styles = (theme: Theme) =>
  css({
    ".download-actions": {
      padding: `${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.xxl)} ${getSpacingPx(SPACING.xl)}`,
      justifyContent: "space-between",
      alignItems: "center",
      color: "inherit",
      borderTop: `1px solid ${theme.vars.palette.grey[800]}`
    },
    ".title-close": {
      position: "absolute",
      right: theme.spacing(1),
      top: theme.spacing(1)
    },
    ".downloads-list": {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2)
    },
    ".folders-row": {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing(1.5)
    }
  });

const DownloadManagerDialog: React.FC = () => {
  const { t } = useTranslation("huggingface");
  const { isDialogOpen, closeDialog, downloads } = useModelDownloadStore(
    useShallow((state) => ({
      isDialogOpen: state.isDialogOpen,
      closeDialog: state.closeDialog,
      downloads: state.downloads
    }))
  );

  const downloadNames = useMemo(() => Object.keys(downloads), [downloads]);
  const hasActiveDownloads = downloadNames.length > 0;

  const theme = useTheme();

  const infoMessage = hasActiveDownloads ? (
    t("dialog.activeInfo")
  ) : (
    <FlexColumn gap={1}>
      <span>
        <Trans
          i18nKey="huggingface:dialog.idleInfoUseRecommended"
          components={{ strong: <strong /> }}
        />
      </span>
      <span>
        <Trans
          i18nKey="huggingface:dialog.idleInfoModelManager"
          components={{ strong: <strong /> }}
        />
      </span>
    </FlexColumn>
  );

  return (
    <Dialog
      css={styles(theme)}
      className="download-dialog"
      open={isDialogOpen}
      onClose={closeDialog}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ color: "inherit", position: "relative" }}>
        {hasActiveDownloads
          ? t("dialog.titleProgress")
          : t("dialog.titleIdle")}
        <CloseButton
          onClick={closeDialog}
          className="title-close"
          nodrag={false}
        />
      </DialogTitle>
      <DialogContent className="download-dialog-content">
        <Box mt={1} className="downloads-list">
          {hasActiveDownloads ? (
            downloadNames.map((name) => (
              <DownloadProgress key={name} name={name} />
            ))
          ) : (
            <FlexColumn
              gap={1.5}
              align="center"
              sx={{
                padding: "2.5em 0"
              }}
            >
              <DownloadingIcon sx={{ opacity: 0.8 }} />
              <Text size="normal" weight={600}>
                {t("empty.noActiveDownloads")}
              </Text>
              <Text
                size="small"
                sx={{ opacity: 0.8, textAlign: "center" }}
              >
                {t("empty.noActiveDownloadsDesc")}
              </Text>
            </FlexColumn>
          )}
        </Box>
        {isLocalhost &&
          isFileExplorerAvailable() &&
          !isProduction &&
          isElectron && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box className="folders-row">
                <EditorButton
                  variant="outlined"
                  startIcon={<FolderOutlined />}
                  onClick={openHuggingfacePath}
                >
                  {t("button.openHuggingfaceFolder")}
                </EditorButton>
                <EditorButton
                  variant="outlined"
                  startIcon={<FolderOutlined />}
                  onClick={openOllamaPath}
                >
                  {t("button.openOllamaFolder")}
                </EditorButton>
              </Box>
            </>
          )}
      </DialogContent>
      <DialogActions className="download-actions">
        <Text
          component="div"
          sx={{
            padding: "0 1.5em .5em 1em",
            fontWeight: 400,
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "0.5em"
          }}
        >
          <AnnouncementIcon
            fontSize="small"
            sx={{ color: theme.vars.palette.warning.main }}
          />
          {infoMessage}
        </Text>
        <EditorButton onClick={closeDialog} variant="contained">
          {t("button.close")}
        </EditorButton>
      </DialogActions>
    </Dialog>
  );
};

export default memo(DownloadManagerDialog, isEqual);
