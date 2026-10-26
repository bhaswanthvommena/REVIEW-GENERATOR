import { NextResponse } from "next/server";

export const GENERIC_ERROR_MESSAGE = "Something went wrong, please try again.";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Build an error response. Server errors (5xx) never expose their message:
 * the original is logged and the caller sees a generic one.
 */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const masked = status >= 500;
  if (masked) {
    console.error(`api_error ${code}`, message);
  }
  const body: ApiErrorBody = {
    error: {
      code,
      message: masked ? GENERIC_ERROR_MESSAGE : message,
      ...(details !== undefined && !masked ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

/** Catch-all for unexpected failures: log the real error, return a generic one. */
export function internalError(error: unknown, code = "internal_error") {
  console.error(`api_error ${code}`, error);
  return apiError(500, code, GENERIC_ERROR_MESSAGE);
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
