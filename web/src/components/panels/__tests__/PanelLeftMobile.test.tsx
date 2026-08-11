/**
 * PanelLeft — mobile bottom sheet tests
 *
 * The sheet's tab row is the only way to reach a left-panel view on a phone,
 * so it must offer the same top-level views the desktop rail does, minus the
 * ones that only make sense while a workflow is open for editing.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import i18n from "../../../i18n";

import PanelLeft from "../PanelLeft";
import mockTheme from "../../../__mocks__/themeMock";
import { usePanelStore } from "../../../stores/PanelStore";
import { LEFT_PANEL_TOP_LEVEL } from "../../../config/quickAccessCategories";

// Resolve the sidebar label for a top-level view through i18n so the test
// matches what the component renders (the rail translates every label).
const sidebarLabel = (view: string): string =>
  i18n.t(`common:sidebar.${view}`);

jest.mock("@mui/material/useMediaQuery", () => () => true);

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/workspace" })
}));

jest.mock("../../../hooks/handlers/useResizePanel", () => ({
  useResizePanel: () => ({
    ref: { current: null },
    size: 300,
    isVisible: true,
    isDragging: false,
    handleMouseDown: jest.fn(),
    handlePanelToggle: (view: string) =>
      usePanelStore.getState().setActiveView(view as never)
  })
}));

jest.mock("../../../contexts/WorkflowManagerContext", () => ({
  useWorkflowManager: () => null
}));

jest.mock("../../../stores/WorkspaceTabsStore", () => ({
  useWorkspaceTabsStore: (selector: (state: unknown) => unknown) =>
    selector({ tabs: [], activeTabId: null, openTab: jest.fn() })
}));

jest.mock("../../assets/AssetGrid", () => () => <div data-testid="asset-grid" />);
jest.mock("../../workflows/WorkflowList", () => () => (
  <div data-testid="workflow-list" />
));
jest.mock("../../workflows/WorkflowForm", () => () => (
  <div data-testid="workflow-form" />
));
jest.mock("../../workflows/CreateWorkflowButton", () => () => (
  <div data-testid="create-workflow" />
));
jest.mock("../../node_menu/NodeLibrary", () => () => (
  <div data-testid="node-library" />
));
jest.mock("../../node_menu/HistoryTilesPanel", () => () => (
  <div data-testid="history-tiles" />
));
jest.mock("../../node_menu/FavoritesTiles", () => () => (
  <div data-testid="favorites-tiles" />
));
jest.mock("../RailAppMenu", () => () => <div data-testid="rail-app-menu" />);
jest.mock("../../ui/ThemeToggle", () => () => (
  <div data-testid="theme-toggle" />
));
jest.mock("../../context_menus/ContextMenus", () => () => (
  <div data-testid="context-menus" />
));

jest.mock("../../timeline/TimelineListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="timeline-list" />,
  CreateTimelineButton: () => <div data-testid="create-timeline" />
}));
jest.mock("../../sketch/SketchListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="sketch-list" />,
  CreateSketchButton: () => <div data-testid="create-sketch" />
}));
jest.mock("../../storyboard/StoryboardListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="storyboard-list" />,
  CreateStoryboardButton: () => <div data-testid="create-storyboard" />
}));
jest.mock("../../script/ScriptListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="script-list" />,
  CreateScriptButton: () => <div data-testid="create-script" />
}));
jest.mock("../../chat/ChatListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="chat-list" />,
  CreateChatButton: () => <div data-testid="create-chat" />
}));
jest.mock("../../applications/ApplicationListPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="application-list" />,
  CreateApplicationButton: () => <div data-testid="create-application" />,
  CreateApplicationFromWorkflowButton: () => (
    <div data-testid="create-application-from-workflow" />
  )
}));

const WORKFLOW_EDIT_ONLY = ["nodes", "settings", "history", "favorites"];

const renderPanel = () =>
  render(
    <ThemeProvider theme={mockTheme}>
      <PanelLeft />
    </ThemeProvider>
  );

beforeEach(() => {
  usePanelStore.getState().setVisibility(true);
  usePanelStore.getState().setActiveView("workflows");
});

it("offers every non-workflow-edit top-level view as a tab", () => {
  renderPanel();

  for (const category of LEFT_PANEL_TOP_LEVEL) {
    // The mobile sheet renders each top-level view as a tab button (the
    // categories the sheet omits have no tab button in the DOM).
    const tabs = screen.queryAllByLabelText(sidebarLabel(category.id));
    if (WORKFLOW_EDIT_ONLY.includes(category.id)) {
      expect(tabs).toHaveLength(0);
    } else {
      expect(tabs.length).toBeGreaterThanOrEqual(1);
    }
  }
});

it("switches the sheet to the view whose tab was tapped", async () => {
  const user = userEvent.setup();
  renderPanel();

  await user.click(screen.getByLabelText(sidebarLabel("chats")));
  expect(usePanelStore.getState().panel.activeView).toBe("chats");
  expect(screen.getByTestId("chat-list")).toBeInTheDocument();

  await user.click(screen.getByLabelText(sidebarLabel("apps")));
  expect(usePanelStore.getState().panel.activeView).toBe("apps");
  expect(screen.getByTestId("application-list")).toBeInTheDocument();
});

it("shows the create action for the active list view", async () => {
  const user = userEvent.setup();
  renderPanel();

  expect(screen.getByTestId("create-workflow")).toBeInTheDocument();

  await user.click(screen.getByLabelText(sidebarLabel("storyboards")));
  expect(screen.getByTestId("create-storyboard")).toBeInTheDocument();

  await user.click(screen.getByLabelText(sidebarLabel("assets")));
  expect(screen.queryByTestId("create-storyboard")).not.toBeInTheDocument();
});
