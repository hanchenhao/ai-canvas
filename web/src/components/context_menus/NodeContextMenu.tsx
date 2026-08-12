import React, { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Divider, ContextMenu, BORDER_RADIUS } from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import { useNodeContextMenu } from "../../hooks/nodes/useNodeContextMenu";
import GroupRemoveIcon from "@mui/icons-material/GroupRemove";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BlockIcon from "@mui/icons-material/Block";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DataArrayIcon from "@mui/icons-material/DataArray";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import QueueIcon from "@mui/icons-material/Queue";
import SouthIcon from "@mui/icons-material/South";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Node } from "@xyflow/react";
import { NodeData } from "../../stores/NodeData";
import { isDevelopment } from "../../lib/env";
import { useRemoveFromGroup } from "../../hooks/nodes/useRemoveFromGroup";
import { useGroupIntoSubgraph } from "../../hooks/nodes/useGroupIntoSubgraph";
import { useNodes } from "../../contexts/NodeContext";

const NodeContextMenu: React.FC = () => {
  const { t } = useTranslation("canvas");
  const {
    menuPosition,
    closeContextMenu,
    node,
    handlers,
    conditions
  } = useNodeContextMenu();
  const removeFromGroup = useRemoveFromGroup();
  const handleRemoveFromGroup = useCallback(() => {
    removeFromGroup([node as Node<NodeData>]);
  }, [removeFromGroup, node]);

  const groupIntoSubgraph = useGroupIntoSubgraph();
  const getSelectedNodes = useNodes((s) => s.getSelectedNodes);
  const handleGroupIntoSubgraph = useCallback(() => {
    const selected = getSelectedNodes();
    const ids =
      selected.length > 0
        ? selected.map((n) => n.id)
        : node
        ? [node.id]
        : [];
    if (ids.length === 0) return;
    groupIntoSubgraph(ids);
    closeContextMenu();
  }, [groupIntoSubgraph, getSelectedNodes, node, closeContextMenu]);

  const menuItems = [
    conditions.isInGroup && (
      <ContextMenuItem
        key="remove-from-group"
        onClick={handleRemoveFromGroup}
        label={t("contextMenu.removeFromGroup")}
        IconComponent={<GroupRemoveIcon />}
        tooltip={t("contextMenu.node.removeFromGroupTooltip")}
      />
    ),
    <ContextMenuItem
      key="copy"
      onClick={handlers.handleCopy}
      label={t("contextMenu.copy")}
      IconComponent={<ContentCopyIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("contextMenu.copy")}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>C</kbd> / <kbd>⌘</kbd>+<kbd>C</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="cut"
      onClick={handlers.handleCut}
      label={t("contextMenu.cut")}
      IconComponent={<ContentCutIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("contextMenu.cut")}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>X</kbd> / <kbd>⌘</kbd>+<kbd>X</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="duplicate"
      onClick={handlers.handleDuplicate}
      label={t("contextMenu.duplicate")}
      IconComponent={<QueueIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("contextMenu.duplicate")}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="duplicate-vertical"
      onClick={handlers.handleDuplicateVertical}
      label={t("contextMenu.node.duplicateVertical")}
      IconComponent={<SouthIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("contextMenu.node.duplicateVertical")}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="run-from-here"
      onClick={handlers.handleRunFromHere}
      label={conditions.isWorkflowRunning ? t("contextMenu.node.running") : t("contextMenu.node.runNode")}
      IconComponent={<PlayArrowIcon />}
      tooltip={t("contextMenu.node.runNodeTooltip")}
      addButtonClassName={conditions.isWorkflowRunning ? "disabled" : ""}
    />,
    <ContextMenuItem
      key="toggle-bypass"
      onClick={handlers.handleToggleBypass}
      label={conditions.isBypassed ? t("contextMenu.node.enableNode") : t("contextMenu.node.bypassNode")}
      IconComponent={conditions.isBypassed ? <PowerSettingsNewIcon /> : <BlockIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isBypassed ? t("contextMenu.node.enableNode") : t("contextMenu.node.bypassNode")}
          </div>
          <div className="tooltip-key">
            <kbd>B</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="toggle-collapsed"
      onClick={handlers.handleToggleCollapsed}
      label={conditions.isCollapsed ? t("contextMenu.node.expandNode") : t("contextMenu.node.collapseNode")}
      IconComponent={
        conditions.isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />
      }
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isCollapsed ? t("contextMenu.node.expandNode") : t("contextMenu.node.collapseNode")}
          </div>
          <div className="tooltip-key">
            <kbd>C</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="toggle-comment"
      onClick={handlers.handleToggleComment}
      label={conditions.hasCommentTitle ? t("contextMenu.node.removeComment") : t("contextMenu.node.addComment")}
      IconComponent={<EditIcon />}
      tooltip={
        conditions.hasCommentTitle
          ? t("contextMenu.node.removeCommentTooltip")
          : t("contextMenu.node.addCommentTooltip")
      }
    />,
    <ContextMenuItem
      key="group-into-subgraph"
      onClick={handleGroupIntoSubgraph}
      label={t("contextMenu.groupIntoSubgraph")}
      IconComponent={<AccountTreeIcon />}
      tooltip={t("contextMenu.groupIntoSubgraphTooltip")}
    />,
    conditions.canConvertToInput && (
      <ContextMenuItem
        key="convert-to-input"
        onClick={handlers.handleConvertToInput}
        label={t("contextMenu.node.convertToInput")}
        IconComponent={<SwapHorizIcon />}
        tooltip={t("contextMenu.node.convertToInputTooltip")}
      />
    ),
    conditions.canConvertToConstant && (
      <ContextMenuItem
        key="convert-to-constant"
        onClick={handlers.handleConvertToConstant}
        label={t("contextMenu.node.convertToConstant")}
        IconComponent={<SwapHorizIcon />}
        tooltip={t("contextMenu.node.convertToConstantTooltip")}
      />
    ),
    <ContextMenuItem
      key="show-templates"
      onClick={handlers.handleFindTemplates}
      label={t("contextMenu.node.showTemplates")}
      IconComponent={<SearchIcon />}
      tooltip={t("contextMenu.node.showTemplatesTooltip")}
    />,
    <ContextMenuItem
      key="select-all"
      onClick={handlers.handleSelectAllSameType}
      label={
        node?.type
          ? t("contextMenu.node.selectAllOfType", { type: node.type.split(".").pop() })
          : t("contextMenu.node.selectAllOfTypeFallback")
      }
      IconComponent={<FilterListIcon />}
      tooltip={t("contextMenu.node.selectAllOfTypeTooltip")}
    />,
    <Divider key="divider-before-delete" />,
    <ContextMenuItem
      key="delete-node"
      onClick={handlers.handleDeleteNode}
      label={t("contextMenu.node.deleteNode")}
      IconComponent={<DeleteIcon />}
      tooltip={t("contextMenu.node.deleteNodeTooltip")}
    />,
    isDevelopment && <Divider key="dev-divider" />,
    isDevelopment && (
      <ContextMenuItem
        key="copy-nodedata"
        onClick={handlers.handleCopyMetadataToClipboard}
        label={t("contextMenu.node.copyNodeData")}
        IconComponent={<DataArrayIcon />}
        tooltip={t("contextMenu.node.copyNodeDataTooltip")}
      />
    )
  ];

  return (
    <ContextMenu
      className="context-menu node-context-menu"
      open={menuPosition !== null}
      onClose={closeContextMenu}
      onContextMenu={(event) => event.preventDefault()}
      position={menuPosition}
      paperSx={{ borderRadius: BORDER_RADIUS.lg }}
    >
      {menuItems.filter(Boolean)}
    </ContextMenu>
  );
};

export default memo(NodeContextMenu);
