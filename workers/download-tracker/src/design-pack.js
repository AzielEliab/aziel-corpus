/**
 * Cap-7 design+content packs for download-to-mesh-nodes.
 * azcorpus / azlibrary / sister-hub designs do NOT resolve to Plane A hubs.
 * Packs are pull-only cold copies. Upload token never writes these names.
 * Author: Aziel Eliab only. No visible 15:20 identity-lock chrome.
 */
import { createHash } from "node:crypto";
import { HOST } from "./runtime-copy.js";
import { publicSearchCard, readPackedIndex } from "./library-index.js";
import {
  AUTHOR,
  CAP7_DESIGNS,
  HONESTY,
  MIRAGEGRID_AZ_GENERATOR,
  NO_FAN_PHRASE,
  NO_FAN_SPEC,
  PLANE_A,
  PLANE_A_HUBS,
} from "./ai-surface.js";
import {
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_RULE,
  CITE_RULE,
  LOCKSET_ID,
  LOCKSET_TIP,
  SURVIVE_RULE,
  survivalCiteFields,
} from "./ingest-receipt.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
      ...corsHeaders(),
    },
  });
}

export function designBySlug(raw) {
  const slug = String(raw || "").trim().toLowerCase();
  return CAP7_DESIGNS.find((d) => d.slug === slug) || null;
}

function contentCards(packed, shelf) {
  const rows = packed && Array.isArray(packed.records) ? packed.records : [];
  return rows
    .filter((row) => !shelf || String(row.library || row.shelf || "").toLowerCase() === shelf)
    .map(publicSearchCard)
    .filter(Boolean)
    .map((card) => ({
      record_id: card.record_id,
      title: card.title,
      library: card.library,
      content_sha256: card.content_sha256 || "",
      chain_tip: card.chain_tip || "",
      href: card.href,
      download_hash: card.content_sha256 ? HOST + "/v1/docs/" + card.content_sha256 + "/download" : "",
    }));
}

export function designPackDoc(design, packed) {
  const cards = design.shelf ? contentCards(packed, design.shelf) : [];
  const indexSha = packed && packed.index_sha256 ? packed.index_sha256 : "";
  const pack = {
    spec: "CAP-7-DESIGN-PACK-1.0",
    kind: "design+content-pack",
    slug: design.slug,
    mesh_name: design.slug,
    author: AUTHOR,
    identity: AUTHOR,
    plane: "mesh-design",
    cite_plane: PLANE_A,
    icann: false,
    public_icann: false,
    live_public_dns: false,
    resolves_to_plane_a_hub: false,
    does_not_resolve_to: design.does_not_resolve_to,
    plane_a_hub: design.plane_a_hub,
    plane_a_path: design.plane_a_path,
    plane_a_hubs_are_themselves: true,
    upload_token_writes_this_name: false,
    upload_token_hub_azlibrary_only: true,
    live_write: false,
    pull_only: true,
    design: {
      slug: design.slug,
      kind: design.kind,
      shelf: design.shelf,
      note: design.note,
      surfaces: design.shelf
        ? {
            browse: design.plane_a_path,
            ingest_hub_only: design.shelf === "aziel" ? "/v1/operator/library-ingest" : "/v1/ingest",
            download_hash: "/v1/docs/{hash}/download",
          }
        : { browse: design.plane_a_path, cite_only: true },
    },
    content: {
      source: "packed library:index:v1 (hashes + titles; no PDF bodies)",
      index_sha256: indexSha,
      lockset_id: LOCKSET_ID,
      lockset_tip: LOCKSET_TIP,
      count: cards.length,
      records: cards,
    },
    cite_rule: CITE_RULE,
    survive_rule: SURVIVE_RULE,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    cross_network_survival_rule: CROSS_NETWORK_SURVIVAL_RULE,
    ...survivalCiteFields(),
    no_fan: NO_FAN_SPEC,
    no_fan_phrase: NO_FAN_PHRASE,
    honesty: HONESTY,
    download: HOST + "/v1/design-pack/" + design.slug,
    bridge: HOST + "/bridge.json",
    doi: null,
    license: "Apache-2.0",
  };
  pack.pack_sha256 = createHash("sha256").update(JSON.stringify({
    slug: pack.slug,
    index_sha256: indexSha,
    count: cards.length,
    records: cards.map((c) => c.content_sha256 || c.record_id),
  })).digest("hex");
  return pack;
}

export function designPackIndex() {
  return {
    ok: true,
    spec: "CAP-7-DESIGN-PACK-1.0",
    author: AUTHOR,
    identity: AUTHOR,
    plane: PLANE_A,
    kind: "design-pack-index",
    note:
      "Download-to-mesh-nodes. Cap-7 names are designs. They do not resolve to Plane A hubs. "
      + "Upload token still only writes live azlibrary on the hub.",
    packs: CAP7_DESIGNS.map((d) => ({
      slug: d.slug,
      href: HOST + "/v1/design-pack/" + d.slug,
      plane_a_hub: d.plane_a_hub,
      does_not_resolve_to: d.does_not_resolve_to,
      shelf: d.shelf,
    })),
    plane_a_hubs: PLANE_A_HUBS,
    bridge: HOST + "/bridge.json",
    miragegrid_az_generator: MIRAGEGRID_AZ_GENERATOR,
    honesty: HONESTY,
    ...survivalCiteFields(),
  };
}

export async function handleDesignPackApi(request, url, env) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (request.method === "OPTIONS" && (path === "/v1/design-pack" || path.startsWith("/v1/design-pack/"))) {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (path === "/v1/design-pack" && (request.method === "GET" || request.method === "HEAD")) {
    const res = json(designPackIndex());
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  const m = path.match(/^\/v1\/design-pack\/([^/]+)$/);
  if (m && (request.method === "GET" || request.method === "HEAD")) {
    const design = designBySlug(decodeURIComponent(m[1]));
    if (!design) {
      return json({
        error: "unknown design pack",
        known: CAP7_DESIGNS.map((d) => d.slug),
        note: "Mesh names are designs, not ICANN. Plane A hubs stay themselves.",
        author: AUTHOR,
      }, 404);
    }
    let packed = { records: [], index_sha256: "" };
    try {
      packed = await readPackedIndex(env);
    } catch {
      packed = { records: [], index_sha256: "" };
    }
    const res = json(designPackDoc(design, packed));
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  return null;
}
