export const DEFAULT_API_BASE_URL = "https://partner.peaka.studio/api/v1";

// The fetcher sandbox does not require a browser URL implementation.
// Accept an HTTPS origin or the complete Partner API base URL.
export function resolveApiBaseUrl(value?: unknown): string {
  if (value === undefined) return DEFAULT_API_BASE_URL;
  if (typeof value !== "string") throw new Error("Enter a valid HTTPS Peaka API address.");
  const match = /^https:\/\/(\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::(\d+))?(?:\/api\/v1)?\/?$/i.exec(value.trim());
  if (!match) throw new Error("Use an HTTPS Peaka API address without credentials, query parameters or fragments.");
  const host = match[1].toLowerCase();
  if (!host.startsWith("[") && host.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new Error("Enter a valid Peaka API hostname.");
  }
  const port = match[2] ? Number(match[2]) : 443;
  if (port < 1 || port > 65535) throw new Error("Enter a port between 1 and 65535.");
  return `https://${host}${port === 443 ? "" : `:${port}`}/api/v1`;
}
