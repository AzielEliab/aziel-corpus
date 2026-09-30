import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILM_GRAIN_PATH,
  FILM_MP4_PATH,
  FILM_OG_PATH,
  FILM_POSTER_PATH,
  LIBRARY_HUB_PATH,
  filmTheaterHtml,
  libraryHubRedirect,
} from "./film.js";

const root = dirname(fileURLToPath(import.meta.url));
const BANNED = /Collin Horton|legalName|homeLocation|familyName|grok\.me|__grok/;

test("film theater document is the front door only", () => {
  const html = filmTheaterHtml();
  assert.match(html, /<main class="theater">/);
  assert.match(html, /What matters is the record\./);
  assert.match(html, /Not the name\./);
  assert.match(html, /I do not ask you to believe a name\./);
  assert.match(html, /If the files hold, the name was never the point\./);
  assert.match(html, new RegExp('class="enter" href="' + LIBRARY_HUB_PATH + '"'));
  assert.match(html, new RegExp('href="' + LIBRARY_HUB_PATH + '">www\\.azielcorpuslibrary\\.net'));
  assert.match(html, /href="\/corpus">corpus/);
  assert.match(html, /href="https:\/\/www\.azieleliab\.com\/"/);
  assert.match(html, new RegExp(FILM_MP4_PATH.replace(/\//g, "\\/")));
  assert.match(html, new RegExp(FILM_POSTER_PATH.replace(/\//g, "\\/")));
  assert.match(html, new RegExp(FILM_GRAIN_PATH.replace(/\//g, "\\/")));
  assert.match(html, new RegExp(FILM_OG_PATH.replace(/\//g, "\\/")));
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(html, /class="brandrow"/);
  assert.doesNotMatch(html, /class="wrap"/);
  assert.doesNotMatch(html, /sigilNav/);
  assert.doesNotMatch(html, /Search the libraries/);
  assert.doesNotMatch(html, /class="soft-card"/);
  assert.doesNotMatch(html, /Softwares/);
  assert.doesNotMatch(html, BANNED);
  assert.equal(html.split("<main").length - 1, 1);
});

test("library queries on / redirect to the search hub", () => {
  assert.equal(libraryHubRedirect("https://www.azielcorpuslibrary.net/"), "");
  assert.equal(libraryHubRedirect("https://www.azielcorpuslibrary.net/?"), "");
  assert.equal(
    libraryHubRedirect("https://www.azielcorpuslibrary.net/?q=Florence"),
    "/search?q=Florence"
  );
  assert.equal(
    libraryHubRedirect("https://www.azielcorpuslibrary.net/?domain=Law&subject=Record"),
    "/search?domain=Law&subject=Record"
  );
  assert.equal(
    libraryHubRedirect("https://www.azielcorpuslibrary.net/?received=held"),
    "/search?received=held"
  );
  assert.equal(libraryHubRedirect("https://www.azielcorpuslibrary.net/search?q=Florence"), "");
  assert.equal(libraryHubRedirect("https://www.azielcorpuslibrary.net/corpus"), "");
});

test("pilot film assets are hosted beside the Worker", async () => {
  const pub = join(root, "../public");
  for (const rel of ["film/aziel-corpus-the-record.mp4", "film/corpus-poster.jpg", "film/grain.png", "film/og.jpg"]) {
    await access(join(pub, rel));
  }
});

test("GET / is the film and GET /search keeps the library hub", async () => {
  const { default: worker } = await import("./index.js");
  let views = 0;
  const env = {
    DOWNLOADS: {
      async get() { return null; },
      async put(key) { if (String(key).includes("views")) views += 1; },
      async list() { throw new Error("no list"); },
    },
  };
  const home = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/", { headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type") || "", /text\/html/);
  const theater = await home.text();
  assert.match(theater, /<main class="theater">/);
  assert.match(theater, /class="enter" href="\/search"/);
  assert.doesNotMatch(theater, /class="brandrow"/);
  assert.doesNotMatch(theater, /Search the libraries/);
  assert.doesNotMatch(theater, /class="soft-card"/);
  assert.ok(views >= 1);

  const head = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/", { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const moved = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/?q=Florence", { headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(moved.status, 302);
  assert.equal(moved.headers.get("location"), "/search?q=Florence");

  const search = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/search", { headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(search.status, 200);
  const hub = await search.text();
  assert.match(hub, /<h1>Search the libraries<\/h1>/);
  assert.match(hub, /class="brandrow nav1"/);
  assert.match(hub, /href="\/search">Search</);
  assert.match(hub, /action="\/search"/);
  assert.doesNotMatch(hub, /<main class="theater">/);
  assert.doesNotMatch(hub, /class="enter"/);
});
