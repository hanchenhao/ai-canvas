import React, { useCallback, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";

import {
  Text,
  Divider,
  ContextMenu,
  MenuItem
} from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
//store
import useContextMenuStore from "../../stores/ContextMenuStore";
//behaviours
import { useCopyPaste } from "../../hooks/handlers/useCopyPaste";
import { useDuplicateNodes } from "../../hooks/useDuplicate";
import useAlignNodes from "../../hooks/useAlignNodes";
import { useSurroundWithGroup } from "../../hooks/nodes/useSurroundWithGroup";
import { useRemoveFromGroup } from "../../hooks/nodes/useRemoveFromGroup";
import { useGroupIntoSubgraph } from "../../hooks/nodes/useGroupIntoSubgraph";
import { useRunSelectedNodes } from "../../hooks/nodes/useRunSelectedNodes";
import { useToggleCollapse } from "../../hooks/nodes/useToggleCollapse";
import { useSelectConnected } from "../../hooks/useSelectConnected";
//icons
import QueueIcon from "@mui/icons-material/Queue";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BlockIcon from "@mui/icons-material/Block";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { useNodes } from "../../contexts/NodeContext";
import isEqual from "../../utils/isEqual";
import { shallow } from "zustand/shallow";

interface SelectionContextMenuProps {
  top?: number;
  left?: number;
}

const SelectionContextMenu: React.FC<SelectionContextMenuProps> = () => {
  const { t } = useTranslation(["canvas", "common"]);
  const { handleCopy, handleCut } = useCopyPaste();
  const { deleteNodes, toggleBypassSelected } = useNodes((state) => ({
    deleteNodes: state.deleteNodes,
    toggleBypassSelected: state.toggleBypassSelected
  }), shallow);
  const duplicateNodes = useDuplicateNodes();
  const alignNodes = useAlignNodes();
  const surroundWithGroup = useSurroundWithGroup();
  const removeFromGroup = useRemoveFromGroup();
  const groupIntoSubgraph = useGroupIntoSubgraph();
  const { runSelectedNodes } = useRunSelectedNodes();
  const toggleCollapse = useToggleCollapse();
  const selectConnectedAll = useSelectConnected({ direction: "both" });
  const selectConnectedInputs = useSelectConnected({ direction: "upstream" });
  const selectConnectedOutputs = useSelectConnected({ direction: "downstream" });
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  // Use simplified selector with custom equality to avoid re-renders during drag operations.
  // Only extract the properties needed by this component and its hooks:
  // - id, parentId, data for context menu logic and hooks
  // - position, measured for useSurroundWithGroup and useRemoveFromGroup hooks
  // This prevents unnecessary re-renders when other node properties change.
  // Note: data reference is stable during position updates, so this is efficient.
  const selectedNodes = useNodes(
    (state) =>
      state.nodes
        .filter((node) => node.selected)
        .map((node) => ({
          id: node.id,
          parentId: node.parentId,
          data: node.data,
          position: node.position,
          measured: node.measured
        })),
    isEqual
  );

  const anyHasParent = useMemo(() => {
    return selectedNodes.some((node) => node.parentId);
  }, [selectedNodes]);

  const majorityBypassed = useMemo(() => {
    if (selectedNodes.length === 0) {
      return false;
    }
    const bypassedCount = selectedNodes.filter((n) => n.data.bypassed).length;
    return bypassedCount >= selectedNodes.length / 2;
  }, [selectedNodes]);

  const handleToggleBypass = useCallback(() => {
    toggleBypassSelected();
    closeContextMenu();
  }, [toggleBypassSelected, closeContextMenu]);

  const handleDuplicateNodes = useCallback(() => {
    duplicateNodes();
  }, [duplicateNodes]);

  const handleDelete = useCallback(() => {
    if (selectedNodes?.length) {
      // [PERF] Use batch deletion (deleteNodes) instead of iterating deleteNode(node.id) to avoid O(N) re-renders
      deleteNodes(selectedNodes.map((node) => node.id));
    }
    closeContextMenu();
  }, [closeContextMenu, deleteNodes, selectedNodes]);

  const handleSelectConnectedAll = useCallback(() => {
    selectConnectedAll.selectConnected();
    closeContextMenu();
  }, [selectConnectedAll, closeContextMenu]);

  const handleSelectConnectedInputs = useCallback(() => {
    selectConnectedInputs.selectConnected();
    closeContextMenu();
  }, [selectConnectedInputs, closeContextMenu]);

  const handleSelectConnectedOutputs = useCallback(() => {
    selectConnectedOutputs.selectConnected();
    closeContextMenu();
  }, [selectConnectedOutputs, closeContextMenu]);

  const handleAlignNodes = useCallback(
    (arrangeSpacing: boolean) => {
      alignNodes({ arrangeSpacing });
    },
    [alignNodes]
  );

  const handleSurroundWithGroup = useCallback(() => {
    surroundWithGroup({ selectedNodes });
  }, [surroundWithGroup, selectedNodes]);

  const handleRemoveFromGroup = useCallback(() => {
    removeFromGroup(selectedNodes);
  }, [removeFromGroup, selectedNodes]);

  const handleCopyNodes = useCallback(() => {
    handleCopy();
    closeContextMenu();
  }, [handleCopy, closeContextMenu]);

  const handleCutNodes = useCallback(() => {
    void handleCut();
    closeContextMenu();
  }, [handleCut, closeContextMenu]);

  const handleRunSelected = useCallback(() => {
    void runSelectedNodes();
    closeContextMenu();
  }, [runSelectedNodes, closeContextMenu]);

  const handleGroupIntoSubgraph = useCallback(() => {
    const ids = selectedNodes.map((node) => node.id);
    if (ids.length === 0) {
      return;
    }
    groupIntoSubgraph(ids);
    closeContextMenu();
  }, [groupIntoSubgraph, selectedNodes, closeContextMenu]);

  const handleToggleCollapsed = useCallback(() => {
    toggleCollapse(selectedNodes.map((node) => node.id));
    closeContextMenu();
  }, [toggleCollapse, selectedNodes, closeContextMenu]);

  const handleAlignNodesFalse = useCallback(() => {
    handleAlignNodes(false);
  }, [handleAlignNodes]);

  const handleAlignNodesTrue = useCallback(() => {
    handleAlignNodes(true);
  }, [handleAlignNodes]);

  if (!menuPosition) {
    return null;
  }
  return (
    <ContextMenu
      className="context-menu selection-context-menu"
      open={menuPosition !== null}
      onClose={closeContextMenu}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      position={menuPosition}
    >
      <MenuItem disabled>
        <Text
          style={{
            margin: ".1em 0",
            padding: "0"
          }}
        >
          {t("canvas:contextMenu.selection.selection")}
        </Text>
      </MenuItem>

      <ContextMenuItem
        onClick={handleDuplicateNodes}
        label={t("canvas:contextMenu.duplicate")}
        IconComponent={<QueueIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.duplicate")}</div>
            <div className="tooltip-key">
              <kbd>CTRL</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>D</kbd>
            </div>
          </div>
        }
      />
      <ContextMenuItem
        onClick={handleCopyNodes}
        label={t("canvas:contextMenu.copy")}
        IconComponent={<CopyAllIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.copy")}</div>
            <div className="tooltip-key">
              <kbd>CTRL</kbd>+<kbd>C</kbd> / <kbd>⌘</kbd>+<kbd>C</kbd>
            </div>
          </div>
        }
      />
      <ContextMenuItem
        onClick={handleCutNodes}
        label={t("canvas:contextMenu.cut")}
        IconComponent={<ContentCutIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.cut")}</div>
            <div className="tooltip-key">
              <kbd>CTRL</kbd>+<kbd>X</kbd> / <kbd>⌘</kbd>+<kbd>X</kbd>
            </div>
          </div>
        }
      />
      <ContextMenuItem
        onClick={handleRunSelected}
        label={t("canvas:contextMenu.selection.runSelected")}
        IconComponent={<PlayArrowIcon />}
        tooltip={t("canvas:contextMenu.selection.runSelectedTooltip")}
      />
      {selectedNodes?.length > 1 && (
        <ContextMenuItem
          onClick={handleAlignNodesFalse}
          label={t("canvas:contextMenu.selection.align")}
          IconComponent={<FormatAlignLeftIcon />}
          tooltip={
            <div className="tooltip-span">
              <div className="tooltip-title">{t("canvas:contextMenu.selection.align")}</div>
              <div className="tooltip-key">
                <kbd>A</kbd>
              </div>
            </div>
          }
        />
      )}
      {selectedNodes?.length > 1 && (
        <ContextMenuItem
          onClick={handleAlignNodesTrue}
          label={t("canvas:contextMenu.selection.arrange")}
          IconComponent={<FormatAlignLeftIcon />}
          tooltip={
            <div className="tooltip-span">
              <div className="tooltip-title">{t("canvas:contextMenu.selection.arrange")}</div>
              <div className="tooltip-key">
                <kbd>SHIFT</kbd>+<kbd>A</kbd>
              </div>
            </div>
          }
        />
      )}

      <ContextMenuItem
        onClick={handleToggleBypass}
        label={majorityBypassed ? t("canvas:contextMenu.selection.enableAll") : t("canvas:contextMenu.selection.bypassAll")}
        IconComponent={<BlockIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">
              {majorityBypassed ? t("canvas:contextMenu.selection.enableNodes") : t("canvas:contextMenu.selection.bypassNodes")}
            </div>
            <div className="tooltip-key">
              <kbd>B</kbd>
            </div>
          </div>
        }
      />

      <ContextMenuItem
        onClick={handleToggleCollapsed}
        label={t("canvas:contextMenu.selection.collapseExpand")}
        IconComponent={<UnfoldLessIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.selection.collapseExpand")}</div>
            <div className="tooltip-key">
              <kbd>C</kbd>
            </div>
          </div>
        }
      />

      {!anyHasParent && (
        <ContextMenuItem
          onClick={handleSurroundWithGroup}
          label={t("canvas:contextMenu.selection.surroundWithGroup")}
          IconComponent={<GroupWorkIcon />}
          tooltip={
            <div className="tooltip-span">
              <div className="tooltip-title">{t("canvas:contextMenu.selection.surroundWithGroup")}</div>
              <div className="tooltip-key">
                <kbd>CTRL</kbd>/<kbd>⌘</kbd>+<kbd>G</kbd>
              </div>
            </div>
          }
          addButtonClassName={`action ${
            selectedNodes.length < 1 ? "disabled" : ""
          }`}
        />
      )}

      <ContextMenuItem
        onClick={handleGroupIntoSubgraph}
        label={t("canvas:contextMenu.groupIntoSubgraph")}
        IconComponent={<AccountTreeIcon />}
        tooltip={t("canvas:contextMenu.groupIntoSubgraphTooltip")}
        addButtonClassName={`action ${
          selectedNodes.length < 1 ? "disabled" : ""
        }`}
      />

      {anyHasParent && (
        <ContextMenuItem
          onClick={handleRemoveFromGroup}
          label={t("canvas:contextMenu.removeFromGroup")}
          IconComponent={<GroupWorkIcon />}
          tooltip={
            <div className="tooltip-span">
              <div className="tooltip-title">{t("canvas:contextMenu.removeFromGroup")}</div>
              <div className="tooltip-key">
                <kbd>{t("canvas:contextMenu.selection.rightClick")}</kbd>
              </div>
            </div>
          }
          addButtonClassName={`action ${
            selectedNodes.length < 1 ? "disabled" : ""
          }`}
        />
      )}

      <Divider />

      <MenuItem disabled>
        <Text
          style={{
            margin: ".1em 0",
            padding: "0"
          }}
        >
          {t("canvas:contextMenu.selection.connected")}
        </Text>
      </MenuItem>

      <ContextMenuItem
        onClick={handleSelectConnectedAll}
        label={t("canvas:contextMenu.selection.selectAllConnected")}
        IconComponent={<CallSplitIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.selection.selectAllConnected")}</div>
            <div className="tooltip-key">
              <kbd>SHIFT</kbd>+<kbd>C</kbd>
            </div>
          </div>
        }
        addButtonClassName={`action ${
          selectedNodes.length < 1 ? "disabled" : ""
        }`}
      />
      <ContextMenuItem
        onClick={handleSelectConnectedInputs}
        label={t("canvas:contextMenu.selection.selectInputs")}
        IconComponent={<ArrowBackIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.selection.selectInputs")}</div>
            <div className="tooltip-key">
              <kbd>SHIFT</kbd>+<kbd>I</kbd>
            </div>
          </div>
        }
        addButtonClassName={`action ${
          selectedNodes.length < 1 ? "disabled" : ""
        }`}
      />
      <ContextMenuItem
        onClick={handleSelectConnectedOutputs}
        label={t("canvas:contextMenu.selection.selectOutputs")}
        IconComponent={<ArrowForwardIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("canvas:contextMenu.selection.selectOutputs")}</div>
            <div className="tooltip-key">
              <kbd>SHIFT</kbd>+<kbd>O</kbd>
            </div>
          </div>
        }
        addButtonClassName={`action ${
          selectedNodes.length < 1 ? "disabled" : ""
        }`}
      />

      <Divider />
      <ContextMenuItem
        onClick={handleDelete}
        label={t("common:button.delete")}
        IconComponent={<RemoveCircleIcon />}
        tooltip={
          <div className="tooltip-span">
            <div className="tooltip-title">{t("common:button.delete")}</div>
            <div className="tooltip-key">
              <kbd>Backspace</kbd> / <kbd>Del</kbd>
            </div>
          </div>
        }
        addButtonClassName="delete"
      />
    </ContextMenu>
  );
};

export default memo(SelectionContextMenu);
