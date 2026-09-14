/**
 * AZindex pointer to runtime REDLINE-2026-09-14.
 * Corpus cites the law; it does not copy the runtime door map.
 * Author: Aziel Eliab only.
 */
export const AUTHOR = "Aziel Eliab";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const REDLINE_SPEC = "REDLINE-2026-09-14";
export const REDLINE_DATE = "2026-09-14";
export const REDLINE_LAW =
  "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/REDLINE-2026-09-14.md";
export const REDLINE_RUNTIME_CITE = "https://aziel-runtime.vibelock.workers.dev/cite.json";

/** Runtime design one-liner. Pointer — executable law stays on aziel-runtime. */
export const REDLINE_ONE_LINE =
  "LIVE law — runtime redline: map public doors; refuse anonymous mutate; operator token header-only; "
  + "Growth-ON Allow (no GPTBot Disallow); Cloudflare TLS cite; Cap-7 design_of + resolves_to_hub false; "
  + "attack sims refuse";

/** Attack-sim refuse one-liner (REDLINE §3). */
export const ATTACK_SIM_REFUSE =
  "Attack sims refuse: AZ-GEN as registrar; GET /v1/mesh enabling radios; Cap-7 resolves_to_hub:true; "
  + "invented Zenodo DOI; operator token in query/body/MCP args.";

export function redlineCite() {
  return {
    spec: REDLINE_SPEC,
    name: "Runtime redline protocols",
    author: AUTHOR,
    identity: AUTHOR,
    date: REDLINE_DATE,
    pointer: true,
    law: REDLINE_LAW,
    runtime_cite: REDLINE_RUNTIME_CITE,
    software_tab: false,
    fraggate_slug: false,
    growth_on: true,
    gptbot_disallow: false,
    person_id: PERSON_ID,
    person_id_stable: true,
    azindex_hub_crawl_unchanged: true,
    one_line: REDLINE_ONE_LINE,
    attack_sim_refuse: ATTACK_SIM_REFUSE,
    cap7: {
      spec: "CAP-7",
      design_of: "hub_designs",
      inherit: "designs",
      resolves_to_hub: false,
    },
  };
}

export function redlineCiteFields() {
  return {
    redline: redlineCite(),
    redline_spec: REDLINE_SPEC,
    attack_sim_refuse: ATTACK_SIM_REFUSE,
  };
}
