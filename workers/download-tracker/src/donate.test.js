import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  donateBody,
  donateHtml,
  donateTouchesStorage,
  handleDonate,
  publishedNetworks,
  walletUri,
  DONATE_NETWORKS,
  DONATE_SPEC,
  DONATE_SISTER,
} from "./donate.js";
import { donateQrPng, handleDonateQr, isDonateQrPath, DONATE_QR_FILES } from "./donate-qr.js";
import { SOFTWARE_EXTRAS } from "./software-catalog.js";
import { softwareBody } from "./ui.js";
import worker from "./index.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|10\.5281\/zenodo|support my custody/i;
const HERE = dirname(fileURLToPath(import.meta.url));
const PNG_DIR = join(HERE, "../public/donate");

const RAILS = {
  bitcoin: "bc1q8cg7hmgmu7x9yaja8j249np0vt84d4y8duugr7",
  ethereum: "0x29b386022e3968cf8dBFCE59569b49680184B23b",
  litecoin: "LWuqPjMCFtLHvoBaQL4m8QtnxbXSDftVNs",
  xrp: "rLc3jZJbgEU1wBGwTFtgyq8bpayQE15K7b",
  dogecoin: "DQ4go4iLPfNXDWim4KptTh3565sFCVrCyp",
  solana: "6BZNXxEvcZf1CgkWYojKoWUPCxCcNLbDKYRPfaN465gj",
  tron: "TJXb1YhZ9pAYsEW6UKUAzxFUzH6Tzcacyy",
};

const QR_FILES = {
  bitcoin: "btc.png",
  ethereum: "eth.png",
  litecoin: "ltc.png",
  xrp: "xrp.png",
  dogecoin: "doge.png",
  solana: "sol.png",
  tron: "trx.png",
};

function forbiddenEnv(extra = {}) {
  const boom = async () => {
    throw new Error("donate must not touch KV or D1");
  };
  return {
    DOWNLOADS: { get: boom, put: boom, list: boom },
    DB: { prepare() { throw new Error("donate must not touch D1"); } },
    FILES: { get: boom, put: boom },
    ...extra,
  };
}

test("AZL-DONATE-1.0 publishes Exodus rails as a static PNG-QR door", () => {
  const published = publishedNetworks(DONATE_NETWORKS);
  assert.equal(DONATE_SPEC, "AZL-DONATE-1.0");
  assert.equal(published.length, 7);
  assert.deepEqual(published.map((n) => n.id), ["bitcoin", "ethereum", "litecoin", "xrp", "dogecoin", "solana", "tron"]);
  assert.equal(DONATE_NETWORKS.some((n) => n.id === "lightning"), false);
  const html = donateBody();
  assert.match(html, /Nothing is free/);
  assert.match(html, /This work has no corporate backer\. No grant\. No product that unlocks when you pay/);
  assert.match(html, /Donations keep the work in contact with what does not need a sponsor/);
  assert.match(html, /You do not owe this/);
  assert.match(html, /Wrong chain is a loss/);
  assert.match(html, /The software remains free to run and fork\. Payment is not a key/);
  assert.match(html, /— Aziel/);
  assert.match(html, /AZL-DONATE-1\.0/);
  assert.match(html, /Not a catalog item/);
  assert.match(html, /No Worker KV/);
  assert.match(html, /donate-aziel">Aziel Eliab/);
  assert.match(html, /Send only on this network/);
  assert.equal((html.match(/Send only on this network\./g) || []).length, 7);
  assert.match(html, /No destination tag required/);
  assert.match(html, new RegExp(DONATE_SISTER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(html, /<svg/i);
  assert.doesNotMatch(html, /qrline|donate-qr-mark|stroke=/);
  for (const [id, addr] of Object.entries(RAILS)) {
    const net = published.find((n) => n.id === id);
    assert.ok(net, id);
    assert.equal(net.address, addr);
    const uri = walletUri(net);
    assert.equal(uri, net.scheme + ":" + addr);
    const png = donateQrPng(uri);
    assert.equal(png, "/assets/donate/" + QR_FILES[id]);
    assert.match(html, new RegExp(addr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp('href="' + uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
    assert.match(html, new RegExp('data-copy="' + addr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
    assert.match(html, new RegExp('data-uri="' + uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
    assert.match(html, new RegExp('src="' + png.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
    assert.match(html, new RegExp(`<img src="${png.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" width="180" height="180"`));
    const bytes = readFileSync(join(PNG_DIR, QR_FILES[id]));
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50);
    assert.equal(bytes[2], 0x4e);
    assert.equal(bytes[3], 0x47);
  }
  assert.match(html, />Copy</);
  assert.match(html, />Open in wallet</);
  assert.doesNotMatch(html, /Lightning/);
  assert.doesNotMatch(html, BANNED);
  assert.equal(donateTouchesStorage(forbiddenEnv()), false);
});

test("handleDonate never reads env and stays Aziel Eliab only", async () => {
  const res = handleDonate(new Request("https://www.azielcorpuslibrary.net/donate", { headers: { Accept: "text/html" } }));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Donate/);
  assert.match(html, /href="\/donate"/);
  assert.match(html, /donate-strip/);
  assert.match(html, /Nothing is free/);
  assert.match(html, /Aziel Eliab/);
  assert.match(html, /royal|#6b3fa0|Aziel Library/);
  assert.match(html, /How it's scored/);
  assert.match(html, /Software[\s\S]*How it's scored[\s\S]*Donate/);
  assert.match(html, /background:#fff/);
  assert.match(html, /width:180px/);
  assert.doesNotMatch(html, /<svg/i);
  assert.doesNotMatch(html, /qrline/);
  assert.doesNotMatch(html, BANNED);
});

test("GET /donate on the Worker does not touch KV", async () => {
  const res = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/donate", { headers: { Accept: "text/html" } }),
    forbiddenEnv(),
    {}
  );
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /AZL-DONATE-1\.0/);
  assert.match(html, /bc1q8cg7hmgmu7x9yaja8j249np0vt84d4y8duugr7/);
  assert.match(html, /TJXb1YhZ9pAYsEW6UKUAzxFUzH6Tzcacyy/);
  assert.match(html, /src="\/assets\/donate\/btc\.png"/);
  assert.match(donateHtml(), /Donate/);
});

test("donate QR PNGs are static assets and do not touch KV", async () => {
  const png = readFileSync(join(PNG_DIR, "btc.png"));
  const env = forbiddenEnv({
    ASSETS: {
      async fetch(req) {
        const path = new URL(req.url).pathname;
        if (path === "/donate/btc.png") return new Response(png, { status: 200, headers: { "Content-Type": "image/png", "Content-Length": String(png.length) } });
        return new Response(null, { status: 404 });
      },
    },
  });
  assert.equal(isDonateQrPath("/assets/donate/btc.png"), true);
  assert.equal(isDonateQrPath("/donate/trx.png"), true);
  assert.equal(isDonateQrPath("/donate"), false);
  assert.equal(Object.keys(DONATE_QR_FILES).join(","), "btc,eth,ltc,xrp,doge,sol,trx");
  const res = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/assets/donate/btc.png"),
    env,
    {}
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type") || "", /image\/png/);
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(body[0], 0x89);
  assert.equal(body[1], 0x50);
  const head = await handleDonateQr(
    new Request("https://www.azielcorpuslibrary.net/assets/donate/sol.png", { method: "HEAD" }),
    forbiddenEnv({
      ASSETS: {
        async fetch() {
          return new Response(readFileSync(join(PNG_DIR, "sol.png")), { status: 200 });
        },
      },
    })
  );
  assert.equal(head.status, 200);
});

test("Donate is a door, not a Software catalog item", () => {
  assert.equal(SOFTWARE_EXTRAS.some((p) => /donate/i.test(String(p.slug || p.name || ""))), false);
  const soft = softwareBody({
    products: [{ name: "aziel-runtime", slug: "aziel-runtime", version: "catalog", root: true, countLabel: "1 downloads", blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
    fetched: 1,
    downloadable: 1,
  });
  assert.doesNotMatch(soft, /data-slug="donate"/);
  assert.doesNotMatch(soft, /AZL-DONATE-1\.0/);
});
