/**
 * AZL-DONATE-1.0 payment-URI QR marks.
 * Solid black-on-white PNG. Encodes the payment URI, not a website.
 * Static assets under /assets/donate/*.png. No Worker KV.
 * Author: Aziel Eliab only.
 */
import { corsHeaders } from "./runtime.js";

export const DONATE_QR_PNG = {
  "bitcoin:bc1q8cg7hmgmu7x9yaja8j249np0vt84d4y8duugr7": "/assets/donate/btc.png",
  "ethereum:0x29b386022e3968cf8dBFCE59569b49680184B23b": "/assets/donate/eth.png",
  "litecoin:LWuqPjMCFtLHvoBaQL4m8QtnxbXSDftVNs": "/assets/donate/ltc.png",
  "xrp:rLc3jZJbgEU1wBGwTFtgyq8bpayQE15K7b": "/assets/donate/xrp.png",
  "dogecoin:DQ4go4iLPfNXDWim4KptTh3565sFCVrCyp": "/assets/donate/doge.png",
  "solana:6BZNXxEvcZf1CgkWYojKoWUPCxCcNLbDKYRPfaN465gj": "/assets/donate/sol.png",
  "tron:TJXb1YhZ9pAYsEW6UKUAzxFUzH6Tzcacyy": "/assets/donate/trx.png",
};

export const DONATE_QR_FILES = {
  btc: "donate/btc.png",
  eth: "donate/eth.png",
  ltc: "donate/ltc.png",
  xrp: "donate/xrp.png",
  doge: "donate/doge.png",
  sol: "donate/sol.png",
  trx: "donate/trx.png",
};

const DONATE_QR_PATH = /^\/(?:assets\/)?donate\/(btc|eth|ltc|xrp|doge|sol|trx)\.png$/;

export function donateQrPng(uri) {
  return DONATE_QR_PNG[String(uri || "")] || "";
}

export function isDonateQrPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return DONATE_QR_PATH.test(path);
}

export function donateQrTicker(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  const m = path.match(DONATE_QR_PATH);
  return m ? m[1] : "";
}

/** Serve a donate PNG from static assets. Does not read KV / D1 / FILES. */
export async function handleDonateQr(request, env) {
  const url = new URL(request.url);
  const ticker = donateQrTicker(url.pathname);
  const name = DONATE_QR_FILES[ticker] || "";
  const headers = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
    ...corsHeaders(),
  };
  const method = String((request && request.method) || "GET").toUpperCase();
  if (!name) return new Response(null, { status: 404, headers });
  if (!env || !env.ASSETS) return new Response(null, { status: 404, headers });
  const assetUrl = new URL("/" + name, request.url);
  const res = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!res.ok) return new Response(null, { status: res.status || 404, headers });
  const len = res.headers.get("Content-Length");
  if (len) headers["Content-Length"] = len;
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(res.body, { status: 200, headers });
}
