import { ApiErrorCode } from "../error-codes.js";
import { throwApiError } from "./error-formatter.js";

/** Local single-user mode grants the built-in user admin access. */
export function isAdmin(userId: string): boolean {
  if (userId === "1") return true;
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(userId);
}

export function requireAdmin(userId: string): void {
  if (!isAdmin(userId)) {
    throwApiError(ApiErrorCode.FORBIDDEN, "Admin access required");
  }
}
