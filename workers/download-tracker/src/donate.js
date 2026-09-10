/**
 * RL-WP-0.1 donation tab. Static island. Does not touch KV, D1, or Durable Objects.
 * Addresses are operator paste at publish — this module does not invent wallets.
 * Author: Aziel Eliab only. No legal name. No home. No custody-case copy.
 */
import { page } from "./ui.js";
import { corsHeaders } from "./runtime.js";

export const DONATE_PATH = "/donate";
export const AUTHOR = "Aziel Eliab";

/** Operator pastes at publish. Empty strings stay unpublished. Do not invent addresses. */
export const DONATE_NETWORKS = [
  { id: "bitcoin", label: "Bitcoin", address: "" },
  { id: "lightning", label: "Lightning", address: "" },
  { id: "ethereum", label: "Ethereum", address: "" },
  { id: "solana", label: "Solana", address: "" },
];

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function publishedNetworks(networks = DONATE_NETWORKS) {
  return (networks || []).filter((n) => n && String(n.address || "").trim());
}

export function donateBody(networks = DONATE_NETWORKS) {
  const published = publishedNetworks(networks);
  const cards = published.length
    ? published
        .map((n) => {
          const addr = String(n.address || "").trim();
          return (
            `<div class="card"><h3>${esc(n.label)}</h3>` +
            `<p><code class="donate-addr">${esc(addr)}</code></p>` +
            `<p><button type="button" class="button ghost" data-copy="${esc(addr)}">Copy</button></p></div>`
          );
        })
        .join("")
    : `<div class="card"><p class="muted">Donation addresses are pasted by the operator at publish time. This page does not invent wallet addresses. Author Aziel Eliab.</p></div>`;
  return `<section class="hero"><h1>Donate</h1>
<p class="muted">Optional public-plane support for the library cycle cap. Static tab — no Worker KV, no D1, no Durable Objects. Receipt note is optional and stays on this page.</p>
<p>Networks the operator already controls: Bitcoin, Lightning, Ethereum, Solana. Identity Aziel Eliab only.</p>
</section>
${cards}
<div class="card">
<h3>Optional receipt note</h3>
<p class="muted">If a donor sends date, network, and tx hash, they can keep a one-line note here. It is not stored on this Worker.</p>
<label class="facet-label" for="donate-note">Note</label>
<textarea id="donate-note" maxlength="400" placeholder="date · network · tx hash (optional)"></textarea>
</div>
<p class="muted">Not a Node Gate. Not a VPN. Not untraceable-origin hosting. Author Aziel Eliab.</p>
<script>
(function(){
  document.querySelectorAll("[data-copy]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var t = btn.getAttribute("data-copy") || "";
      if (navigator.clipboard && t) navigator.clipboard.writeText(t);
    });
  });
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
    "Cache-Control": "public, max-age=86400",
    ...corsHeaders(),
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(donateHtml(), { status: 200, headers });
}

export function donateTouchesStorage(env) {
  void env;
  return false;
}
