import test from "node:test";
import assert from "node:assert/strict";
import { applyHtmlSecurity, CORPUS_HTML_CSP, CORPUS_HSTS } from "./html-security.js";

test("site HTML gets runtime-style headers and keeps inline scripts allowed", () => {
  const html = "<!doctype html><html><body><script>document.body.dataset.ok=\"1\"</script><video src=\"/film/aziel-corpus-the-record.mp4\"></video></body></html>";
  const res = applyHtmlSecurity(new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  assert.equal(res.headers.get("Strict-Transport-Security"), CORPUS_HSTS);
  assert.equal(res.headers.get("Strict-Transport-Security"), "max-age=31536000; includeSubDomains");
  assert.equal(res.headers.get("Content-Security-Policy"), CORPUS_HTML_CSP);
  assert.match(CORPUS_HTML_CSP, /script-src 'unsafe-inline'/);
  assert.match(CORPUS_HTML_CSP, /frame-ancestors 'none'/);
  assert.match(CORPUS_HTML_CSP, /media-src 'self'/);
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("X-Frame-Options"), "DENY");
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
});

test("untrusted library HTML keeps CSP sandbox", () => {
  const res = applyHtmlSecurity(new Response("<p>file</p>", {
    headers: { "Content-Type": "text/html", "Content-Security-Policy": "sandbox" },
  }));
  assert.equal(res.headers.get("Content-Security-Policy"), "sandbox");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Strict-Transport-Security"), CORPUS_HSTS);
});

test("JSON responses are left alone", () => {
  const res = applyHtmlSecurity(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  assert.equal(res.headers.get("Content-Security-Policy"), null);
  assert.equal(res.headers.get("Strict-Transport-Security"), null);
});
