/**
 * The workflows an app runs, listed on the app surface.
 *
 * Apps and workflows are orthogonal: opening an app never opens a workflow
 * tab. Their graphs are still loaded in the background — the app needs them to
 * resolve bindings — and this menu is the one place they surface. Picking one
 * opens it as a normal workflow tab.
 */
import { memo, useCallback, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { useLinkedWorkflows, type LinkedWorkflow } from "../../hooks/useApplications";
import { useWorkspaceTabsStore } from "../../stores/WorkspaceTabsStore";
import {
  Button,
  Caption,
  Chip,
  FlexColumn,
  FlexRow,
  Menu,
  MenuItem,
  SPACING,
  Text
} from "../ui_primitives";

export interface LinkedWorkflowsMenuProps {
  applicationId: string;
  /** The app tab has focus — background tabs fetch nothing. */
  active?: boolean;
}

const LinkedWorkflowsMenu = ({
  applicationId,
  active = true
}: LinkedWorkflowsMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { t } = useTranslation(["workspace"]);
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const { links } = useLinkedWorkflows(applicationId, active);

  const usedByLabel = useCallback(
    (link: LinkedWorkflow): string => {
      const names = link.operations
        .map((operation) => operation.name)
        .join(", ");
      return names
        ? t("workspace:linkedWorkflows.usedBy", { names })
        : t("workspace:linkedWorkflows.boundToNone");
    },
    [t]
  );

  const open = useCallback(
    (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
    []
  );
  const close = useCallback(() => setAnchorEl(null), []);

  const openWorkflow = useCallback(
    (link: LinkedWorkflow) => {
      openTab({
        type: "workflow",
        ref: link.workflowId,
        mode: "edit",
        title: link.name
      });
      setAnchorEl(null);
    },
    [openTab]
  );

  return (
    <>
      <Button
        size="small"
        variant="text"
        onClick={open}
        aria-haspopup="menu"
        aria-expanded={anchorEl !== null}
      >
        {t("workspace:linkedWorkflows.button", { count: links.length })}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={close}
        MenuListProps={{ "aria-label": t("workspace:linkedWorkflows.menuAria") }}
      >
        {links.length === 0 && (
          <MenuItem disabled>
            <Caption color="secondary">
              {t("workspace:linkedWorkflows.empty")}
            </Caption>
          </MenuItem>
        )}
        {links.map((link) => {
          const broken = link.error !== null;
          return (
            <MenuItem
              key={link.workflowId}
              disabled={broken}
              onClick={() => openWorkflow(link)}
            >
              <FlexColumn gap={SPACING.xs} sx={{ minWidth: 0 }}>
                <FlexRow align="center" gap={SPACING.xs}>
                  <Text size="small" truncate>
                    {broken
                      ? t("workspace:linkedWorkflows.unavailable")
                      : link.name}
                  </Text>
                  {link.isPinned && (
                    <Chip
                      compact
                      color="info"
                      label={
                        link.pinnedVersion === null
                          ? t("workspace:linkedWorkflows.pinned")
                          : t("workspace:linkedWorkflows.pinnedVersion", {
                              version: link.pinnedVersion
                            })
                      }
                    />
                  )}
                </FlexRow>
                <Caption color={broken ? "error" : "secondary"}>
                  {broken
                    ? t("workspace:linkedWorkflows.loadError", {
                        id: link.workflowId,
                        error:
                          link.error?.message ??
                          t("workspace:linkedWorkflows.couldNotLoad")
                      })
                    : usedByLabel(link)}
                </Caption>
              </FlexColumn>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default memo(LinkedWorkflowsMenu);
