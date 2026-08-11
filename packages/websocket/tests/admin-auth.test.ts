import { afterEach, describe, expect, it } from "vitest";
import { isAdmin, requireAdmin } from "../src/trpc/admin-auth.js";

const previousAdminUserIds = process.env.ADMIN_USER_IDS;

afterEach(() => {
  if (previousAdminUserIds === undefined) {
    delete process.env.ADMIN_USER_IDS;
  } else {
    process.env.ADMIN_USER_IDS = previousAdminUserIds;
  }
});

describe("admin authorization", () => {
  it("allows the built-in local user", () => {
    expect(isAdmin("1")).toBe(true);
    expect(() => requireAdmin("1")).not.toThrow();
  });

  it("allows only configured production user IDs", () => {
    process.env.ADMIN_USER_IDS = " user-a, user-b ";
    expect(isAdmin("user-a")).toBe(true);
    expect(isAdmin("user-b")).toBe(true);
    expect(isAdmin("user-c")).toBe(false);
  });

  it("rejects a non-admin caller", () => {
    delete process.env.ADMIN_USER_IDS;
    expect(() => requireAdmin("ordinary-user")).toThrow(
      /Admin access required/
    );
  });
});
