/**
 * AZL-DONATE-1.0 — canonical Donate door on the library origin.
 * Static island. Does not touch KV, D1, or Durable Objects.
 * Library is a shelf. Donate is a door, not a catalog item.
 * Rails are operator Exodus addresses pasted at publish.
 * QR encodes the payment URI, not a website. Solid black-on-white PNG <img>.
 * Identity in chrome: Aziel Eliab. Door signature: — Aziel.
 * Author: Aziel Eliab only. No legal name. No home. No custody-case copy.
 */
import { page } from "./ui.js";
import { corsHeaders } from "./runtime.js";
import { donateQrPng } from "./donate-qr.js";

export const DONATE_PATH = "/donate";
export const DONATE_SPEC = "AZL-DONATE-1.0";
export const AUTHOR = "Aziel Eliab";
export const DONATE_SISTER = "https://www.azieleliab.com/donate";

/** Published Exodus rails. Empty address stays unpublished. Do not invent wallets. */
export const DONATE_NETWORKS = [
  { id: "bitcoin", ticker: "BTC", label: "Bitcoin", scheme: "bitcoin", address: "bc1q8cg7hmgmu7x9yaja8j249np0vt84d4y8duugr7" },
  { id: "ethereum", ticker: "ETH", label: "Ethereum", scheme: "ethereum", address: "0x29b386022e3968cf8dBFCE59569b49680184B23b" },
  { id: "litecoin", ticker: "LTC", label: "Litecoin", scheme: "litecoin", address: "LWuqPjMCFtLHvoBaQL4m8QtnxbXSDftVNs" },
  { id: "xrp",
    schemeAlt: "ripple", ticker: "XRP", label: "XRP", scheme: "xrp", address: "rLc3jZJbgEU1wBGwTFtgyq8bpayQE15K7b", note: "No destination tag required." },
  { id: "dogecoin", ticker: "DOGE", label: "Dogecoin", scheme: "dogecoin", address: "DQ4go4iLPfNXDWim4KptTh3565sFCVrCyp" },
  { id: "solana", ticker: "SOL", label: "Solana", scheme: "solana", address: "6BZNXxEvcZf1CgkWYojKoWUPCxCcNLbDKYRPfaN465gj" },
  { id: "tron", ticker: "TRX", label: "TRON", scheme: "tron", address: "TJXb1YhZ9pAYsEW6UKUAzxFUzH6Tzcacyy" },
];

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function walletUri(network) {
  if (!network) return "";
  const addr = String(network.address || "").trim();
  const scheme = String(network.scheme || network.id || "").trim();
  if (!addr || !scheme) return "";
  return scheme + ":" + addr;
}

export function publishedNetworks(networks = DONATE_NETWORKS) {
  return (networks || []).filter((n) => n && String(n.address || "").trim());
}

function railCard(n) {
  const addr = String(n.address || "").trim();
  const uri = walletUri(n);
  const qr = donateQrPng(uri);
  const qrBox = qr
    ? `<figure class="donate-qr" data-uri="${esc(uri)}"><img src="${esc(qr)}" width="180" height="180" alt="${esc(n.label)} payment URI" decoding="async"><figcaption class="sr-only">${esc(uri)}</figcaption></figure>`
    : "";
  const extra = n.note ? `<p class="donate-extra">${esc(n.note)}</p>` : "";
  return (
    `<article class="card donate-rail" data-network="${esc(n.id)}">` +
    `<p class="donate-ticker">${esc(n.ticker || n.id)}</p>` +
    `<h3>${esc(n.label)}</h3>` +
    `<div class="donate-pair">` +
    `<code class="donate-addr">${esc(addr)}</code>` +
    qrBox +
    `</div>` +
    `<p class="donate-actions">` +
    `<button type="button" class="button" data-copy="${esc(addr)}">Copy</button>` +
    `<a class="button ghost" href="${esc(uri)}" data-open-wallet data-wallet-uri="${esc(uri)}" data-copy-addr="${esc(addr)}" rel="noopener noreferrer">Open in wallet</a>` +
    `</p>` +
    extra +
    `<p class="donate-net">Send only on this network.</p>` +
    `</article>`
  );
}

export function donateBody(networks = DONATE_NETWORKS) {
  const published = publishedNetworks(networks);
  const rails = published.length
    ? `<div class="donate-rails">${published.map(railCard).join("")}</div>`
    : `<div class="card"><p class="muted">Donation addresses are pasted by the operator at publish time. This page does not invent wallet addresses. Author <span class="donate-aziel">Aziel Eliab</span>.</p></div>`;
  return `<section class="hero donate-door">
<p class="pill">${esc(DONATE_SPEC)}</p>
<h1>Donate</h1>
<div class="card donate-prose">
<p>Nothing is free.</p>
<p>This work has no corporate backer. No grant. No product that unlocks when you pay. Compute, hosting, and time have a cost. If a door stays open it is because the bill was paid.</p>
<p>Donations keep the work in contact with what does not need a sponsor. They do not buy a vote, a feature, a name on a wall, or a quieter question.</p>
<p>You do not owe this. If the work is useful, you already know what to do.</p>
<p>Send only on the correct network. Double-check the address before you send. Wrong chain is a loss. There is no refund desk.</p>
<p>The software remains free to run and fork. Payment is not a key.</p>
<p class="donate-sign">— Aziel</p>
</div>
</section>
${rails}
<p class="wallet-hint">Open in wallet uses the standard payment URI your OS routes to an installed wallet (Exodus, MetaMask, Trust, Phantom, Coinbase, and peers). If Safari says the link is invalid, scan the QR inside your wallet — that path works for every wallet.</p>
<div class="card donate-meta">
<p>Static door. No Worker KV. Not a catalog item. The library is a shelf. Identity <span class="donate-aziel">Aziel Eliab</span>.</p>
<p class="muted">Same rails: <a href="${esc(DONATE_SISTER)}">azieleliab.com/donate</a>.</p>
</div>
<script>
(function(){
  document.querySelectorAll("[data-copy]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var t = btn.getAttribute("data-copy") || "";
      if (!t) return;
      var done = function(){
        var prev = btn.getAttribute("data-label") || btn.textContent;
        if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", prev);
        btn.textContent = "Copied";
        setTimeout(function(){ btn.textContent = btn.getAttribute("data-label") || "Copy"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done).catch(function(){
          try {
            var ta = document.createElement("textarea");
            ta.value = t;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            done();
          } catch (e) {}
        });
      }
    });
  });
})();
(function(){
  function copyText(t, done){
    if(!t){ if(done)done(); return; }
    var ok=function(){ if(done)done(); };
    var fail=function(){
      try{
        var ta=document.createElement("textarea");
        ta.value=t; ta.setAttribute("readonly","");
        ta.style.position="fixed"; ta.style.left="-9999px";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta); ok();
      }catch(e){}
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(ok).catch(fail);
    } else fail();
  }
  function flash(el, msg){
    var prev=el.getAttribute("data-label")||el.textContent;
    if(!el.getAttribute("data-label")) el.setAttribute("data-label", prev);
    el.textContent=msg;
    setTimeout(function(){ el.textContent=el.getAttribute("data-label")||prev; }, 2400);
  }
  /* Safari (iOS + desktop) often has no handler for coin schemes → "link not valid". */
  function safariLike(){
    var ua=navigator.userAgent||"";
    var iOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    var safari=/Safari/.test(ua)&&!/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Android/.test(ua);
    return iOS||safari;
  }
  document.addEventListener("click", function(e){
    var a=e.target.closest("[data-open-wallet]");
    if(!a) return;
    var uri=a.getAttribute("data-wallet-uri")||a.getAttribute("href")||"";
    var addr=a.getAttribute("data-copy-addr")||"";
    /* Seed clipboard with bare address — every wallet Send accepts paste. */
    copyText(addr);
    if(safariLike()){
      e.preventDefault();
      flash(a, "Address copied — scan QR in your wallet");
      return;
    }
    /* Optional alt scheme (e.g. ripple: alongside xrp:). */
    var alt=a.getAttribute("data-wallet-uri-alt")||"";
    if(alt && alt!==uri){
      try{
        var fr=document.createElement("iframe");
        fr.style.display="none";
        fr.src=alt;
        document.body.appendChild(fr);
        setTimeout(function(){ try{document.body.removeChild(fr);}catch(e){} }, 1500);
      }catch(e){}
    }
    /* Chrome/Firefox/Android: href navigates so Trust/MetaMask/Exodus/Phantom/Coinbase/etc. can claim it. */
    setTimeout(function(){
      if(!document.hidden) flash(a, "Scan QR if wallet did not open");
    }, 1600);
  }, true);
})();
</script>`;
}

export function donateHtml() {
  return page("Donate", donateBody(), { path: DONATE_PATH, kind: "donate" });
}

/** Serve donate without reading env.DOWNLOADS / env.DB / env.FILES. */
export function handleDonate(request) {
  const method = String((request && request.method) || "GET").toUpperCase();
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    ...corsHeaders(),
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(donateHtml(), { status: 200, headers });
}

export function donateTouchesStorage(env) {
  void env;
  return false;
}
