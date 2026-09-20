/**
 * Shared human-UI explore chips. Gazetteer stays background-only.
 * Author: Aziel Eliab only.
 */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Public explore doors. Keep Gazetteer off chrome. */
export const EXPLORE_LINKS = Object.freeze([
  Object.freeze({ href: "/", label: "Search" }),
  Object.freeze({ href: "/aziel-library", label: "Aziel Library" }),
  Object.freeze({ href: "/corpus", label: "Corpus" }),
  Object.freeze({ href: "/upload", label: "Upload" }),
  Object.freeze({ href: "/tree", label: "Tree" }),
  Object.freeze({ href: "/map", label: "Map" }),
  Object.freeze({ href: "/historical", label: "Historical" }),
  Object.freeze({ href: "/forensics", label: "Forensics" }),
  Object.freeze({ href: "/receipts", label: "Receipts" }),
]);

export function exploreRowHtml(current = "") {
  const here = String(current || "");
  const chips = EXPLORE_LINKS.map((item) => {
    const on = item.href === here ? " on" : "";
    return `<a class="chip${on}" href="${esc(item.href)}">${esc(item.label)}</a>`;
  }).join("");
  return `<nav class="explore-row" aria-label="Explore the library">${chips}</nav>`;
}

/** First-screen start doors. Agents live in the homepage footer tab, not this grid. */
export function startPathsHtml() {
  return `<div class="start-paths" aria-label="How to use this library">
<div class="start-card"><strong>Browse</strong><p>Open <a href="/aziel-library">Aziel Library</a> or <a href="/corpus">Corpus</a>. Tap a card to read or download.</p></div>
<div class="start-card"><strong>Upload</strong><p><a href="/upload">Upload a file</a> to Corpus. Anyone may file. Title required. No account required.</p></div>
<div class="start-card"><strong>Explore</strong><p>See groups on <a href="/tree">Tree</a>, places on <a href="/map">Map</a>, or scans on <a href="/forensics">Forensics</a>.</p></div>
</div>`;
}

/** Homepage-only footer tab. Machine routes stay /llms.txt, /mcp, /mcp.json. */
export function agentsTabHtml() {
  return `<nav class="agents-tab" aria-label="Agents"><a href="/llms.txt" title="Agent and MCP discovery">Agents</a></nav>`;
}
