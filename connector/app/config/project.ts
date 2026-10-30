export function resolveProjectId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value.trim())) {
    throw new Error("Enter a valid Project ID using letters, numbers, hyphens or underscores.");
  }
  return value.trim();
}
