/**
 * Allowlist for owner-pasted Google review / Maps URLs.
 * Official Business Profile "Get more reviews" links only — no javascript/data.
 */

const ALLOWED_HOSTS = new Set([
  "g.page",
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.maps.google.com",
  "search.google.com",
]);

export function isAllowedGoogleReviewUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return false;
  }

  // Reject credentialed URLs and obvious non-review schemes already covered.
  if (url.username || url.password) {
    return false;
  }

  return true;
}

export function assertAllowedGoogleReviewUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!isAllowedGoogleReviewUrl(trimmed)) {
    throw new Error(
      "Google review URL must be https and use an allowed Google host (g.page, maps.app.goo.gl, google.com/maps, etc.)",
    );
  }
  return trimmed;
}
