/**
 * Cross-chain lattice hooks for AzielTether.
 * Author: Aziel Eliab.
 *
 * The live HTTPS site is NOT a mesh. Mesh/tether is downloadable software
 * plus Worker APIs for bootstrap. Survival interdependence with GodLock
 * and other Aziel software is via tether, not by turning the public site
 * into a mesh.
 */
export const LATTICE_SCHEMA = "aziel.lattice.anchor.v1";
export const LATTICE_NOTE =
  "Public HTTPS site is not a mesh. AzielTether carries this tip. Survival interdependence with GodLock and other Aziel software is via downloadable tether + Worker bootstrap APIs.";

export function latticeAnchorTip({
  record_id,
  library,
  content_sha256,
  ledger_entry_hash,
  structure,
  review,
  event = "verified_ingest",
  verified_utc,
} = {}) {
  const r = review || {};
  return {
    schema: LATTICE_SCHEMA,
    kind: "aziel-corpus." + String(event || "verified_ingest"),
    carrier: "AzielTether",
    author: "Aziel Eliab",
    record_id: record_id || null,
    library: library || null,
    content_sha256: content_sha256 || null,
    structure: {
      ok: !!(structure && structure.ok),
      file_count: Array.isArray(structure && structure.files) ? structure.files.length : 0,
    },
    spre: r.spre ? { pc: r.spre.pc, band: r.spre.band, limitation: r.spre.limitation } : null,
    clce: r.clce ? { triple: r.clce.triple, pairwise_avg: r.clce.pairwise_avg, advisory: true } : null,
    plr: r.plr ? { status: r.plr.status, lights: r.plr.lights } : null,
    triad: r.triad
      ? { combined: r.triad.combined, display: r.triad.display, ready: r.triad.ready, formula: r.triad.formula }
      : null,
    bayesian: r.bayesian
      ? { posterior: r.bayesian.posterior, unranked: true, note: r.bayesian.note }
      : null,
    quarantine: r.quarantine_status && r.quarantine_status !== "CLEAR" ? r.quarantine_status : null,
    ledger_entry_hash: ledger_entry_hash || null,
    verified_utc: verified_utc || new Date().toISOString(),
    note: LATTICE_NOTE,
  };
}
