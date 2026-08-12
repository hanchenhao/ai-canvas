/** @jsxImportSource @emotion/react */
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactFlow } from "@xyflow/react";

import { EditorButton, Text, Divider, FlexRow, ContextMenu, BORDER_RADIUS, SPACING, getSpacingPx } from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
//store
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useFavoriteNodesStore } from "../../stores/FavoriteNodesStore";
//icons
import SouthEastIcon from "@mui/icons-material/SouthEast";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import AddCommentIcon from "@mui/icons-material/AddComment";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import StarIcon from "@mui/icons-material/Star";
import DataObjectIcon from "@mui/icons-material/DataObject";
import InputIcon from "@mui/icons-material/Input";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
//behaviours
import { useCopyPaste } from "../../hooks/handlers/useCopyPaste";
import { useClipboard } from "../../hooks/browser/useClipboard";
import { useFitView } from "../../hooks/useFitView";
import useMetadataStore from "../../stores/MetadataStore";
import { useNodes } from "../../contexts/NodeContext";
import {
  GROUP_NODE_METADATA,
  COMMENT_NODE_METADATA
} from "../../utils/nodeUtils";
import { getShortcutTooltip } from "../../config/shortcuts";
// From the constants module, not the node barrels: those re-export the node
// components, and this menu is reachable from the app shell.
import {
  WORKFLOW_NODE_TYPE,
  SUBGRAPH_NODE_TYPE
} from "../../constants/nodeTypes";
import { shallow } from "zustand/shallow";

const PaneContextMenu: React.FC = () => {
  const { t } = useTranslation("canvas");
  const { handlePaste } = useCopyPaste();
  const reactFlowInstance = useReactFlow();
  const { isClipboardValid } = useClipboard();
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  const fitView = useFitView();
  const favorites = useFavoriteNodesStore((state) => state.favorites);
  const getMetadata = useMetadataStore((state) => state.getMetadata);
  const [constantMenuAnchorEl, setConstantMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const [inputMenuAnchorEl, setInputMenuAnchorEl] =
    useState<HTMLElement | null>(null);

  const { createNode, addNode } = useNodes((state) => ({
    createNode: state.createNode,
    addNode: state.addNode
  }), shallow);

  const closeAllMenus = useCallback(() => {
    setConstantMenuAnchorEl(null);
    setInputMenuAnchorEl(null);
    closeContextMenu();
  }, [closeContextMenu]);


  const addComment = useCallback(
    (event: React.MouseEvent) => {
      const metadata = COMMENT_NODE_METADATA;
      const newNode = createNode(
        metadata,
        reactFlowInstance.screenToFlowPosition({
          x: menuPosition?.x || event.clientX,
          y: menuPosition?.y || event.clientY
        })
      );
      newNode.width = 150;
      newNode.height = 100;
      newNode.style = { width: 150, height: 100 };
      addNode(newNode);
    },
    [createNode, addNode, reactFlowInstance, menuPosition]
  );

  const addGroupNode = useCallback(
    (event: React.MouseEvent) => {
      const metadata = GROUP_NODE_METADATA;
      const position = reactFlowInstance.screenToFlowPosition({
        x: menuPosition?.x || event.clientX,
        y: menuPosition?.y || event.clientY
      });
      const newNode = createNode(metadata, position);
      addNode(newNode);
      closeAllMenus();
    },
    [createNode, addNode, reactFlowInstance, menuPosition, closeAllMenus]
  );

  const addFavoriteNode = useCallback(
    (nodeType: string) => (event: React.MouseEvent | undefined) => {
      if (!event) {
        return;
      }
      const metadata = getMetadata(nodeType);
      if (metadata) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: menuPosition?.x || event.clientX,
          y: menuPosition?.y || event.clientY
        });
        const newNode = createNode(metadata, position);
        addNode(newNode);
      }
      closeAllMenus();
    },
    [
      createNode,
      addNode,
      reactFlowInstance,
      menuPosition,
      closeAllMenus,
      getMetadata
    ]
  );

  const getNodeDisplayName = useCallback(
    (nodeType: string) => {
      const metadata = getMetadata(nodeType);
      if (metadata) {
        return (
          metadata.title || metadata.node_type.split(".").pop() || nodeType
        );
      }
      return nodeType.split(".").pop() || nodeType;
    },
    [getMetadata]
  );

  const constantNodeOptions = useMemo(
    () =>
      [
        { labelKey: "bool", nodeTypes: ["nodetool.constant.Bool"] },
        { labelKey: "dataFrame", nodeTypes: ["nodetool.constant.DataFrame"] },
        { labelKey: "date", nodeTypes: ["nodetool.constant.Date"] },
        { labelKey: "dateTime", nodeTypes: ["nodetool.constant.DateTime"] },
        { labelKey: "dict", nodeTypes: ["nodetool.constant.Dict"] },
        { labelKey: "document", nodeTypes: ["nodetool.constant.Document"] },
        { labelKey: "float", nodeTypes: ["nodetool.constant.Float"] },
        { labelKey: "image", nodeTypes: ["nodetool.constant.Image"] },
        { labelKey: "integer", nodeTypes: ["nodetool.constant.Integer"] },
        { labelKey: "json", nodeTypes: ["nodetool.constant.JSON"] },
        { labelKey: "list", nodeTypes: ["nodetool.constant.List"] },
        { labelKey: "audio", nodeTypes: ["nodetool.constant.Audio"] },
        {
          labelKey: "model3d",
          nodeTypes: [
            "nodetool.constant.Model3D",
            "nodetool.constant.Model3d",
            "nodetool.constant.Model_3D"
          ]
        },
        { labelKey: "select", nodeTypes: ["nodetool.constant.Select"] },
        { labelKey: "string", nodeTypes: ["nodetool.constant.String"] },
        { labelKey: "video", nodeTypes: ["nodetool.constant.Video"] }
      ]
        .map((option) => ({
          ...option,
          label: t(`contextMenu.pane.type.${option.labelKey}`)
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  const inputNodeOptions = useMemo(
    () =>
      [
        { labelKey: "string", nodeTypes: ["nodetool.input.StringInput"] },
        { labelKey: "integer", nodeTypes: ["nodetool.input.IntegerInput"] },
        { labelKey: "float", nodeTypes: ["nodetool.input.FloatInput"] },
        { labelKey: "boolean", nodeTypes: ["nodetool.input.BooleanInput"] },
        { labelKey: "image", nodeTypes: ["nodetool.input.ImageInput"] },
        { labelKey: "audio", nodeTypes: ["nodetool.input.AudioInput"] },
        { labelKey: "video", nodeTypes: ["nodetool.input.VideoInput"] },
        { labelKey: "document", nodeTypes: ["nodetool.input.DocumentInput"] },
        { labelKey: "dataFrame", nodeTypes: ["nodetool.input.DataFrameInput"] },
        { labelKey: "select", nodeTypes: ["nodetool.input.SelectInput"] }
      ]
        .map((option) => ({
          ...option,
          label: t(`contextMenu.pane.type.${option.labelKey}`)
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  const resolveNodeType = useCallback(
    (nodeTypes: string[]) =>
      nodeTypes.find((nodeType) => Boolean(getMetadata(nodeType))) || null,
    [getMetadata]
  );

  const handleCreateNode = useCallback(
    (nodeType: string | null) => (event?: React.MouseEvent) => {
      if (!event || !nodeType) {
        return;
      }
      const metadata = getMetadata(nodeType);
      if (!metadata) {
        console.error(`Metadata not found for node type: ${nodeType}`);
        return;
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: menuPosition?.x || event.clientX,
        y: menuPosition?.y || event.clientY
      });
      const newNode = createNode(metadata, position);
      addNode(newNode);
      closeAllMenus();
    },
    [
      getMetadata,
      createNode,
      addNode,
      reactFlowInstance,
      menuPosition,
      closeAllMenus
    ]
  );

  const handleOpenConstantMenu = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (!event) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setConstantMenuAnchorEl(event.currentTarget);
      setInputMenuAnchorEl(null);
    },
    []
  );

  const handleOpenInputMenu = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (!event) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setInputMenuAnchorEl(event.currentTarget);
      setConstantMenuAnchorEl(null);
    },
    []
  );

  const handlePasteAndClose = useCallback(() => {
    handlePaste();
    closeAllMenus();
  }, [handlePaste, closeAllMenus]);

  const handleFitViewAndClose = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (event) {
        event.preventDefault();
        fitView({ padding: 0.5 });
      }
      closeAllMenus();
    },
    [fitView, closeAllMenus]
  );

  const handleAddCommentAndClose = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (event) {
        event.preventDefault();
        addComment(event);
      }
      closeAllMenus();
    },
    [addComment, closeAllMenus]
  );

  const handleAddGroupAndClose = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (event) {
        event.preventDefault();
        addGroupNode(event);
      }
      closeAllMenus();
    },
    [addGroupNode, closeAllMenus]
  );

  if (!menuPosition) {
    return null;
  }

  return (
    <>
      <ContextMenu
        className="context-menu pane-context-menu"
        open={menuPosition !== null}
        onClose={closeAllMenus}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        MenuListProps={{
          onClick: (event) => event.stopPropagation()
        }}
        position={menuPosition}
        slotProps={{
          paper: {
            className: "context-menu pane-context-menu"
          }
        }}
        paperSx={{ borderRadius: BORDER_RADIUS.lg, width: "240px" }}
      >
        <ContextMenuItem
          onClick={handlePasteAndClose}
          label={t("contextMenu.pane.paste")}
          addButtonClassName={`action ${!isClipboardValid ? "disabled" : ""}`}
          IconComponent={<SouthEastIcon />}
          tooltip={
            !isClipboardValid ? (
              <span>
                {getShortcutTooltip("paste")}
                <br />
                <span className="attention">
                  {t("contextMenu.pane.pasteInvalidData")} <br />
                  {t("contextMenu.pane.pasteInvalidClipboard")}
                </span>
              </span>
            ) : (
              getShortcutTooltip("paste")
            )
          }
        />
        <ContextMenuItem
          onClick={handleFitViewAndClose}
          label={t("contextMenu.pane.fitScreen")}
          IconComponent={<FitScreenIcon />}
          tooltip={getShortcutTooltip("fitView")}
        />
        {favorites.length > 0 && [
          <Divider key="favorites-divider" />,
          <FlexRow
            key="favorites-header"
            align="center"
            sx={{
              gap: "0.5em",
              padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.xl)}`,
              color: "text.secondary",
              fontSize: "var(--fontSizeSmaller)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
          >
            <StarIcon
              sx={{ fontSize: "var(--fontSizeNormal)", color: "warning.main" }}
            />
            <Text>{t("contextMenu.pane.favorites")}</Text>
          </FlexRow>,
          ...favorites.map((favorite) => {
            const displayName = getNodeDisplayName(favorite.nodeType);
            return (
              <ContextMenuItem
                key={favorite.nodeType}
                onClick={addFavoriteNode(favorite.nodeType)}
                label={displayName}
                IconComponent={
                  <StarIcon
                    sx={{ fontSize: "var(--fontSizeNormal)", color: "warning.main", opacity: 0.7 }}
                  />
                }
                tooltip={t("contextMenu.pane.addFavoriteNode", { name: displayName })}
              />
            );
          })
        ]}
        <Divider />
        <ContextMenuItem
          onClick={handleOpenConstantMenu}
          controlElement={
            <EditorButton
              className="action"
              endIcon={<KeyboardArrowRightIcon />}
              density="normal"
            >
              <DataObjectIcon />
              <span className="label">{t("contextMenu.pane.addConstantNode")}</span>
            </EditorButton>
          }
        />
        <ContextMenuItem
          onClick={handleOpenInputMenu}
          controlElement={
            <EditorButton
              className="action"
              endIcon={<KeyboardArrowRightIcon />}
              density="normal"
            >
              <InputIcon />
              <span className="label">{t("contextMenu.pane.addInputNode")}</span>
            </EditorButton>
          }
        />
        <Divider />
        <ContextMenuItem
          onClick={handleAddCommentAndClose}
          label={t("contextMenu.pane.addComment")}
          IconComponent={<AddCommentIcon />}
          tooltip={t("contextMenu.pane.addCommentTooltip")}
        />
        <ContextMenuItem
          onClick={handleAddGroupAndClose}
          label={t("contextMenu.pane.addGroup")}
          IconComponent={<GroupWorkIcon />}
          tooltip={t("contextMenu.pane.addGroupTooltip")}
        />
        <ContextMenuItem
          onClick={handleCreateNode(WORKFLOW_NODE_TYPE)}
          label={t("contextMenu.pane.addWorkflow")}
          tooltip={t("contextMenu.pane.addWorkflowTooltip")}
        />
        <ContextMenuItem
          onClick={handleCreateNode(SUBGRAPH_NODE_TYPE)}
          label={t("contextMenu.pane.addSubgraph")}
          tooltip={t("contextMenu.pane.addSubgraphTooltip")}
        />
      </ContextMenu>
      <ContextMenu
        className="context-menu pane-submenu"
        anchorEl={constantMenuAnchorEl}
        open={Boolean(constantMenuAnchorEl)}
        onClose={() => setConstantMenuAnchorEl(null)}
        slotProps={{
          paper: {
            className: "context-menu pane-submenu"
          }
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        {constantNodeOptions.map((option) => {
          const nodeType = resolveNodeType(option.nodeTypes);
          if (!nodeType) {
            return null;
          }
          return (
            <ContextMenuItem
              key={nodeType}
              onClick={handleCreateNode(nodeType)}
              label={option.label}
            />
          );
        })}
      </ContextMenu>
      <ContextMenu
        className="context-menu pane-submenu"
        anchorEl={inputMenuAnchorEl}
        open={Boolean(inputMenuAnchorEl)}
        onClose={() => setInputMenuAnchorEl(null)}
        slotProps={{
          paper: {
            className: "context-menu pane-submenu"
          }
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        {inputNodeOptions.map((option) => {
          const nodeType = resolveNodeType(option.nodeTypes);
          if (!nodeType) {
            return null;
          }
          return (
            <ContextMenuItem
              key={nodeType}
              onClick={handleCreateNode(nodeType)}
              label={option.label}
            />
          );
        })}
      </ContextMenu>
    </>
  );
};

export default React.memo(PaneContextMenu);
