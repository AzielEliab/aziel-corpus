/**
 * Verified Aziel Eliab works catalog.
 * Curated nodes go on the home and about Person. The full list is machine-only.
 * Unverified DOI landing pages, caution notes, and third-party forks are omitted.
 */
import catalog from "./works-catalog.js";

function schemaNode(item) {
  const node = {
    "@type": item.type || "CreativeWork",
    name: item.name,
    url: item.url,
  };
  if (item.description) node.description = item.description;
  return node;
}

function citeItem(item) {
  return {
    name: item.name,
    url: item.url,
    description: item.description || "",
    type: item.type || "CreativeWork",
    category: item.category || "",
  };
}

/** ~30–60 featured works for Person workExample. */
export function curatedWorkNodes() {
  return catalog.curated.map(schemaNode);
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
  ];
  let cat = "";
  for (const work of catalog.works) {
    if (work.category !== cat) {
      cat = work.category;
      lines.push("### " + cat, "");
    }
    lines.push("- " + work.name + ": " + work.url);
  }
  lines.push("", "### listings (machine cite only; not sameAs)", "");
  for (const item of catalog.listings) {
    lines.push("- " + item.name + ": " + item.url);
  }
  lines.push("");
  return lines.join("\n");
}
