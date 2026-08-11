import { describe, it, expect, beforeEach } from "@jest/globals";
import i18n from "../i18n";
import { translateError } from "./translateError";
import { ApiErrorCode } from "@nodetool-ai/protocol/api-schemas";

describe("translateError", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates known ApiErrorCode in English", () => {
    expect(translateError(ApiErrorCode.WORKFLOW_EXECUTION_FAILED, "fallback")).toBe(
      "Workflow run failed"
    );
  });

  it("translates known ApiErrorCode in zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateError(ApiErrorCode.WORKFLOW_EXECUTION_FAILED, "fallback")).toBe(
      "工作流运行失败"
    );
  });

  it("interpolates params", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(
      translateError(ApiErrorCode.BUDGET_EXCEEDED, "fallback", {
        detail: "$2.50 / $2.00"
      })
    ).toBe("预算超限（$2.50 / $2.00）");
  });

  it("falls back when code is unknown", () => {
    expect(translateError("SOME_MADE_UP_CODE" as ApiErrorCode, "原始错误消息")).toBe(
      "原始错误消息"
    );
  });
});
