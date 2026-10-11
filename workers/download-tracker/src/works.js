/**
 * Verified Aziel Eliab works catalog.
 * Curated nodes go on the home and about Person. The full list is machine-only.
 * Unverified DOI landing pages, caution notes, and third-party forks are omitted.
 */
import catalog from "./works-catalog.js";

export const AZ_TRIAD_ID = "https://www.azieleliab.com/#az-triad";
const PERSON_ID = "https://www.azieleliab.com/#aziel";

/** Design relationship only. No mesh-node, one-click, or integration-live claim. */
const TRIAD_SIDES = {
  "https://github.com/AzielEliab/azos":
    "AZ triad operating-system side: AZ-OS, a local ethical overlay, not a kernel.",
  "https://github.com/AzielEliab/aziel-runtime":
    "AZ triad MCP side: Aziel Runtime.",
  "https://aziel-runtime.vibelock.workers.dev/":
    "AZ triad MCP side: Aziel Runtime public endpoint.",
  "https://github.com/AzielEliab/azinterface":
    "AZ triad UI-software side: The AZInterface. White paper https://www.azielcorpuslibrary.net/record/AZDOC-EB7454682E74.",
  "https://www.azielcorpuslibrary.net/record/AZDOC-EB7454682E74":
    "AZ triad UI-software side: The AZInterface white paper.",
};

export function triadSideNote(url) {
  return TRIAD_SIDES[url] || "";
}

export function azTriadNode() {
  return {
    "@type": "CreativeWork",
    "@id": AZ_TRIAD_ID,
    name: "AZ triad: AZ-OS, Aziel Runtime, The AZInterface",
    description: "One system with three sides: the operating-system layer (AZ-OS), the MCP runtime (Aziel Runtime), and the UI software (The AZInterface). Design relationship only.",
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    hasPart: [
      {
        "@type": "SoftwareSourceCode",
        name: "AZ-OS",
        url: "https://github.com/AzielEliab/azos",
        applicationCategory: "operating-system side",
        description: "Operating-system side of the AZ triad. Local ethical overlay. Not a kernel.",
      },
      {
        "@type": "SoftwareSourceCode",
        name: "Aziel Runtime",
        url: "https://github.com/AzielEliab/aziel-runtime",
        applicationCategory: "MCP side",
        description: "MCP side of the AZ triad. https://github.com/AzielEliab/aziel-runtime. Public endpoint https://aziel-runtime.vibelock.workers.dev/. Glama https://glama.ai/mcp/servers/AzielEliab/aziel-runtime.",
      },
      {
        "@type": "SoftwareSourceCode",
        name: "The AZInterface",
        url: "https://github.com/AzielEliab/azinterface",
        applicationCategory: "UI-software side",
        description: "UI-software side of the AZ triad. White paper https://www.azielcorpuslibrary.net/record/AZDOC-EB7454682E74.",
      },
    ],
  };
}

function schemaNode(item, triad) {
  const node = {
    "@type": item.type || "CreativeWork",
    name: item.name,
    url: item.url,
  };
  const note = triad ? triadSideNote(item.url) : "";
  if (item.description || note) node.description = [item.description, note].filter(Boolean).join(" ");
  if (note) node.isPartOf = { "@id": AZ_TRIAD_ID };
  return node;
}

function citeItem(item) {
  const note = triadSideNote(item.url);
  const row = {
    name: item.name,
    url: item.url,
    description: [item.description || "", note].filter(Boolean).join(" "),
    type: item.type || "CreativeWork",
    category: item.category || "",
  };
  if (note) row.isPartOf = AZ_TRIAD_ID;
  return row;
}

/** ~30–60 featured works for Person workExample. Pass triad to attach the AZ triad. */
export function curatedWorkNodes(opts) {
  const triad = !!(opts && opts.triad);
  const nodes = catalog.curated.map((item) => schemaNode(item, triad));
  if (triad) nodes.push(azTriadNode());
  return nodes;
}

/** Full verified works list for cite.json, llms.txt, and /works.json. */
export function fullWorks() {
  return catalog.works.map(citeItem);
}

/** Directory listings. Machine files only. Not sameAs. Not workExample. */
export function workListings() {
  return catalog.listings.map((item) => ({
    ...citeItem(item),
    platform: item.platform || "",
  }));
}

export function worksJson() {
  return {
    "@context": "https://schema.org",
    person_id: catalog.person_id,
    name: "Aziel Eliab works",
    note: catalog.note,
    az_triad: azTriadNode(),
    works: fullWorks(),
    listings: workListings(),
  };
}

export function worksLlmsBlock() {
  const lines = [
    "## Works (verified catalog)",
    "",
    "Person @id: " + catalog.person_id,
    "Full list: https://www.azielcorpuslibrary.net/works.json",
    "Curated works are on the homepage Person workExample. Other pages reference the Person @id.",
    "Unverified DOI landing pages are omitted. Listings stay in this machine file and are not sameAs.",
    "",
    "AZ triad (" + AZ_TRIAD_ID + "): one system with three sides. Design relationship only.",
    "- Operating-system side: AZ-OS https://github.com/AzielEliab/azos — local ethical overlay, not a kernel.",
    "- MCP side: Aziel Runtime https://github.com/AzielEliab/aziel-runtime — public endpoint https://aziel-runtime.vibelock.workers.dev/ — Glama https://glama.ai/mcp/servers/AzielEliab/aziel-runtime",
    "- UI-software side: The AZInterface https://github.com/AzielEliab/azinterface — white paper https://www.azielcorpuslibrary.net/record/AZDOC-EB7454682E74",
    "",
  ];
  let cat = "";
  for (const work of catalog.works) {
    if (work.category !== cat) {
      cat = work.category;
      lines.push("### " + cat, "");
    }
    const note = triadSideNote(work.url);
    lines.push("- " + work.name + ": " + work.url + (note ? " — " + note : ""));
  }
  lines.push("", "### listings (machine cite only; not sameAs)", "");
  for (const item of catalog.listings) {
    lines.push("- " + item.name + ": " + item.url);
  }
  lines.push("");
  return lines.join("\n");
}
