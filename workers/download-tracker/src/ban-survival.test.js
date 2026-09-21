import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  BAN_SURVIVAL_SPEC,
  RE_COLD_STORE_HOOK,
  SPORE_SPEC,
  CALLING_NAME_ALERT_PREFIX,
  MIRAGEGRID_APP,
  MIRAGEGRID_BRIDGE,
  MIRAGEGRID_SHUFFLE,
  PERSON_ID,
  SURVIVAL_LOCAL,
  SURVIVAL_LOCAL_V1,
  SURVIVAL_ORIGIN,
  SURVIVAL_SEO_CACHE_CONTROL,
  SURVIVAL_TTL_S,
  callingNameAlertLine,
  destSurvivalPath,
  handleSurvivalHub,
  isSurvivalDoc,
  isSurvivalHubPath,
  isSurvivalSeoPath,
  platformsLine,
  projectSurvival,
  sporeLine,
  survivalCiteFields,
  survivalFallbackCite,
  survivalLlmsBlock,
  survivalWhoIsBlock,
} from "./ban-survival.js";
import { handleRuntimeApi } from "./runtime.js";
import { citeDoc, llmsDoc, aiTxt, humansTxt, robotsTxt } from "./crawl.js";
import { whoIsTxt } from "./identity.js";
import { bridgeDoc } from "./ai-surface.js";

const VISIBLE_1520 = /15:20/;

test("fallback cites the pull and does not invent LIVE doors", () => {
  const fb = survivalFallbackCite();
  assert.equal(fb.spec, BAN_SURVIVAL_SPEC);
  assert.equal(fb.author, AUTHOR);
  assert.equal(fb.person_id, PERSON_ID);
  assert.equal(fb.prefer_pull, true);
  assert.equal(fb.pulled, false);
  assert.equal(fb.mutual_backup, true);
  assert.equal(fb.shelves_backup_for, "live-front-loss");
  assert.equal(fb.live_doors_backup_for, "cold-shelf-death");
  assert.equal(fb.live_doors, null);
  assert.equal(fb.platforms.all_live, null);
  assert.equal(fb.calling_name.alert, null);
  assert.equal(fb.calling_name.alert_prefix, CALLING_NAME_ALERT_PREFIX);
  assert.equal(fb.cap7_aznet.resolves_to_hub, false);
  assert.equal(fb.cap7_aznet.app_worker, MIRAGEGRID_APP);
  assert.equal(fb.visible_1520_chrome, false);
  assert.equal(fb.software_runtime_ssot, true);
  assert.equal(fb.local, SURVIVAL_LOCAL);
  assert.equal(fb.local_v1, SURVIVAL_LOCAL_V1);
  assert.equal(fb.spore_spec, SPORE_SPEC);
  assert.equal(fb.spore_replaces_cold_shelves, false);
  assert.equal(fb.spore.last_resort, true);
  assert.equal(fb.spore.replaces_cold_shelves, false);
  assert.equal(fb.spore.cold_shelves_intact, true);
  assert.equal(fb.spore.honesty.shelves_not_marked_failed, true);
  assert.equal(fb.re_cold_store.hook, RE_COLD_STORE_HOOK);
  assert.equal(fb.re_cold_store.active, false);
  assert.equal(fb.re_cold_store.shelves_failed, false);
  assert.equal(fb.re_cold_store.shelves_intact, true);
  assert.deepEqual(fb.re_cold_store.destinations, []);
  const shelvesLayer = fb.survival_stack.find((row) => row.id === "cold-shelves");
  assert.equal(shelvesLayer.failed, false);
  assert.equal(shelvesLayer.replaced, false);
  assert.match(fb.note, /short TTL/);
  assert.match(fb.note, /Same FragGate door/);
  assert.equal(isSurvivalDoc(fb), true);
  assert.equal(isSurvivalDoc({}), false);
});

test("projectSurvival keeps pulled mutual backup, platforms, Cap-7, calling-name", () => {
  const projected = projectSurvival({
    spec: BAN_SURVIVAL_SPEC,
    author: AUTHOR,
    person_id: PERSON_ID,
    mutual_backup: true,
    shelves_backup_for: "death-by-ban",
    live_doors_backup_for: "cold-shelf-death",
    live_doors: [{ id: "library-runtime", origin: "https://www.azielcorpuslibrary.net/runtime", status: "live", via: "service-binding" }],
    platforms: {
      spec: "BAN-PLATFORMS-1.0",
      all_live: true,
      native_app_store: false,
      platforms: [
        { id: "windows", label: "Windows", live: true },
        { id: "mac", label: "Mac", live: true },
        { id: "linux", label: "Linux", live: true },
        { id: "android", label: "Android", live: true },
        { id: "ios", label: "iPhone", live: true },
      ],
    },
    calling_name: {
      calling_name: "Aziel Runtime",
      alert: null,
      identity: AUTHOR,
      identity_unchanged: true,
    },
    cap7_aznet: {
      factory: "miragegrid",
      resolves_to_hub: false,
      hosted_endpoints: { status: "slot" },
      shuffle: { spec: "CAP7-SHUFFLE-1.0", layout: "live", public_worker_shuffle: "slot", hardcoded_single_host: false },
    },
    shelf_backup: { role: "death-by-ban-backup", is_live_door: false, shelves: "https://www.azielcorpuslibrary.net/shelves" },
    spore_spec: SPORE_SPEC,
    spore_role: "failsafe",
    spore: {
      spec: SPORE_SPEC,
      last_resort: true,
      replaces_cold_shelves: false,
      cold_shelves_intact: true,
      faces: ["pause", "preserve", "wait", "physical-wipe-only"],
      re_cold_store: {
        hook: RE_COLD_STORE_HOOK,
        active: false,
        shelves_failed: false,
        shelves_intact: true,
        destinations: [],
      },
    },
    re_cold_store: {
      hook: RE_COLD_STORE_HOOK,
      active: false,
      shelves_failed: false,
      shelves_intact: true,
      destinations: [],
    },
    survival_stack: [
      { layer: 1, id: "live-fronts", spec: BAN_SURVIVAL_SPEC, role: "failover" },
      { layer: 2, id: "cold-shelves", spec: "COLD-MULTI-SHELF-1.0", role: "mutual-backup", replaced: false, failed: false },
      { layer: 3, id: "spore", spec: SPORE_SPEC, role: "failsafe", last_resort: true, replaces_cold_shelves: false },
    ],
    visible_1520: false,
    lie_to_survive: false,
  });
  assert.equal(projected.pulled, true);
  assert.equal(projected.mutual_backup, true);
  assert.equal(projected.platforms.all_live, true);
  assert.deepEqual(projected.platforms.ids, ["windows", "mac", "linux", "android", "ios"]);
  assert.match(platformsLine(projected), /Platforms all LIVE/);
  assert.match(platformsLine(projected), /Windows, Mac, Linux, Android, iPhone/);
  assert.equal(projected.cap7_aznet.resolves_to_hub, false);
  assert.equal(projected.cap7_aznet.hosted_status, "slot");
  assert.equal(projected.calling_name.alert, null);
  assert.equal(projected.spore_spec, SPORE_SPEC);
  assert.equal(projected.spore.last_resort, true);
  assert.equal(projected.spore.replaces_cold_shelves, false);
  assert.equal(projected.spore.honesty.shelves_not_marked_failed, true);
  assert.equal(projected.re_cold_store.hook, RE_COLD_STORE_HOOK);
  assert.equal(projected.re_cold_store.shelves_failed, false);
  assert.equal(projected.re_cold_store.active, false);
  assert.equal(projected.survival_stack.find((row) => row.id === "cold-shelves").failed, false);
  assert.match(sporeLine(projected), /SPORE-1\.0 last-resort/);
  assert.match(sporeLine(projected), /Shelves stay intact/);
  assert.match(sporeLine(projected), /RE-COLD-STORE/);
  assert.match(callingNameAlertLine(projected), /new name alert:/);
  assert.doesNotMatch(callingNameAlertLine(projected), /Whitestone/);
  const alerted = projectSurvival({
    spec: BAN_SURVIVAL_SPEC,
    calling_name: { calling_name: "Eliab Runtime", alert: "Eliab Runtime", identity: AUTHOR },
    platforms: { all_live: true, platforms: [] },
  });
  assert.equal(callingNameAlertLine(alerted), CALLING_NAME_ALERT_PREFIX + "Eliab Runtime");
  const forcedFail = projectSurvival({
    spec: BAN_SURVIVAL_SPEC,
    spore: { last_resort: true, replaces_cold_shelves: true, cold_shelves_intact: false },
    re_cold_store: { active: true, shelves_failed: true, shelves_intact: false, destinations: ["https://example.invalid"] },
    survival_stack: [{ layer: 2, id: "cold-shelves", spec: "COLD-MULTI-SHELF-1.0", failed: true, replaced: true }],
  });
  assert.equal(forcedFail.spore.replaces_cold_shelves, false);
  assert.equal(forcedFail.re_cold_store.shelves_failed, false);
  assert.equal(forcedFail.survival_stack[0].failed, false);
  assert.equal(forcedFail.survival_stack[0].replaced, false);
});

test("machine LLM/SEO surfaces cite pull + Cap-7 shuffle + platforms + calling-name", () => {
  const cite = citeDoc();
  assert.equal(cite.ban_survival, BAN_SURVIVAL_SPEC);
  assert.equal(cite.ban_survival_pull, true);
  assert.equal(cite.ban_survival_ttl_s, SURVIVAL_TTL_S);
  assert.equal(cite.survival, SURVIVAL_ORIGIN);
  assert.equal(cite.survival_local, SURVIVAL_LOCAL);
  assert.equal(cite.survival_local_v1, SURVIVAL_LOCAL_V1);
  assert.equal(cite.mutual_backup, true);
  assert.equal(cite.cap7_aznet.resolves_to_hub, false);
  assert.equal(cite.miragegrid_bridge, MIRAGEGRID_BRIDGE);
  assert.equal(cite.miragegrid_shuffle, MIRAGEGRID_SHUFFLE);
  assert.equal(cite.visible_1520_chrome, false);
  assert.equal(cite.person_id, PERSON_ID);
  assert.equal(cite.calling_name_alert_prefix, CALLING_NAME_ALERT_PREFIX);
  assert.equal(cite.software_runtime_ssot, true);
  assert.equal(cite.spore_spec, SPORE_SPEC);
  assert.equal(cite.spore_replaces_cold_shelves, false);
  assert.equal(cite.spore.last_resort, true);
  assert.equal(cite.re_cold_store.hook, RE_COLD_STORE_HOOK);
  assert.equal(cite.re_cold_store.shelves_failed, false);
  assert.equal(cite.re_cold_store.active, false);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /BAN-SURVIVAL-1\.0/);
  assert.match(llms, /cold shelves and live fronts/);
  assert.match(llms, /SPORE-1\.0 last-resort/);
  assert.match(llms, /RE-COLD-STORE/);
  assert.match(llms, /Shelves stay intact/);
  assert.match(llms, /v1\/survival/);
  assert.match(llms, /short TTL/);
  assert.match(llms, /miragegrid\.vibelock\.workers\.dev/);
  assert.match(llms, /resolves_to_hub: false/);
  assert.match(llms, /new name alert:/);
  assert.match(llms, /platforms\.all_live|Platforms all LIVE/);
  assert.match(llms, /Worker SSoT/);
  assert.match(llms, /No visible identity-lock chrome/);
  assert.match(llms, /Lamb Lens/);
  assert.doesNotMatch(survivalLlmsBlock(), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(survivalCiteFields()), VISIBLE_1520);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /BAN-SURVIVAL-1\.0/);
  assert.match(ai, /Allow: \/runtime\/survival/);
  assert.match(ai, /miragegrid\.vibelock\.workers\.dev/);

  const humans = humansTxt();
  assert.match(humans, /BAN-SURVIVAL-1\.0/);
  assert.match(humans, /v1\/survival/);

  const robots = robotsTxt();
  assert.match(robots, /Allow: \/survival/);
  assert.match(robots, /Allow: \/v1\/survival/);
  assert.match(robots, /Allow: \/runtime\/survival/);
  assert.match(robots, /Allow: \/runtime\/v1\/survival/);
  assert.match(ai, /Allow: \/survival/);
  assert.match(llms, /azielcorpuslibrary\.net\/survival/);
});

test("who-is is machine-only BAN-SURVIVAL awareness without Whitestone or extra 15:20 chrome", () => {
  const who = whoIsTxt();
  assert.match(who, /BAN-SURVIVAL-1\.0/);
  assert.match(who, /SPORE-1\.0 last-resort/);
  assert.match(who, /RE-COLD-STORE/);
  assert.match(who, /Shelves stay intact/);
  assert.match(who, /cold shelves and live fronts/);
  assert.match(who, /new name alert:/);
  assert.match(who, /miragegrid\.vibelock\.workers\.dev/);
  assert.match(who, /platforms\.all_live/);
  assert.match(who, /Windows, Mac, Linux, Android, and iPhone are LIVE/);
  assert.match(who, /#aziel/);
  assert.match(who, /Lamb Lens/);
  assert.doesNotMatch(who, /Whitestone/);
  assert.match(survivalWhoIsBlock(), /No visible 15:20 chrome/);
  assert.equal(isSurvivalSeoPath("/cite.json"), true);
  assert.equal(isSurvivalSeoPath("/who-is"), true);
  assert.equal(isSurvivalSeoPath("/who"), false);
  assert.match(SURVIVAL_SEO_CACHE_CONTROL, /s-maxage=60/);
});

test("bridge.json cites LIVE MirageGrid app Worker without claiming hub alias", () => {
  const doc = bridgeDoc();
  assert.equal(doc.miragegrid.app_worker, MIRAGEGRID_APP);
  assert.equal(doc.miragegrid.bridge, MIRAGEGRID_BRIDGE);
  assert.equal(doc.miragegrid.shuffle, MIRAGEGRID_SHUFFLE);
  assert.equal(doc.miragegrid.bridge_live, true);
  assert.equal(doc.miragegrid.resolves_to_hub, false);
  assert.equal(doc.resolves_to_hub, false);
  assert.match(JSON.stringify(doc.miragegrid), /prefer.*survival|cap7_aznet/i);
  assert.doesNotMatch(JSON.stringify(doc), VISIBLE_1520);
});

const HOST = "https://www.azielcorpuslibrary.net";

function sotDoc() {
  return {
    spec: BAN_SURVIVAL_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    person_id: PERSON_ID,
    mode: "LIVE",
    second_door: false,
    fraggate_is_the_door: true,
    mutual_backup: true,
    live_doors: [{ id: "library-runtime", origin: HOST + "/runtime", via: "service-binding", status: "live" }],
    platforms: { spec: "BAN-PLATFORMS-1.0", all_live: true },
    calling_name: { calling_name: "Aziel Runtime", identity: AUTHOR, identity_unchanged: true },
    lie_to_survive: false,
    visible_1520: false,
  };
}

function survivalEnv(doc, destWant) {
  return {
    AZIEL_RUNTIME: {
      fetch: async (req) => {
        const dest = new URL(req.url);
        if (destWant) assert.equal(dest.pathname, destWant);
        return new Response(JSON.stringify(doc), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=120" },
        });
      },
    },
  };
}

test("hub /survival and /v1/survival pull runtime SoT; not a second door; no 15:20 chrome", async () => {
  assert.equal(isSurvivalHubPath("/survival"), true);
  assert.equal(isSurvivalHubPath("/v1/survival"), true);
  assert.equal(isSurvivalHubPath("/runtime/survival"), false);
  assert.equal(isSurvivalHubPath("/v1/mesh"), false);
  assert.equal(destSurvivalPath("/survival", ""), "/survival");
  assert.equal(destSurvivalPath("/v1/survival", "?x=1"), "/v1/survival?x=1");
  assert.equal(destSurvivalPath("/runtime/survival", ""), null);

  const sot = sotDoc();
  const env = survivalEnv(sot, "/survival");
  const res = await handleSurvivalHub(
    new Request(HOST + "/survival", { headers: { Accept: "application/json" } }),
    new URL(HOST + "/survival"),
    env
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") || "", /s-maxage=60/);
  assert.equal(res.headers.get("x-aziel-survival-via"), "service-binding");
  assert.equal(res.headers.get("x-aziel-survival-local"), SURVIVAL_LOCAL);
  const body = await res.json();
  assert.equal(body.spec, BAN_SURVIVAL_SPEC);
  assert.equal(body.mode, "LIVE");
  assert.equal(body.second_door, false);
  assert.equal(body.fraggate_is_the_door, true);
  assert.equal(body.author, AUTHOR);
  assert.equal(body.person_id, PERSON_ID);
  assert.doesNotMatch(JSON.stringify(body), VISIBLE_1520);

  const v1 = await handleSurvivalHub(
    new Request(HOST + "/v1/survival"),
    new URL(HOST + "/v1/survival"),
    survivalEnv(sot, "/v1/survival")
  );
  assert.equal(v1.status, 200);
  assert.equal((await v1.json()).spec, BAN_SURVIVAL_SPEC);

  const head = await handleSurvivalHub(
    new Request(HOST + "/survival", { method: "HEAD" }),
    new URL(HOST + "/survival"),
    survivalEnv(sot, "/survival")
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const post = await handleSurvivalHub(
    new Request(HOST + "/survival", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    new URL(HOST + "/survival"),
    env
  );
  assert.equal(post.status, 405);
  const refused = await post.json();
  assert.equal(refused.second_door, false);
  assert.equal(refused.fraggate_is_the_door, true);
  assert.match(refused.hint, /fraggate\/call/);
});

test("hub /survival fail-soft cites the pull and does not invent LIVE doors", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await handleSurvivalHub(
    new Request(HOST + "/survival"),
    new URL(HOST + "/survival"),
    env
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.spec, BAN_SURVIVAL_SPEC);
  assert.equal(body.kind, "hub_cite");
  assert.equal(body.second_door, false);
  assert.equal(body.fraggate_is_the_door, true);
  assert.equal(body.pulled, false);
  assert.equal(body.live_doors, null);
  assert.equal(body.local, SURVIVAL_LOCAL);
  assert.equal(body.spore_spec, SPORE_SPEC);
  assert.equal(body.spore.last_resort, true);
  assert.equal(body.re_cold_store.shelves_failed, false);
  assert.equal(body.visible_1520_chrome, false);
  assert.doesNotMatch(JSON.stringify(body), VISIBLE_1520);

  const viaApi = await handleRuntimeApi(
    new Request(HOST + "/v1/survival"),
    new URL(HOST + "/v1/survival"),
    env
  );
  assert.equal(viaApi.status, 200);
  assert.equal((await viaApi.json()).spec, BAN_SURVIVAL_SPEC);

  const spec = await (await handleRuntimeApi(
    new Request(HOST + "/openapi.json"),
    new URL(HOST + "/openapi.json"),
    {}
  )).json();
  assert.ok(spec.paths["/survival"]);
  assert.ok(spec.paths["/v1/survival"]);
  assert.ok(spec.paths["/runtime/survival"]);
  assert.match(spec.paths["/survival"].get.summary, /BAN-SURVIVAL-1\.0/);
  assert.match(spec.paths["/survival"].get.summary, /Person @id/);
  assert.doesNotMatch(JSON.stringify(spec.paths["/survival"]), VISIBLE_1520);
});
