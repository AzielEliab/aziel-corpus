/**
 * Film theater for GET /. This document is the only front page.
 * Assets are the pilot theater files (film, poster, grain, og), hosted here.
 * Enter navigates to the library hub at /search. The hub is not mounted under this page.
 * Author: Aziel Eliab.
 */
import { CANON_HOST, HUB_PERSON_ID, websiteNode } from "./seo.js";
import { personNode } from "./identity.js";

export const LIBRARY_HUB_PATH = "/search";
export const FILM_MP4_PATH = "/film/aziel-corpus-the-record.mp4";
export const FILM_POSTER_PATH = "/film/corpus-poster.jpg";
export const FILM_GRAIN_PATH = "/film/grain.png";
export const FILM_OG_PATH = "/film/og.jpg";
export const FILM_SRC = FILM_MP4_PATH + "?v=1";
export const FILM_TITLE = "Aziel Corpus Library";
export const FILM_DESCRIPTION =
  "What matters is the record. Not the name. A short film for Aziel Corpus Library. The public identity is the work.";

const LIBRARY_QUERY_KEYS = ["q", "lib", "sort", "domain", "subject", "keyword", "author", "offset", "received"];

const HASH_TO_HUB = {
  "upload-anonymous": LIBRARY_HUB_PATH + "#upload-anonymous",
  signup: LIBRARY_HUB_PATH + "#signup",
};

/** Library filters on / belong on the hub. Bare / stays the film. */
export function libraryHubRedirect(url) {
  const u = typeof url === "string" ? new URL(url, CANON_HOST) : url;
  const path = String(u.pathname || "/").replace(/\/+$/, "") || "/";
  if (path !== "/") return "";
  const keep = new URLSearchParams();
  for (const key of LIBRARY_QUERY_KEYS) {
    for (const value of u.searchParams.getAll(key)) {
      if (String(value).trim()) keep.append(key, value);
    }
  }
  if (![...keep.keys()].length) return "";
  return LIBRARY_HUB_PATH + "?" + keep.toString();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export const THEATER_CSS = `
.theater{background:radial-gradient(80% 50% at 50% -10%,#303a5873,#0000 60%),#07090f;min-height:100dvh;position:relative;overflow:hidden;color:#f3ead8}
.theater .grain{pointer-events:none;z-index:1;opacity:.09;mix-blend-mode:overlay;background-image:url(${FILM_GRAIN_PATH});background-size:160px 160px;position:absolute;inset:0}
.theater .mast{letter-spacing:.22em;text-transform:uppercase;color:#e6d4b5;align-items:baseline;gap:1.25rem;padding:1.1rem 1.4rem .2rem;font-size:.72rem;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:flex;position:relative;z-index:2}
.theater .mast-dim{color:#e6d4b58c}
.theater .mast-door{color:#b0f0c4;letter-spacing:.28em;margin-left:auto}
.theater .stage-wrap{padding:.85rem 1.1rem .2rem;position:relative;z-index:2}
.theater .stage{aspect-ratio:16/9;background:#000;width:min(1100px,100%);margin:0 auto;position:relative;box-shadow:0 30px 80px #0000008c}
.theater .film{object-fit:cover;background:#000;width:100%;height:100%;display:block}
.theater .tick{z-index:3;pointer-events:none;border-style:solid;border-color:#e6d4b5d9;width:18px;height:18px;position:absolute}
.theater .tl{border-width:1px 0 0 1px;top:8px;left:8px}
.theater .tr{border-width:1px 1px 0 0;top:8px;right:8px}
.theater .bl{border-width:0 0 1px 1px;bottom:8px;left:8px}
.theater .br{border-width:0 1px 1px 0;bottom:8px;right:8px}
.theater .gate{z-index:2;place-items:center;display:grid;position:absolute;inset:0 0 2.75rem 0}
.theater .gate-still{object-fit:cover;filter:saturate(.85) contrast(1.05);width:100%;height:100%;position:absolute;inset:0}
.theater .gate-veil{background:linear-gradient(#07090f59 0%,#07090f47 58%,#07090fc7 100%);position:absolute;inset:0}
.theater .gate-copy{text-align:center;max-width:38rem;padding:1.2rem;position:relative}
.theater .eyebrow{letter-spacing:.28em;text-transform:uppercase;color:#b0f0c4;margin:0 0 .85rem;font-size:.68rem;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.theater .gate-copy h1{letter-spacing:-.02em;color:#f3ead8;margin:0;font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;font-size:clamp(2.1rem,5vw,4.1rem);font-weight:500;line-height:.95}
.theater .deck{color:#e6d4b5e0;margin:.85rem 0 1.4rem;font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;font-size:clamp(1.15rem,2.4vw,1.7rem);font-style:italic}
.theater .enter{appearance:none;display:inline-block;color:#07090f;letter-spacing:.24em;text-transform:uppercase;background:#e6d4b5;border:0;padding:.72rem 1.4rem;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.72rem;text-decoration:none}
.theater .enter:hover{background:#b0f0c4;color:#07090f}
.theater .enter:focus-visible{outline-offset:3px;outline:1px solid #b0f0c4}
.theater .stage.is-playing .gate-still,.theater .stage.is-playing .gate-veil{display:none}
.theater .stage.is-playing .gate{inset:auto 0 2.75rem 0;background:linear-gradient(#0000,#07090fcc)}
.theater .film-fallback{color:#f3ead8;padding:1rem}
.theater .colophon{width:min(820px,100% - 2.2rem);margin:1.6rem auto 3.2rem;position:relative;z-index:2}
.theater .thesis{color:#f0e6d2;margin:0 0 .85rem;font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;font-size:clamp(1.35rem,2.5vw,1.85rem);line-height:1.25}
.theater .thesis.soft{color:#e6d4b5c7;margin-bottom:1.6rem;font-style:italic}
.theater .facts{border-top:1px solid #e6d4b538;grid-template-columns:1fr;gap:.9rem;margin:0 0 1.5rem;padding-top:1.1rem;display:grid}
.theater .facts dt{letter-spacing:.22em;text-transform:uppercase;color:#b0f0c4;margin-bottom:.35rem;font-size:.64rem;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.theater .facts dd{color:#e6d4b5d1;margin:0;font-size:.78rem;line-height:1.45}
.theater .doors{flex-wrap:wrap;gap:.7rem 1.2rem;display:flex;list-style:none;margin:0;padding:0}
.theater .doors a{color:#e6d4b5;letter-spacing:.04em;border-bottom:1px solid #e6d4b566;padding-bottom:.12rem;font-size:.75rem;text-decoration:none}
.theater .doors a:hover{color:#b0f0c4;border-color:#b0f0c4}
.theater .close-line{color:#e6d4b59e;margin:1.6rem 0 0;font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;font-size:1.15rem;font-style:italic}
.theater .download{margin:1.4rem 0 0}
.theater .download a{color:#b0f0c4;letter-spacing:.18em;text-transform:uppercase;border-bottom:1px solid #b0f0c473;padding-bottom:.12rem;font-size:.72rem;text-decoration:none}
.theater .download a:hover{color:#e6d4b5;border-color:#e6d4b5}
html,body{margin:0;background:#07090f}
@media (width>=740px){.theater .facts{grid-template-columns:1fr 1fr 1fr;gap:1.25rem}}
@media (width<=720px){
  .theater .mast{letter-spacing:.14em;gap:.7rem;padding:.85rem .9rem .15rem;font-size:.62rem}
  .theater .stage{aspect-ratio:auto;box-shadow:none;background:transparent}
  .theater .film{aspect-ratio:16/9;height:auto}
  .theater .tick{display:none}
  .theater .gate{display:block;position:static;inset:auto;background:none}
  .theater .gate-still,.theater .gate-veil{display:none}
  .theater .gate-copy{padding:.95rem .15rem .1rem}
  .theater .gate-copy h1{font-size:2rem}
  .theater .deck{margin:.35rem 0 .9rem}
  .theater .stage.is-playing .gate{position:static;background:none}
}
`;

function filmGateHtml() {
  return `<main class="theater">
  <div class="grain" aria-hidden="true"></div>
  <header class="mast"><span>Aziel Corpus Library</span><span class="mast-dim">public master</span><span class="mast-door">the record</span></header>
  <section class="stage-wrap"><div class="stage">
    <i class="tick tl"></i><i class="tick tr"></i><i class="tick bl"></i><i class="tick br"></i>
    <video class="film" poster="${FILM_POSTER_PATH}" controls playsinline preload="metadata" aria-label="Aziel Corpus Library film. The face is withheld. What matters is the record. Not the name. No caption track was published with this file.">
      <source src="${FILM_SRC}" type="video/mp4">
      <p class="film-fallback">This film file did not play. <a href="${FILM_SRC}" download="aziel-corpus-the-record.mp4">Download aziel-corpus-the-record.mp4</a>. No caption track was published with the file. The still is the poster.</p>
    </video>
    <div class="gate">
      <img src="${FILM_POSTER_PATH}" alt="" class="gate-still">
      <div class="gate-veil"></div>
      <div class="gate-copy">
        <p class="eyebrow">a film · the face withheld</p>
        <h1>What matters is the record.</h1>
        <p class="deck">Not the name.</p>
        <a class="enter" href="${LIBRARY_HUB_PATH}">Enter</a>
      </div>
    </div>
  </div></section>
  <section class="colophon">
    <p class="thesis">I do not ask you to believe a name. I ask you to read a record.</p>
    <p class="thesis soft">The public identity is the work. Opened without taking the speaker on faith.</p>
    <dl class="facts">
      <div><dt>What it is</dt><dd>The public master of the work. A record, not a face.</dd></div>
      <div><dt>Why</dt><dd>So the files can be read without taking a name on faith.</dd></div>
      <div><dt>Help</dt><dd>Ask Jeeves if you need help.</dd></div>
    </dl>
    <nav class="doors" aria-label="Film doors">
      <a href="${LIBRARY_HUB_PATH}">www.azielcorpuslibrary.net</a>
      <a href="/corpus">corpus</a>
      <a href="https://www.azieleliab.com/" target="_blank" rel="noreferrer">www.azieleliab.com</a>
    </nav>
    <p class="close-line">If the files hold, the name was never the point.</p>
    <p class="download"><a href="${FILM_SRC}" download="aziel-corpus-the-record.mp4">Download the film</a></p>
  </section>
</main>
<script>(function(){var v=document.querySelector(".theater video.film");if(!v)return;v.addEventListener("play",function(){var s=v.closest(".stage");if(s)s.classList.add("is-playing");});})();</script>`;
}

function theaterHashScript() {
  return (
    "<script>(function(){var map=" +
    JSON.stringify(HASH_TO_HUB) +
    ';var h=String(location.hash||"").replace(/^#/,"");if(map[h])location.replace(map[h]);})();</script>'
  );
}

function filmJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      personNode({ works: true }),
      websiteNode(),
      {
        "@type": "VideoObject",
        name: "What matters is the record.",
        description: FILM_DESCRIPTION,
        thumbnailUrl: CANON_HOST + FILM_POSTER_PATH,
        contentUrl: CANON_HOST + FILM_MP4_PATH,
        embedUrl: CANON_HOST + "/",
        author: { "@id": HUB_PERSON_ID },
        creator: { "@id": HUB_PERSON_ID },
      },
    ],
  };
}

/** Sole document for GET /. No library chrome, brandrow, or shelf HTML. */
export function filmTheaterHtml() {
  const canonical = CANON_HOST + "/";
  const image = CANON_HOST + FILM_OG_PATH;
  const ldOpen = "<" + "script type=\"application/ld+json\">";
  const ldClose = "</" + "script>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${theaterHashScript()}
<title>${esc(FILM_TITLE)}</title>
<meta name="description" content="${esc(FILM_DESCRIPTION)}">
<meta name="author" content="Aziel Eliab">
<meta name="theme-color" content="#07090f">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/sigil.png" type="image/png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(FILM_TITLE)}">
<meta property="og:title" content="${esc(FILM_TITLE)}">
<meta property="og:description" content="${esc(FILM_DESCRIPTION)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(FILM_TITLE)}">
<meta name="twitter:description" content="${esc(FILM_DESCRIPTION)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="preload" as="image" href="${FILM_POSTER_PATH}">
${ldOpen}${JSON.stringify(filmJsonLd())}${ldClose}
<style>${THEATER_CSS}</style>
</head>
<body>
${filmGateHtml()}
</body>
</html>`;
}
