import { describe, it, expect, beforeEach } from "@jest/globals";
import i18n from "../i18n";
import { translateError } from "./translateError";

describe("translateError", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates known code in English", () => {
    expect(translateError("workflow_run_failed", "fallback")).toBe(
      "Workflow run failed"
    );
  });

  it("translates known code in zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateError("workflow_run_failed", "fallback")).toBe(
      "工作流运行失败"
    );
  });

  it("interpolates params", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(
      translateError("node_invocation_error", "fallback", {
        nodeType: "nodetool.text.Concat"
      })
    ).toBe("节点 nodetool.text.Concat 执行失败");
  });

  it("falls back when code is unknown", () => {
    expect(translateError("some_unknown_code", "原始错误消息")).toBe(
      "原始错误消息"
    );
  });
});
