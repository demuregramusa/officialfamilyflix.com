/**
 * Derives the public origin for links in API responses.
 *
 * Behind a proxy (the preview host, Cloudflare, a load balancer) the request
 * URL can still say `localhost`. Prefer the forwarded host, then the configured
 * public origin, and only then the raw request origin.
 */
export function requestOrigin(request: Request): string {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("x-original-host");
  const host = forwardedHost ?? request.headers.get("host");

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (host && !isLoopback(host)) {
    return `https://${host}`;
  }

  return new URL(request.url).origin;
}

function isLoopback(host: string) {
  const name = host.split(":")[0]?.toLowerCase();
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "0.0.0.0" ||
    name === "[::1]"
  );
}
