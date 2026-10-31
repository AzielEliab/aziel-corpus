/**
 * HTML security headers for azielcorpuslibrary.net and www.
 * Matched to the aziel-runtime Worker header style.
 * Inline scripts were checked first (film, sigil, reader, donate, map boot, JSON-LD):
 * script-src keeps 'unsafe-inline', same as the runtime Worker.
 * Same-origin scripts and the OCR tesseract host are the only extra script sources.
 * media-src is required for the homepage film. Untrusted library HTML keeps CSP sandbox.
 * GET /v1/mesh is not involved. Remain-OFF untouched.
 * Author: Aziel Eliab only.
 */

export const CORPUS_HSTS = "max-age=31536000; includeSubDomains";

export const CORPUS_HTML_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'unsafe-inline' 'self' https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "style-src 'unsafe-inline'",
  "img-src 'self' https: data:",
  "media-src 'self' https: blob:",
  "connect-src 'self' https:",
  "font-src 'self'",
].join("; ");

export function applyHtmlSecurity(response) {
  if (!response || !response.headers || typeof response.headers.get !== "function") return response;
  const ct = response.headers.get("Content-Type") || "";
  if (!/^text\/html\b/i.test(ct)) return response;
  const headers = new Headers(response.headers);
  if (!headers.get("Content-Security-Policy")) headers.set("Content-Security-Policy", CORPUS_HTML_CSP);
  headers.set("Strict-Transport-Security", CORPUS_HSTS);
  if (!headers.get("X-Content-Type-Options")) headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.get("X-Frame-Options")) headers.set("X-Frame-Options", "DENY");
  if (!headers.get("Referrer-Policy")) headers.set("Referrer-Policy", "no-referrer");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
