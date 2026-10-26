import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toUserMessage, UserFacingError } from "./client";
import { apiError, GENERIC_ERROR_MESSAGE, internalError } from "./errors";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiError", () => {
  it("hides the message and details of server errors", async () => {
    const response = apiError(500, "boom", 'relation "x" does not exist', { sql: "select 1" });
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(body.error.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("relation");
  });

  it("masks every 5xx status, such as 502 and 503", async () => {
    for (const status of [502, 503]) {
      const body = await apiError(status, "x", "Gemini said: key invalid").json();
      expect(body.error.message).toBe(GENERIC_ERROR_MESSAGE);
    }
  });

  it("keeps useful messages for client errors", async () => {
    const body = await apiError(400, "validation_error", "Location is required").json();
    expect(body.error.message).toBe("Location is required");
  });
});

describe("internalError", () => {
  it("returns a generic 500 and logs the real error", async () => {
    const response = internalError(new Error("password authentication failed"), "save_failed");
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.code).toBe("save_failed");
    expect(body.error.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("toUserMessage", () => {
  it("shows messages from UserFacingError only", () => {
    expect(toUserMessage(new UserFacingError("This QR code is no longer active."))).toBe(
      "This QR code is no longer active.",
    );
    expect(toUserMessage(new TypeError("Failed to fetch"))).toBe(GENERIC_ERROR_MESSAGE);
    expect(toUserMessage("anything")).toBe(GENERIC_ERROR_MESSAGE);
  });
});
