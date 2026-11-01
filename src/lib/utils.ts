export { cn } from "cn"

/**
 * Returns `next` only when it is a same-site path, otherwise `fallback`. Rejects protocol-relative and
 * backslash tricks ("//evil", "/\evil") that browsers would turn into another origin.
 */
export function safeRedirectPath(next: unknown, fallback = "/app/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/") || /[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const base = "https://linguora.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
