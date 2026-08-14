/** @jsxImportSource @emotion/react */
/**
 * Left-panel sidebar (top-level) and node-browser sub-tabs.
 *
 *  - `LEFT_PANEL_TOP_LEVEL`: one icon per top-level view shown in
 *    the vertical rail.
 *  - `NODE_SUBCATEGORIES`: tile-grid sub-tabs nested inside the
 *    "Nodes" view. Each filters MetadataStore down to a node family. Media
 *    families are split into non-AI (processing/editing) and AI (model)
 *    variants — e.g. "Image" vs "Image AI".
 *
 * Order in each array drives display order.
 */
import type { ReactNode } from "react";
import AppsIcon from "@mui/icons-material/Apps";
import HistoryIcon from "@mui/icons-material/History";
import GridViewIcon from "@mui/icons-material/GridView";
import SettingsIcon from "@mui/icons-material/Settings";
import StarIcon from "@mui/icons-material/Star";
import ImageIcon from "@mui/icons-material/Image";
import MovieIcon from "@mui/icons-material/Movie";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import RecordVoiceOverOutlinedIcon from "@mui/icons-material/RecordVoiceOverOutlined";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import LoginIcon from "@mui/icons-material/Login";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import HubIcon from "@mui/icons-material/Hub";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";

import type { NodeMetadata } from "../stores/ApiTypes";
import {
  getContentCardVariant,
  getPrimaryOutput
} from "../components/node_types/contentCardRegistry";
import { getRequiredSecretKeyForNamespace } from "../utils/nodeProvider";
import type { LeftPanelView, NodeCategoryId } from "../stores/PanelStore";

export interface LeftPanelTopLevelCategory {
  id: LeftPanelView;
  labelKey: string;
  icon: ReactNode;
}

export interface NodeSubcategory {
  id: NodeCategoryId;
  labelKey: string;
  icon: ReactNode;
  filter: (m: NodeMetadata) => boolean;
}

const primaryVariantIs =
  (...variants: string[]) =>
  (m: NodeMetadata): boolean => {
    const v = getContentCardVariant(getPrimaryOutput(m));
    return variants.includes(v);
  };

const isImageOutput = primaryVariantIs("image", "image_mask");
const isVideoOutput = primaryVariantIs("video");
const isAudioOutput = primaryVariantIs("audio");
const is3dOutput = primaryVariantIs("model_3d");

/**
 * Treat a node as "AI" when it runs a model: either the backend marked it
 * generative (`auto_save_asset` — set on TextToImage/ImageToImage/Upscale/
 * RemoveBackground/Relight and the fal/kie/replicate factories) or it lives
 * under a provider namespace that requires an API key (fal, replicate, openai,
 * huggingface, elevenlabs, …). Everything else (Resize, Blur, Trim, Normalize,
 * color grading, mesh repair, …) is local, deterministic processing.
 */
const isAiNode = (m: NodeMetadata): boolean =>
  m.auto_save_asset === true ||
  getRequiredSecretKeyForNamespace(m.namespace) !== null;

/**
 * Top-level sidebar icons. Reduced from 12 → 5 by collapsing all node
 * tile-grids under a single "Nodes" entry with sub-tabs.
 */
export const LEFT_PANEL_TOP_LEVEL: readonly LeftPanelTopLevelCategory[] = [
  { id: "nodes", labelKey: "common:sidebar.nodes", icon: <HubIcon /> },
  { id: "workflows", labelKey: "common:sidebar.workflows", icon: <GridViewIcon /> },
  { id: "chats", labelKey: "common:sidebar.chats", icon: <ForumOutlinedIcon /> },
  { id: "sketches", labelKey: "common:sidebar.sketches", icon: <BrushOutlinedIcon /> },
  { id: "timelines", labelKey: "common:sidebar.timelines", icon: <MovieIcon /> },
  { id: "storyboards", labelKey: "common:sidebar.storyboards", icon: <DashboardOutlinedIcon /> },
  { id: "scripts", labelKey: "common:sidebar.scripts", icon: <RecordVoiceOverOutlinedIcon /> },
  {
    id: "apps",
    labelKey: "common:sidebar.apps",
    icon: <DashboardCustomizeOutlinedIcon />
  },
  { id: "settings", labelKey: "common:sidebar.settings", icon: <SettingsIcon /> },
  { id: "history", labelKey: "common:sidebar.history", icon: <HistoryIcon /> },
  { id: "favorites", labelKey: "common:sidebar.favorites", icon: <StarIcon /> },
  { id: "assets", labelKey: "common:sidebar.assets", icon: <PermMediaOutlinedIcon /> },
  { id: "library", labelKey: "common:sidebar.library", icon: <CollectionsOutlinedIcon /> }
];

/**
 * Node sub-tabs shown inside the Nodes view. Each entry filters
 * MetadataStore down to one family of nodes.
 */
export const NODE_SUBCATEGORIES: readonly NodeSubcategory[] = [
  {
    id: "all",
    labelKey: "canvas:nodeMenu.categories.all",
    icon: <AppsIcon />,
    filter: () => true
  },
  {
    id: "io",
    labelKey: "canvas:nodeMenu.categories.io",
    icon: <LoginIcon />,
    filter: (m) =>
      m.node_type.startsWith("nodetool.input.") ||
      m.node_type.startsWith("nodetool.output.")
  },
  {
    id: "image",
    labelKey: "canvas:nodeMenu.categories.image",
    icon: <ImageIcon />,
    filter: (m) => isImageOutput(m) && !isAiNode(m)
  },
  {
    id: "image-ai",
    labelKey: "canvas:nodeMenu.categories.imageAi",
    icon: <AutoAwesomeIcon />,
    filter: (m) => isImageOutput(m) && isAiNode(m)
  },
  {
    id: "video",
    labelKey: "canvas:nodeMenu.categories.video",
    icon: <MovieIcon />,
    filter: (m) => isVideoOutput(m) && !isAiNode(m)
  },
  {
    id: "video-ai",
    labelKey: "canvas:nodeMenu.categories.videoAi",
    icon: <AutoAwesomeIcon />,
    filter: (m) => isVideoOutput(m) && isAiNode(m)
  },
  {
    id: "audio",
    labelKey: "canvas:nodeMenu.categories.audio",
    icon: <AudiotrackIcon />,
    filter: (m) => isAudioOutput(m) && !isAiNode(m)
  },
  {
    id: "audio-ai",
    labelKey: "canvas:nodeMenu.categories.audioAi",
    icon: <AutoAwesomeIcon />,
    filter: (m) => isAudioOutput(m) && isAiNode(m)
  },
  {
    id: "3d-models",
    labelKey: "canvas:nodeMenu.categories.models3d",
    icon: <ViewInArIcon />,
    filter: is3dOutput
  },
  {
    id: "agents",
    labelKey: "canvas:nodeMenu.categories.agents",
    icon: <SmartToyIcon />,
    filter: (m) => /(^|\.)agents\./.test(m.node_type)
  },
  {
    id: "control-flow",
    labelKey: "canvas:nodeMenu.categories.controlFlow",
    icon: <CallSplitIcon />,
    filter: (m) => m.node_type.startsWith("nodetool.control.")
  }
];

export const getTopLevelCategory = (
  id: LeftPanelView
): LeftPanelTopLevelCategory | undefined =>
  LEFT_PANEL_TOP_LEVEL.find((c) => c.id === id);

export const getNodeSubcategory = (
  id: NodeCategoryId
): NodeSubcategory | undefined =>
  NODE_SUBCATEGORIES.find((c) => c.id === id);

/**
 * Filter all metadata down to the entries that belong to this sub-category.
 * Ordering and query matching are handled by the smart node ranker
 * (`rankSearchNodes`), so this only resolves category membership.
 */
export const filterNodesForCategory = (
  category: NodeSubcategory,
  all: NodeMetadata[]
): NodeMetadata[] => all.filter(category.filter);
