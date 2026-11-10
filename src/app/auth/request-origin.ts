import type { NextRequest } from "next/server";

/** Public origin of the request (honours Vercel's forwarded host/proto). */
export function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}
