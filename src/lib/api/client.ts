export const GENERIC_ERROR = "Something went wrong, please try again.";

/** An error whose message is safe to show, such as one built from an API response. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Safe message for the screen. Anything unexpected becomes the generic one. */
export function toUserMessage(error: unknown): string {
  return error instanceof UserFacingError ? error.message : GENERIC_ERROR;
}
