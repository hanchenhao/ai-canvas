/**
 * @jest-environment node
 */
import { getToolSettingsLabel } from "../getToolSettingsLabel";
import type { SketchTool } from "../../types";

describe("getToolSettingsLabel", () => {
  const expectedLabels: Array<[SketchTool, string]> = [
    ["brush", "sketch:tools.brush"],
    ["pencil", "sketch:tools.pencil"],
    ["eraser", "sketch:tools.eraser"],
    ["fill", "sketch:tools.fill"],
    ["blur", "sketch:tools.blur"],
    ["gradient", "sketch:tools.gradient"],
    ["crop", "sketch:tools.crop"],
    ["select", "sketch:tools.select"],
    ["adjust", "sketch:tools.adjust"],
    ["segment", "sketch:tools.segment"],
    ["shape", "sketch:tools.shape"],
    ["transform", "sketch:tools.transform"]
  ];

  it.each(expectedLabels)(
    'returns "%s" → "%s"',
    (tool, expected) => {
      expect(getToolSettingsLabel(tool)).toBe(expected);
    }
  );

  it('returns "sketch:tools.settings" for tools without a specific label', () => {
    expect(getToolSettingsLabel("move")).toBe("sketch:tools.settings");
    expect(getToolSettingsLabel("eyedropper")).toBe("sketch:tools.settings");
    expect(getToolSettingsLabel("clone_stamp")).toBe("sketch:tools.settings");
  });

  it('returns "sketch:tools.settings" for unknown tool values', () => {
    expect(getToolSettingsLabel("unknown" as SketchTool)).toBe("sketch:tools.settings");
  });
});
