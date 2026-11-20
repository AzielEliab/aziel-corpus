/**
 * Canonical live public ecosystem. Verified live 2026-11-19.
 * These ten origins are the doors. Never a *-download-tracker host.
 * Never thefurnaceisntfree.com.
 * Author: Aziel Eliab.
 */

export const LIVE_PUBLIC_VERIFIED = "2026-11-19";
export const DOORS_PATH = "/doors";
export const AI_WELL_KNOWN_PATH = "/.well-known/ai.txt";
export const AZIEL_RUNTIME_GLAMA = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const TRADES_GLAMA = "https://glama.ai/mcp/servers/AzielEliab/trades-runtime";
const LIBRARY = "https://www.azielcorpuslibrary.net";

export const LIVE_PUBLIC_DOORS = Object.freeze([
  Object.freeze({
    id: "identity",
    name: "Aziel Eliab",
    label: "Aziel Eliab",
    role: "Identity Hub",
    href: "https://www.azieleliab.com/",
  }),
  Object.freeze({
    id: "corpus",
    name: "Aziel Corpus Library",
    label: "Aziel Corpus Library",
    role: "Public MASTER library",
    href: LIBRARY + "/",
  }),
  Object.freeze({
    id: "godlock",
    name: "GodLock",
    label: "GodLock",
    role: "GodLock",
    href: "https://godlock.uk/",
  }),
  Object.freeze({
    id: "hedidntjump",
    name: "He Didn't Jump",
    label: "He Didn't Jump",
    role: "Marion Zioncheck Archive",
    href: "https://hedidntjump.com/",
    note: "He Didn't Jump is a handle, not a Live Node.",
    footerTitle: "Marion Zioncheck Archive. A handle, not a Live Node.",
  }),
  Object.freeze({
    id: "furnace",
    name: "Furnace Isn't Free",
    label: "Furnace Isn't Free",
    role: "Furnace Isn't Free",
    href: "https://furnaceisntfree.com/",
    note: "The Furnace Isn't Free is a handle, not a Live Node.",
    footerTitle: "A handle, not a Live Node.",
  }),
  Object.freeze({
    id: "unseal",
    name: "Time to Unseal the Book",
    label: "Time to Unseal the Book",
    role: "Time to Unseal the Book",
    href: "https://timetounsealthebook.net/",
    note: "TimeToUnsealTheBook is a handle, not a Live Node.",
    footerTitle: "A handle, not a Live Node.",
  }),
  Object.freeze({
    id: "whitestone",
    name: "Whitestone",
    label: "Whitestone",
    role: "Live pro se web app",
    href: "https://whitestone.vibelock.workers.dev/",
    footerTitle: "Live pro se web app.",
  }),
  Object.freeze({
    id: "aziel-runtime",
    name: "Aziel Runtime",
    label: "Aziel Runtime",
    role: "MCP / Softwares",
    href: "https://aziel-runtime.vibelock.workers.dev/",
    glama: AZIEL_RUNTIME_GLAMA,
    footerTitle: "MCP / Softwares.",
  }),
  Object.freeze({
    id: "trades-runtime",
    name: "Trades Runtime",
    label: "Trades Runtime",
    role: "Public MCP runtime",
    href: "https://trades-runtime.vibelock.workers.dev/",
    glama: TRADES_GLAMA,
    live_backends: false,
    pilot_started: false,
    note: "Public MCP runtime. live_backends false. pilot_started false.",
    footerTitle: "Public MCP runtime. live_backends false. pilot_started false.",
  }),
  Object.freeze({
    id: "miragegrid",
    name: "MirageGrid",
    label: "MirageGrid",
    role: "Cap-7 mesh DNS factory Worker",
    href: "https://miragegrid.vibelock.workers.dev/",
    mesh_only: true,
    public_icann: false,
    icann_registrar: false,
    note: "Mesh-only. public_icann: false. Not an ICANN registrar.",
    footerTitle: "Mesh-only. public_icann: false. Not an ICANN registrar.",
  }),
]);

export function livePublicDoor(id) {
  return LIVE_PUBLIC_DOORS.find((row) => row.id === id) || null;
}

export function livePublicDoorsDoc() {
  return {
    verified: LIVE_PUBLIC_VERIFIED,
    count: LIVE_PUBLIC_DOORS.length,
    path: DOORS_PATH,
    url: LIBRARY + DOORS_PATH,
    ai_txt: LIBRARY + "/ai.txt",
    ai_well_known: LIBRARY + AI_WELL_KNOWN_PATH,
    download_tracker_doors: false,
    thefurnaceisntfree: false,
    doors: LIVE_PUBLIC_DOORS.map((row) => {
      const out = {
        id: row.id,
        name: row.name,
        role: row.role,
        href: row.href,
      };
      if (row.glama) out.glama = row.glama;
      if (row.note) out.note = row.note;
      if (row.mesh_only === true) out.mesh_only = true;
      if (row.public_icann === false) out.public_icann = false;
      if (row.icann_registrar === false) out.icann_registrar = false;
      if (row.live_backends === false) out.live_backends = false;
      if (row.pilot_started === false) out.pilot_started = false;
      return out;
    }),
  };
}

/** Shared crawler block for llms.txt, ai.txt, and humans.txt. */
export function livePublicDoorsPlain() {
  const lines = LIVE_PUBLIC_DOORS.map((row) => {
    let line = "- " + row.name + ": " + row.href + " — " + row.role;
    if (row.glama) line += ". Glama " + row.glama;
    if (row.note) line += ". " + row.note;
    if (row.id === "trades-runtime") line += " Do not cite an unshipped live backend or a started pilot.";
    return line;
  });
  return "Live public ecosystem (verified " + LIVE_PUBLIC_VERIFIED + ", " + LIVE_PUBLIC_DOORS.length + " doors):\n"
    + lines.join("\n") + "\n"
    + "Doors page: " + LIBRARY + DOORS_PATH + "\n"
    + "AI policy: " + LIBRARY + "/ai.txt\n"
    + "AI policy alias: " + LIBRARY + AI_WELL_KNOWN_PATH + "\n"
    + "Door hrefs are the ten origins above. A download tracker host is not a door. The furnace door is https://furnaceisntfree.com/ only.\n";
}
