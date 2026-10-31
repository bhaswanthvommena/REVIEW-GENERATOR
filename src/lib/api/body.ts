export const MAX_PUBLIC_BODY_BYTES = 64 * 1024; // 64 KB

export class PayloadTooLargeError extends Error {
  constructor(message = "Payload too large") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor(message = "Unsupported Media Type. Expected application/json.") {
    super(message);
    this.name = "UnsupportedMediaTypeError";
  }
}

/**
 * Safely parse a JSON request body with size and optional content-type enforcement.
 * Protects against unbounded memory consumption and DoS.
 */
export async function parseJsonBody<T>(
  request: Request,
  options?: {
    maxBytes?: number;
    requireJsonContentType?: boolean;
  },
): Promise<T> {
  const maxBytes = options?.maxBytes ?? MAX_PUBLIC_BODY_BYTES;

  if (options?.requireJsonContentType) {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().includes("application/json")) {
      throw new UnsupportedMediaTypeError();
    }
  }

  const headerLen = request.headers.get("content-length");
  if (headerLen) {
    const parsedLen = parseInt(headerLen, 10);
    if (!isNaN(parsedLen) && parsedLen > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  const text = await request.text();
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > maxBytes) {
    throw new PayloadTooLargeError();
  }

  return JSON.parse(text) as T;
}
