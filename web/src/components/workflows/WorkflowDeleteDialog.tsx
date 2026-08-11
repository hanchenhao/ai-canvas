import { FC, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../dialogs/ConfirmDialog";
import { WorkflowAttributes } from "../../stores/ApiTypes";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkflowManager } from "../../contexts/WorkflowManagerContext";
import { useNavigate } from "react-router-dom";

interface WorkflowDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  workflowsToDelete: WorkflowAttributes[];
}

const WorkflowDeleteDialog: FC<WorkflowDeleteDialogProps> = ({
  open,
  onClose,
  workflowsToDelete
}) => {
  const { t } = useTranslation(["common"]);
  const { removeWorkflow, openWorkflows } = useWorkflowManager(
    useShallow((state) => ({
      removeWorkflow: state.removeWorkflow,
      openWorkflows: state.openWorkflows
    }))
  );
  const currentWorkflowId = useWorkflowManager(
    (state) => state.currentWorkflowId
  );
  const deleteWorkflow = useWorkflowManager((state) => state.delete);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const handleDelete = useCallback(() => {
    Promise.all(
      workflowsToDelete.map((workflow) =>
        deleteWorkflow({ ...workflow, graph: { nodes: [], edges: [] } })
      )
    )
      .then(() => {
        onClose();
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
        Promise.all(workflowsToDelete.map((w) => removeWorkflow(w.id)));
        // If we delete the current workflow, we need to navigate to the next available workflow
        if (
          currentWorkflowId &&
          workflowsToDelete.some((w) => w.id === currentWorkflowId)
        ) {
          const nextWorkflow = openWorkflows.find(
            (w) => !workflowsToDelete.some((y) => y.id === w.id)
          );
          if (nextWorkflow) {
            navigate(`/editor/${nextWorkflow.id}`);
          } else {
            navigate("/editor");
          }
        }
      })
      .catch((error) => {
        console.error("Error deleting workflows:", error);
      });
  }, [
    deleteWorkflow,
    workflowsToDelete,
    queryClient,
    currentWorkflowId,
    openWorkflows,
    navigate,
    onClose,
    removeWorkflow
  ]);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleDelete}
      confirmText={t("common:button.delete")}
      cancelText={t("common:button.cancel")}
      title={t("common:dialog.deleteWorkflowTitle")}
      notificationMessage={t("common:dialog.deleteWorkflowNotification")}
      notificationType="success"
      content={
        <>
          <p>{t("common:dialog.deleteWorkflowConfirm")}</p>
          <ul className="asset-names">
            {workflowsToDelete.map((workflow) => (
              <li key={workflow.id}>{workflow.name}</li>
            ))}
          </ul>
        </>
      }
    />
  );
};

export default WorkflowDeleteDialog;
