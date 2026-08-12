import type { SketchTool } from "../types";

/**
 * Returns the i18n key for a tool's settings label.
 * The caller is responsible for passing the returned key through `t()`.
 */
export function getToolSettingsLabel(tool: SketchTool): string {
  switch (tool) {
    case "brush":
      return "sketch:tools.brush";
    case "pencil":
      return "sketch:tools.pencil";
    case "eraser":
      return "sketch:tools.eraser";
    case "fill":
      return "sketch:tools.fill";
    case "blur":
      return "sketch:tools.blur";
    case "gradient":
      return "sketch:tools.gradient";
    case "crop":
      return "sketch:tools.crop";
    case "select":
      return "sketch:tools.select";
    case "adjust":
      return "sketch:tools.adjust";
    case "segment":
      return "sketch:tools.segment";
    case "shape":
      return "sketch:tools.shape";
    case "transform":
      return "sketch:tools.transform";
    default:
      return "sketch:tools.settings";
  }
}
