import { isOperator } from "./library.js";
import { shelfScoreState } from "./zsolver.js";
import {
  headMeta,
  jsonLdScript,
  defaultDescription,
  documentTitle,
  ABOUT_PATH,
  ABOUT_NAV_LABEL,
  GODLOCK_IDENTITY,
  HEDIDNTJUMP_HOME,
  HEDIDNTJUMP_LABEL,
  ECOSYSTEM_HEADING,
  ECOSYSTEM_LINKS,
} from "./seo.js";
import { jeevesFabHtml } from "./jeeves.js";
import { WHO_IS_AZIEL_ELIAB } from "./identity.js";
import {
  RUNTIME_VERSION,
  RUNTIME_ORIGIN,
  RUNTIME_KERNEL,
  RUNTIME_GITHUB,
  RUNTIME_LIVE_COUNT,
  RUNTIME_LOCAL_ONLY,
  RUNTIME_ABSTRACT,
  RUNTIME_TITLE,
  RUNTIME_CHANGELOG,
  runtimeChip,
  softwareChip,
  resolveRuntimeVersion,
  runtimeDistributionLinks,
  runtimeLaunchNote,
  RUNTIME_GIT_SHA,
  RUNTIME_VERSION_ID,
  RUNTIME_SOT_BRANCH,
  LAMB_LENS_PATH,
  AI_CLIENTS,
} from "./runtime-copy.js";
import { ingestReceiptHead } from "./ingest-receipt.js";
import {
  AZCOHERENCE,
  AZCOHERENCE_WORKER_HOME,
  AZCOHERENCE_GITHUB,
} from "./azcoherence.js";
import { isChromeAuthorByline, isMachineFileTag, visibleTagEntries } from "./visible-tags.js";
import { exploreRowHtml, startPathsHtml, agentsTabHtml } from "./explore-nav.js";
import { statbarClockScript } from "./mesh.js";

/** Master UI chrome from Aziel Digital Library v2.7.0 webapp. Author: Aziel Eliab. */
export const CSS = `
:root{
  --bg:#12100c;--paper:#1b1712;--ink:#efe6d6;--muted:#a89880;--line:#7a6c5c;
  --gold:#c9a227;--btn:#c9a227;--card:#19150f;--cream:#221c14;
  --royal:#6b3fa0;--royal-deep:#4a2870;--aziel:#6b3fa0;--royal-ink:#c4a6e8;
  --yes:#7dcea0;--no:#e07a7a;--rev:#e0b15a;
  --field:#16130f;--wash:#2a241c;--focus:#ffe7a3;
  color-scheme:dark
}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px;box-shadow:0 0 0 3px var(--bg)}
input,select,textarea,button,a,summary{scroll-margin-bottom:88px}
::placeholder{color:var(--muted);opacity:1}
html,body{background:var(--bg);color:var(--ink);overflow-x:hidden;overflow-y:auto;height:auto;min-height:100%;max-width:100%}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;line-height:1.5;overflow-wrap:anywhere;word-break:break-word}
.wrap{max-width:920px;margin:auto;padding:8px 22px 72px;min-width:0;overflow-x:hidden}
.sitehead{background:var(--bg);max-width:100%;overflow-x:hidden}
.sitehead-inner{max-width:920px;margin:auto;padding:28px 22px 0;min-width:0;max-width:100%;position:relative}
.brandrow{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:6px;min-height:48px;min-width:0;max-width:100%}
.brandmark-link,.sigil-nav-btn{display:flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;padding:0;line-height:0;order:-1;background:transparent;border:0;border-radius:12px;cursor:pointer;color:inherit;position:relative;z-index:46}
.sigil-nav-btn[aria-expanded="true"]{box-shadow:0 0 0 2px var(--gold)}
.sigil-nav-scrim{position:fixed;inset:0;z-index:44;background:#00000088;margin:0;border:0;padding:0;cursor:pointer}
.sigil-nav-scrim[hidden]{display:none!important}
.brandmark{width:40px;height:40px;border-radius:10px;object-fit:cover;flex:0 0 40px;box-shadow:0 0 0 1px #0003,0 0 0 1px var(--gold)}
.brand{font-size:23px;font-weight:800;letter-spacing:-.02em;line-height:1.2;color:var(--ink);text-decoration:none}
a.brand{color:var(--ink)}
a.brand:hover{color:var(--gold)}
.authbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto}
.authbar a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;color:var(--gold)}
.authbar a.button{color:#14110a}
.authbar a.auth-link{background:transparent;border:1px solid var(--line);color:var(--gold)}
.authbar .auth-who{color:var(--royal);font-weight:700}
.statbar{display:flex;align-items:center;flex:0 0 auto;margin-left:8px;min-width:0;max-width:100%}
.stat-counter{display:inline-flex;align-items:center;flex-wrap:wrap;cursor:default;user-select:text;max-width:100%;row-gap:4px}
.stat-group{display:inline-flex;align-items:baseline;white-space:nowrap;max-width:100%}
.stat-counter .stat-num{color:var(--ink);font-weight:750;margin-left:0;font-variant-numeric:tabular-nums}
.stat-counter .stat-lbl{color:var(--muted);font-weight:650;margin-left:6px}
.stat-counter .stat-sep{color:var(--muted);margin:0 8px;font-weight:650}
.stat-counter .stat-slash{color:var(--muted);margin:0 1px;font-weight:650}
.nav1,.nav2,.top,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.nav1{margin-bottom:6px}
.nav2{margin:0;gap:2px;position:fixed;left:0;top:0;bottom:0;z-index:45;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;background:var(--paper);border:0;border-right:1px solid var(--gold);border-radius:0 16px 16px 0;padding:76px 12px 24px;width:min(360px,86vw);min-width:min(260px,86vw);max-width:86vw;height:100vh;max-height:100vh;overflow:auto;overflow-x:hidden;box-shadow:12px 0 40px #00000088}
.nav2[hidden]{display:none!important}
.nav2 .sep{display:none}
.ingest-verify-form{margin:12px 0}
.donate-strip{margin:0 0 22px;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--paper);color:var(--muted);font-size:14px}
.donate-strip p{margin:0}
.donate-strip a{font-weight:700}
.donate-aziel{color:var(--royal);font-weight:700}
.donate-door h1{color:var(--gold)}
.donate-prose p{margin:0 0 14px}
.donate-sign{color:var(--gold);font-weight:800;letter-spacing:-.01em}
.donate-rails{display:grid;grid-template-columns:1fr;gap:14px;margin:18px 0}
.donate-rail{margin:0}
.donate-rail h3{margin:0 0 10px;color:var(--gold)}
.donate-ticker{margin:0 0 4px;color:var(--gold);font-size:12px;font-weight:750;letter-spacing:.04em}
.donate-pair{display:flex;flex-wrap:nowrap;gap:14px;align-items:flex-start;margin:0 0 4px}
.donate-addr{display:block;flex:1 1 auto;min-width:0;word-break:break-all;font-size:13px;line-height:1.45;color:var(--ink);background:var(--field);padding:10px 12px;border-radius:10px;border:1px solid var(--line)}
.donate-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.donate-actions .button,.donate-actions a.button{width:auto}
.donate-qr{margin:0;flex:0 0 180px;width:180px;max-width:100%;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}
.donate-qr img{display:block;width:180px;max-width:100%;height:auto;background:#fff}
@media (max-width:720px){
  .donate-pair{flex-wrap:wrap}
  .donate-qr{flex:0 0 auto}
}
.wallet-hint{margin:12px 0 14px;color:var(--muted);font-size:14px;line-height:1.45}
.donate-extra,.donate-net{margin:8px 0 0;color:var(--muted);font-size:14px}
.donate-meta p{margin:0 0 10px}
.nav2 a,.quiet a{color:var(--gold);text-decoration:none;font-size:15px;padding:10px 11px;min-height:44px;display:inline-flex;align-items:center;border-radius:10px;white-space:nowrap;flex-shrink:0}
.nav2 a{width:100%;justify-content:flex-start}
.nav2 a:hover{background:var(--wash);color:var(--ink)}
.nav2 a.nav-aziel{color:var(--royal);font-weight:700;white-space:nowrap;flex:0 0 auto}
.nav2 a.nav-aziel:hover{background:var(--wash);color:var(--ink)}
.nav2 .sep{color:#5a4e3e;padding:0 2px}
.aziel-name{color:var(--royal);font-weight:700}
.home-doors{display:grid;grid-template-columns:1fr;gap:14px;margin:18px 0}
.start-paths{display:grid;grid-template-columns:1fr;gap:10px;margin:14px 0 6px}
.start-card{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 16px;color:var(--ink);min-width:0;max-width:100%}
.start-card strong{display:block;color:var(--gold);margin:0 0 4px;font-size:15px}
.start-card p{margin:0;font-size:15px;line-height:1.45}
.explore-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px;min-width:0;max-width:100%}
.agents-tab{display:flex;justify-content:center;align-items:flex-end;margin:36px 0 0;padding:0;border:0}
.agents-tab a{min-height:32px;padding:5px 14px 6px;font-size:13px;font-weight:650;color:var(--muted);text-decoration:none;border:1px solid var(--line);border-bottom:0;border-radius:10px 10px 0 0;background:var(--paper)}
.agents-tab a:hover{color:var(--gold);border-color:var(--gold)}
.empty-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:14px 0 0}
.empty-actions .button{width:auto}
@media (min-width:721px){
  .home-doors{grid-template-columns:1fr 1fr}
  .start-paths{grid-template-columns:1fr 1fr}
}
.muted{color:var(--muted)}
a{color:var(--gold)}
.pill{background:var(--wash);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:650;color:var(--ink);font-variant-numeric:tabular-nums;text-decoration:none}
.pill.ok{background:#14261c;color:var(--yes);border-color:#2e6b45}
a.pill:hover{color:var(--gold)}
.pill span{color:var(--muted);font-weight:650;margin-left:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin:18px 0;box-shadow:0 1px 0 #00000040;min-width:0;max-width:100%;overflow-x:hidden;overflow-wrap:anywhere;word-break:break-word}
.button,button,.chip,.nav2 a{touch-action:manipulation}
.button,button{background:var(--btn);color:#14110a;border:0;padding:12px 16px;border-radius:10px;text-decoration:none;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700}
.button.ghost,a.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.search,input,select,textarea{padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--field);color:var(--ink);font:inherit}
.search{min-width:0;width:100%;flex:1 1 auto;text-overflow:ellipsis}
input,select,textarea{width:100%;min-height:44px}
input[type=checkbox],input[type=radio]{width:auto!important;min-width:18px;min-height:18px;max-width:22px;height:18px;padding:0;flex:0 0 auto;accent-color:var(--btn);appearance:auto;-webkit-appearance:checkbox;background:transparent;border:0;box-shadow:none}
.checkrow{display:flex;align-items:flex-start;gap:10px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;max-width:100%;width:100%;min-width:0;min-height:44px;line-height:1.35;font-size:15px;color:var(--ink);background:transparent}
.checkrow input{margin-top:3px}
.ocr-form{display:flex;flex-direction:column;gap:12px;min-width:0;max-width:100%}
.ocr-form button{align-self:flex-start;max-width:100%}
.lens-box{border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0;max-width:100%;margin:0;background:var(--card);color:var(--ink)}
.lens-box legend{font-weight:750;padding:0 6px;color:var(--ink)}
.lens-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px;width:100%;min-width:0}
.lens-grid .checkrow,.lens-option{margin:0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);align-items:center}
.lens-sample{width:96px;height:36px;object-fit:contain;object-position:center;border-radius:8px;flex:0 0 96px;border:1px solid var(--line);background:var(--card);display:block}
.lens-copy{min-width:0;flex:1 1 auto;color:var(--ink)}
.lens-swatch{min-height:auto;padding:2px 8px;color:#fff}
textarea{min-height:120px;resize:vertical}
label.filepick{display:block;margin:8px 0 14px}
input[type=file]{width:100%;min-height:44px;padding:10px;background:var(--field);color:var(--ink)}
.drop form > input[type=file]{margin:0}
.field-label{display:block;margin:10px 0 6px;font-size:14px;font-weight:700;color:var(--ink)}
.field-label .req{color:var(--gold)}
.hero{padding:8px 0 4px;content-visibility:visible;min-width:0;max-width:100%;overflow-x:hidden}
.hero h1,.hero p,.card h1,.card h2,.card h3,.card p,.card li,.card .meta,.meta,.muted{overflow-wrap:anywhere;word-break:break-word;max-width:100%;min-width:0}
.hero h1{font-size:28px;margin:0 0 8px;letter-spacing:-.03em;color:var(--ink);content-visibility:visible}
.library-count{margin:10px 0 0;font-size:15px;font-variant-numeric:tabular-nums;line-height:1.45}
.library-count a{white-space:nowrap}
.library-count strong{color:var(--gold);font-size:18px;font-weight:800}
.hero-search{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch;margin:18px 0 8px}
.hero-search .search{flex:1 1 220px}
.hero-search button{flex:0 0 auto}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px;min-width:0;max-width:100%;overflow-x:hidden}
.chip{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-weight:650;min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word}
.chip.on{background:var(--btn);color:#14110a;border-color:var(--btn)}
.doc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 20px 16px;margin:14px 0;overflow:hidden;min-width:0;max-width:100%;content-visibility:auto;contain-intrinsic-size:auto 280px}
.doc.doc-aziel{border-color:var(--royal);box-shadow:inset 3px 0 0 var(--royal)}
.doc h3{margin:8px 0 6px;font-size:20px;letter-spacing:-.02em;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2}
.doc h3 a{color:var(--ink);text-decoration:none;overflow-wrap:anywhere;word-break:break-word}
.doc h3 a:hover{color:var(--gold)}
.doc .meta{color:var(--muted);font-size:14px;margin:0 0 8px;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2}
.doc p{margin:8px 0 12px;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3}
.doc p.byline,.doc p.triad,.doc p.muted,.doc p.doc-actions{display:block;overflow:visible;-webkit-line-clamp:unset;line-clamp:unset}
.doc .byline{margin:0 0 8px;font-weight:650;min-width:0;max-width:100%}
.lib-tag{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;letter-spacing:.02em}
.lib-tag.aziel{background:var(--royal);color:#f3e9ff;border:1px solid var(--royal-deep)}
.lib-tag.corpus{background:var(--wash);color:var(--gold);border:1px solid var(--line)}
.drop{border:2px dashed var(--line);border-radius:16px;padding:22px;background:var(--cream);margin:12px 0 8px}
.drop h2,.drop h3{margin:0 0 10px}
.pw-row{display:flex;gap:8px;align-items:center;margin:6px 0;flex-wrap:wrap}
.pw-row input[type=password],.pw-row input[type=text]{flex:1;min-width:0}
label.showpw{font-size:14px;color:var(--muted);white-space:nowrap;min-height:44px;display:inline-flex;align-items:center;gap:8px}
.ok{color:var(--yes);font-weight:700}
.bad{color:var(--no);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.metric{font-size:28px;font-weight:800;color:var(--gold)}
.empty{color:var(--muted);padding:28px 8px;text-align:center}
.empty strong{display:block;color:var(--ink);margin-bottom:6px}
.empty p{margin:8px 0 0}
.tools{position:relative;z-index:8;background:var(--bg);padding:10px 0 12px;margin:0 0 8px;border-bottom:1px solid var(--line)}
.tools-grid{display:grid;grid-template-columns:minmax(140px,.9fr) repeat(4,minmax(110px,1fr));gap:10px;margin:8px 0 4px;min-width:0}
.tools-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted);min-width:0}
.tools select,.tools input{min-height:44px;width:100%}
.facet{margin:10px 0}
.facet-label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin:0 0 4px;letter-spacing:.02em}
.facet .chips{margin:0}
.mini-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;min-width:0;max-width:100%;overflow:visible;overflow-x:hidden}
.mini-chip{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-size:13px;font-weight:600;max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;overflow-wrap:anywhere;word-break:break-word}
.mini-chip.on{background:var(--btn);color:#14110a;border-color:var(--btn)}
.q-badge{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;margin-left:6px}
.q-badge.go{background:#14261c;color:var(--yes)}
.q-badge.slow{background:#2a2210;color:var(--rev)}
.q-badge.stop{background:#2a1414;color:var(--no)}
.lights{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}
.light{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--paper);min-height:72px}
.light .lamp{width:18px;height:18px;border-radius:50%;flex:0 0 18px;margin-top:4px;box-shadow:inset 0 0 0 2px #00000044}
.light.go .lamp{background:#2f9e44}
.light.slow .lamp{background:#f0c14b}
.light.stop .lamp{background:#c92a2a}
.shelf{display:grid;grid-template-columns:minmax(0,1fr);gap:0;width:100%;min-width:0;max-height:none;overflow:visible;border:0;padding:0;background:transparent}
@media (min-width:721px){
  .tools{position:sticky;top:0}
}
.meta-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:10px 0}
.triad{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:10px 0 4px;min-width:0;max-width:100%}
.triad .metric{font-size:42px;line-height:1;color:var(--gold)}
.triad.zsolver{outline:2px solid var(--royal);outline-offset:4px;border-radius:10px;padding:6px 10px}
.triad.zsolver .metric,.zsolver-label{color:var(--gold)}
.triad-card{border:1px solid var(--line);border-radius:14px;padding:16px;background:var(--paper);margin:12px 0}
.q-banner{background:#2a1414;color:var(--no);border:1px solid #8a2b2b;border-radius:12px;padding:12px 14px;margin:10px 0;font-weight:650}
.about-aziel h1{color:var(--royal)}
.about-prose{margin-top:8px;margin-bottom:12px;padding-top:18px;padding-bottom:18px}
.about-prose,.about-prose p,.about-sign{color:var(--royal)}
.about-prose a{color:var(--royal)}
.about-prose a:hover{color:var(--gold)}
.about-prose p{margin:0 0 10px}
.about-prose > :last-child{margin-bottom:0}
.about-sign{margin-top:2px}
.about-record{background:var(--paper);color:var(--ink);border:1px dashed var(--line);box-shadow:none;margin-top:8px}
.about-record,.about-record p,.about-record li{color:var(--ink)}
.about-record a{color:var(--gold)}
.about-record a:hover{color:var(--ink)}
.about-record p{margin:0 0 12px}
.about-record ul{margin:0 0 14px;padding-left:1.25em}
.about-record > :last-child{margin-bottom:0}
.doc.doc-aziel,.doc.doc-aziel h3,.doc.doc-aziel h3 a,.doc.doc-aziel p,.doc.doc-aziel .meta,.doc.doc-aziel .byline{color:var(--royal)}
.doc.doc-aziel h3 a:hover{color:var(--gold)}
.doc.doc-aziel .mini-chip{color:var(--royal);border-color:var(--royal)}
.record-aziel,.record-aziel p,.record-aziel .meta,.record-aziel h1,.record-aziel h2,.record-aziel h3{color:var(--royal)}
.record-aziel a{color:var(--royal)}
.record-aziel a:hover{color:var(--gold)}
.pattern-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:12px 0}
.pattern-card{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;text-decoration:none;color:var(--ink)}
.pattern-card:hover{border-color:var(--gold);color:var(--ink)}
.pattern-card .metric{font-size:28px;font-weight:800;color:var(--gold);margin:0 0 6px}
.soft-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0}
.soft-section{margin:22px 0 8px}
.soft-section h2{margin:0 0 8px;font-size:18px;letter-spacing:-.02em;color:var(--ink)}
.soft-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.soft-card{content-visibility:auto;contain-intrinsic-size:auto 220px}
.soft-card.featured{border-color:var(--royal);box-shadow:inset 3px 0 0 var(--royal)}
.soft-card.door{border-color:var(--gold)}
.soft-card.catalog-only{border-style:dashed}
.soft-card h3{margin:0 0 8px;font-size:20px}
.soft-card p{margin:0 0 12px}
.soft-card .soft-meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.soft-card .soft-meta .pill{font-variant-numeric:tabular-nums}
.soft-card.root{border-color:var(--gold);box-shadow:inset 3px 0 0 var(--gold)}
.soft-card .soft-links,.runtime-dist{display:flex;flex-wrap:wrap;gap:8px;margin:0;align-items:center}
.runtime-dist{margin:12px 0 0}
a.runtime-muted{color:var(--muted);font-size:14px;font-weight:550;text-decoration:underline;text-underline-offset:3px;min-height:auto;padding:4px 0;display:inline;background:transparent;border:0}
a.runtime-muted:hover{color:var(--ink)}
.ecosystem{margin:36px 0 0;padding:20px 0 8px;border-top:1px solid var(--line)}
.ecosystem .eco-head{margin:0 0 12px;color:var(--muted);font-size:14px;font-weight:750;letter-spacing:.02em}
.ecosystem-list{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0;padding:0;list-style:none}
.ecosystem-list a{min-height:44px;display:inline-flex;align-items:center}
.ecosystem-list a.button{min-height:44px}
.jeeves-fab{position:fixed;right:16px;bottom:16px;z-index:40;width:auto;min-width:120px;max-width:calc(100% - 32px);box-shadow:0 8px 24px #00000066;touch-action:manipulation;pointer-events:auto;background:var(--btn);color:#14110a}
.jeeves-drawer{position:fixed;right:12px;bottom:72px;z-index:39;width:min(380px,calc(100% - 24px));max-height:70vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 12px 32px #00000066;touch-action:pan-y;pointer-events:auto}
.jeeves-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.jeeves-x{background:transparent;color:var(--ink);border:0;min-height:44px;width:44px;padding:0}
.jeeves-log{min-height:80px;max-height:28vh;overflow:auto;margin:8px 0;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--field)}
.jeeves-msg{margin:0 0 8px;font-size:14px}
.jeeves-egg-img{display:block;max-width:100%;width:min(280px,100%);height:auto;margin:10px 0 4px;border-radius:12px;border:1px solid var(--line);background:#0f0d0a}
.jeeves-snake{display:block;margin:8px 0 0;padding:8px;overflow:auto;max-width:100%;overflow-x:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.15;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;color:#c8f5c0;background:#0b120b;border:1px solid var(--line);border-radius:8px}
.jeeves-note{margin:6px 0 8px}
.jeeves-ask,.jeeves-up{display:flex;flex-direction:column;gap:8px;margin:8px 0}
.jeeves-links{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
.jeeves-links a{min-height:44px}
.trend{margin:18px 0}
.trend h2{margin:0 0 8px;font-size:20px;color:var(--gold)}
.follow-footer{margin:22px 0 8px}
.follow-footer h2{margin:0 0 8px;font-size:18px}
.follow-group{margin:10px 0}
.follow-group .facet-label{margin-bottom:6px}
.verify-panel{margin:12px 0;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--paper)}
.verify-panel summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700;color:var(--gold)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
@media (max-width:720px){
  html,body{overflow-x:hidden;overflow-y:auto;height:auto;min-height:100%;max-width:100%}
  .sitehead-inner{padding:16px 14px 0}
  .wrap{padding:8px 14px max(120px, calc(env(safe-area-inset-bottom, 0px) + 100px))}
  .brand{width:auto;font-size:20px;flex:1 1 auto;min-width:0}
  .brandrow{flex-wrap:wrap;gap:8px}
  .statbar{flex:1 1 100%;width:100%;max-width:100%;margin-left:0;order:2}
  .hero-search .search{flex:1 1 auto;height:auto;min-height:44px;padding-left:10px;padding-right:10px}
  .search::placeholder{font-size:13px}
  .authbar{width:100%;margin-left:0;order:3}
  .authbar a.button,.authbar a.auth-link{width:auto}
  .sigil-nav-btn,.brandmark-link{width:44px;max-width:44px;height:44px;flex:0 0 44px}
  .pill{padding:5px 10px}
  .search,.hero-search .search{width:100%;min-width:0}
  .hero-search{flex-direction:column}
  .hero-search button,.button,button{width:100%}
  .jeeves-fab,.jeeves-drawer button,.jeeves-drawer .button,.jeeves-x{width:auto}
  .nav1{width:100%}
  .nav2{left:0;right:auto;width:min(360px,86vw);min-width:0;padding-top:68px}
  .doc,.card,.drop{padding:16px}
  .tools{position:static;width:100%}
  .tools-grid{grid-template-columns:1fr}
  .tools select,.tools input,.tools .search{width:100%;min-height:44px}
  .tools button{width:100%}
  .shelf{display:grid;grid-template-columns:minmax(0,1fr);max-height:none;overflow:visible;border:0;padding:0;background:transparent}
  .chips,.mini-chips,.checkrow,.lens-grid,.ocr-form,.ocr-form button,.explore-row,.start-paths{width:100%}
  .start-paths{grid-template-columns:1fr}
  .soft-grid{grid-template-columns:1fr}
  .soft-card{padding:16px}
  .soft-card h3{font-size:18px;line-height:1.3}
  .soft-card p{font-size:15px;line-height:1.45}
  .empty-actions{flex-direction:column}
  .empty-actions .button{width:100%}
  .jeeves-fab{min-height:48px;padding:14px 18px;font-size:16px}
  html{scroll-padding-bottom:96px}
  .lights{grid-template-columns:1fr}
  .q-badge{display:block;margin:8px 0 0;width:fit-content}
}

.tree details{margin:4px 0}
.tree summary{cursor:pointer;min-height:44px;display:flex;align-items:center;padding:8px 4px;border-radius:10px}
.tree summary:hover{background:var(--wash)}
.tree ul{margin:0 0 0 14px;padding:0;list-style:none}
.tree li{margin:2px 0}
.tree-aziel>summary,.tree .tree-aziel{color:var(--royal);font-weight:700}
.map-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0}
.map-tools label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted);flex:1 1 140px}
.map-tools input,.map-tools select{min-height:44px;width:100%}
input[type=range]{width:100%;min-height:44px;accent-color:var(--gold)}
#worldMap{width:100%;height:auto;background:var(--field);border:1px solid var(--line);border-radius:10px;touch-action:none;display:block}
.event-row{padding:10px 0;border-bottom:1px solid var(--line);min-height:44px}
table.plain{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}
table.plain th,table.plain td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line);color:var(--ink);overflow-wrap:anywhere;word-break:break-word}
pre,code,pre.verify{max-width:100%;min-width:0;overflow-x:hidden;overflow-wrap:anywhere;word-break:break-word}
pre.verify{white-space:pre-wrap;word-break:break-word;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:14px;overflow:auto;overflow-x:hidden;color:var(--ink)}
code{white-space:pre-wrap}
.media-options{display:flex;flex-direction:column;gap:6px;margin:8px 0 14px}
.media-actions{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.media-form input[type=checkbox]{width:auto;min-height:18px;min-width:18px;flex:0 0 auto}
.av-player{width:100%;max-width:100%;margin:8px 0;min-height:44px}
@media (max-width:720px){
  .map-tools{flex-direction:column;align-items:stretch}
  .map-tools label,.map-tools button,.map-tools input,.map-tools select{width:100%}
  table.plain{display:block;overflow-x:hidden;max-width:100%}
  table.plain th,table.plain td{overflow-wrap:anywhere;word-break:break-word}
  .media-actions .button,.media-actions button{width:100%}
}
.authbar .auth-who,.aziel-name,.donate-aziel,.nav2 a.nav-aziel,.about-aziel h1,.about-prose,.about-prose p,.about-prose a,.about-sign,.doc.doc-aziel,.doc.doc-aziel h3,.doc.doc-aziel h3 a,.doc.doc-aziel p,.doc.doc-aziel .meta,.doc.doc-aziel .byline,.doc.doc-aziel .mini-chip,.record-aziel,.record-aziel p,.record-aziel .meta,.record-aziel h1,.record-aziel h2,.record-aziel h3,.record-aziel a,.tree-aziel>summary,.tree .tree-aziel{color:var(--royal-ink)}
.doc.doc-aziel,.soft-card.featured{border-color:var(--royal-ink);box-shadow:inset 3px 0 0 var(--royal-ink)}
.doc.doc-aziel .mini-chip{border-color:var(--royal-ink)}
@media (prefers-color-scheme: light){
  :root{
    --bg:#f4efe6;--paper:#fffaf3;--ink:#1a140e;--muted:#5c4a32;--line:#7a6850;
    --gold:#6e5208;--card:#fffdf9;--cream:#f3eadc;--field:#fffdf9;--wash:#efe4d2;
    --royal-ink:#5c2d91;--focus:#1a140e;
    color-scheme:light
  }
  .ok{color:#146c36}
  .bad{color:#8f1d1d}
}
`;

export function pwField(name = "password") {
  const id = "pw_" + name.replace(/[^a-z0-9]/gi, "");
  return `<div class="pw-row"><input id="${id}" name="${name}" type="password" required placeholder="password" autocomplete="current-password"><label class="showpw"><input type="checkbox" onclick="var e=document.getElementById('${id}');e.type=this.checked?'text':'password'"> Show password</label></div>`;
}

/** Static Donate strip on library chrome. No KV, D1, or addresses. AZL-DONATE-1.0 / RL-WP-0.1-library. */
export function donateStripHtml() {
  return `<aside class="donate-strip" aria-label="Donate"><p>Nothing is free. Static Donate door on this origin — no Worker KV. <a href="/donate">Donate</a>. Author <span class="donate-aziel">Aziel Eliab</span>.</p></aside>`;
}

/** Footer/nav ecosystem block. Keep out of Softwares heading→list. */
export function ecosystemBlockHtml() {
  const items = ECOSYSTEM_LINKS.map((l) => {
    const cls = l.muted ? "runtime-muted" : l.primary ? "button" : "";
    const extra = cls ? ` class="${cls}"` : "";
    return `<li><a${extra} href="${esc(l.href)}" rel="noopener noreferrer">${esc(l.label)}</a></li>`;
  }).join("");
  return `<footer class="ecosystem" aria-label="${esc(ECOSYSTEM_HEADING)}"><p class="eco-head">${esc(ECOSYSTEM_HEADING)}</p><nav class="ecosystem-nav"><ul class="ecosystem-list">${items}</ul></nav></footer>`;
}

/** Rose-star brand mark only — no words on the mark. Opens the library menu. */
export function brandMarkHtml() {
  return `<button type="button" class="brandmark-link sigil-nav-btn" id="sigilNavBtn" aria-expanded="false" aria-controls="sigilNav" aria-haspopup="true" aria-label="Open library menu"><img class="brandmark" src="/sigil.png" width="40" height="40" alt="" decoding="async" fetchpriority="high"></button>`;
}

/** Top-bar primary actions: Upload beside Login / Sign up. */
export function authBarHtml(signed) {
  const who = signed && signed.username ? String(signed.username) : "";
  if (signed) {
    return `<nav class="authbar" aria-label="Account"><a class="button" href="/upload">Upload</a><span class="auth-who">${esc(who)}</span><a class="auth-link" href="/logout">Log out</a></nav>`;
  }
  return `<nav class="authbar" aria-label="Account"><a class="button" href="/upload">Upload</a><a class="auth-link" href="/login">Log in</a><a class="auth-link" href="/signup">Sign up</a></nav>`;
}

function formatStatCount(n) {
  const num = Number(n);
  if (Number.isFinite(num)) return num.toLocaleString("en-US");
  return String(n);
}

/** Compact homepage Views · Downloads · Nodes#/LiveNodes# counter. Display-only — not a button. */
export function brandCountPills({ views, downloads, nodes, liveNodes } = {}) {
  const bits = [];
  if (views != null && views !== "") {
    bits.push(`<span class="stat-group"><span class="stat-num" id="views">${esc(formatStatCount(views))}</span><span class="stat-lbl">Views</span></span>`);
  }
  if (downloads != null && downloads !== "") {
    bits.push(`<span class="stat-group"><span class="stat-num" id="downloads">${esc(formatStatCount(downloads))}</span><span class="stat-lbl">Downloads</span></span>`);
  }
  if ((views != null && views !== "") || (downloads != null && downloads !== "") || (nodes != null && nodes !== "") || (liveNodes != null && liveNodes !== "")) {
    const n = nodes != null && nodes !== "" ? nodes : 0;
    const live = liveNodes != null && liveNodes !== "" ? liveNodes : 0;
    bits.push(`<span class="stat-group"><span class="stat-num" id="nodes">${esc(formatStatCount(n))}</span><span class="stat-slash" aria-hidden="true">/</span><span class="stat-num" id="livenodes">${esc(formatStatCount(live))}</span><span class="stat-lbl">Nodes / Live Nodes</span></span>`);
  }
  if (!bits.length) return "";
  return `<div class="statbar" role="status" aria-label="Library views, downloads, and Nodes/Live Nodes"><span class="pill stat-counter">${bits.join('<span class="stat-sep" aria-hidden="true">·</span>')}</span></div>`;
}

/** Left-edge sigil drawer. Pattern and Runtime stay off chrome. Login/Sign up live in the top bar. */
export function sigilNavHtml() {
  return `<div class="sigil-nav-scrim" id="sigilNavScrim" hidden aria-hidden="true"></div><nav class="nav2 quiet" id="sigilNav" hidden><a href="/">Search</a><span class="sep">|</span><a href="/aziel-library">Aziel Library</a><span class="sep">|</span><a href="/corpus">Corpus</a><span class="sep">|</span><a href="/software">Software</a><span class="sep">|</span><a href="/how-its-scored">How it's scored</a><span class="sep">|</span><a href="/tree">Tree</a><span class="sep">|</span><a href="/map">Map</a><span class="sep">|</span><a href="/historical">Historical</a><span class="sep">|</span><a href="/forensics">Forensics</a><span class="sep">|</span><a class="nav-aziel" href="${ABOUT_PATH}">${ABOUT_NAV_LABEL}</a><span class="sep">|</span><a href="/receipts">Receipts</a><span class="sep">|</span><a href="/donate">Donate</a><span class="sep">|</span><a href="/upload">Upload</a></nav>`;
}

export function sigilNavScript() {
  return `<script>
(function(){
  var btn=document.getElementById("sigilNavBtn");
  var nav=document.getElementById("sigilNav");
  var scrim=document.getElementById("sigilNavScrim");
  if(!btn||!nav)return;
  function open(){nav.hidden=false;if(scrim){scrim.hidden=false;scrim.setAttribute("aria-hidden","false");}btn.setAttribute("aria-expanded","true");}
  function shut(){nav.hidden=true;if(scrim){scrim.hidden=true;scrim.setAttribute("aria-hidden","true");}btn.setAttribute("aria-expanded","false");}
  function toggle(){if(nav.hidden)open();else shut();}
  btn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();toggle();});
  if(scrim)scrim.addEventListener("click",function(){shut();});
  document.addEventListener("click",function(e){if(nav.hidden)return;if(nav.contains(e.target)||btn.contains(e.target)||(scrim&&scrim.contains(e.target)))return;shut();});
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&!nav.hidden){shut();btn.focus();}
    if((e.key==="Enter"||e.key===" ")&&document.activeElement===btn){e.preventDefault();toggle();}
  });
})();
</script>`;
}

/** Split homepage HTML so the hero can paint before the 89-card shelf. */
export const LCP_FOLD = "<!--az-lcp-fold-->";

export function splitLcpHtml(html) {
  const text = String(html || "");
  const i = text.indexOf(LCP_FOLD);
  if (i < 0) return { early: text, late: "" };
  const end = i + LCP_FOLD.length;
  return { early: text.slice(0, end), late: text.slice(end) };
}

/** Stream the LCP fold first so the browser can paint hero text before the shelf. */
export function streamLcpHtml(html) {
  const { early, late } = splitLcpHtml(html);
  if (!late || typeof TransformStream !== "function") return String(html || "");
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  writer
    .write(enc.encode(early))
    .then(() => writer.write(enc.encode(late)))
    .then(() => writer.close())
    .catch(() => {
      try { writer.close(); } catch { /* already closed */ }
    });
  return readable;
}

export function page(title, body, { signed, scripts, path, kind, description, work, runtimeVersion, views, downloads, nodes, liveNodes, donateStrip = true, ecosystem = true } = {}) {
  const metaOpts = { title, path: path || "/", kind, description, work, runtimeVersion, includeJsonLd: false };
  const homeChrome = kind === "search";
  const showDonate = donateStrip && !homeChrome;
  const showEco = ecosystem && !homeChrome;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(documentTitle(kind, title))}</title>${headMeta(metaOpts)}${ingestReceiptHead()}<link rel="preload" href="/sigil.png" as="image" fetchpriority="high"><style>${CSS}</style></head><body>
<header class="sitehead"><div class="sitehead-inner">
<div class="brandrow nav1">${brandMarkHtml()}<a class="brand" href="/">Aziel Corpus Library</a>${authBarHtml(signed)}${homeChrome ? brandCountPills({ views, downloads, nodes, liveNodes }) : ""}</div>
${sigilNavHtml()}
</div></header>
${homeChrome ? statbarClockScript() : ""}
<div class="wrap">
${showDonate ? donateStripHtml() : ""}
${body}
${showEco ? ecosystemBlockHtml() : ""}</div>${jeevesFabHtml()}${(scripts||[]).map((src)=>"<script src=\""+esc(src)+"\" defer></script>").join("")}${sigilNavScript()}${jsonLdScript(metaOpts)}</body></html>`;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Display-only card snippet length. Does not rewrite stored documents. */
export const CARD_EXCERPT_CHARS = 180;

/** Shorten browse/search/library card blurbs. Ellipsis is chrome only. */
export function cardExcerpt(text, max = CARD_EXCERPT_CHARS) {
  const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  const lim = Math.max(24, Number(max) || CARD_EXCERPT_CHARS);
  if (s.length <= lim) return s;
  const cut = s.slice(0, lim);
  const sp = cut.lastIndexOf(" ");
  const base = sp >= Math.floor(lim * 0.7) ? cut.slice(0, sp) : cut;
  return base.replace(/[\s.,;:!?…—–-]+$/, "") + "…";
}

function libTag(library) {
  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  const label = lib === "aziel" ? "Aziel Library" : "Corpus";
  return `<span class="lib-tag ${lib}">${label}</span>`;
}

export const SHELF_PAGE_SIZE = 48;

function browseState(opts = {}) {
  return {
    q: String(opts.q || "").trim(),
    lib: String(opts.lib || "all").trim() || "all",
    sort: String(opts.sort || "newest").trim() || "newest",
    domain: String(opts.domain || "").trim(),
    subject: String(opts.subject || "").trim(),
    keyword: String(opts.keyword || "").trim(),
    author: String(opts.author || "").trim(),
    offset: Math.max(0, Number(opts.offset) || 0),
  };
}

function browseHref(path, state, extra = {}) {
  const merged = { ...browseState(state), ...extra };
  const sp = new URLSearchParams();
  for (const key of ["q", "lib", "sort", "domain", "subject", "keyword", "author", "offset"]) {
    let v = merged[key];
    if (v == null) continue;
    v = String(v).trim();
    if (!v) continue;
    if (key === "lib" && (v === "all" || path !== "/")) continue;
    if (key === "sort" && v === "newest") continue;
    if (key === "offset" && v === "0") continue;
    sp.set(key, v);
  }
  const qs = sp.toString();
  return qs ? path + "?" + qs : path;
}

function chip(label, href, on, cls = "chip") {
  return `<a class="${cls}${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
}

/** Display-only: long SHA-like subject/keyword chips cannot blow past card chrome. */
export function chipLabel(label) {
  const s = String(label == null ? "" : label).trim();
  if (/^[0-9a-f]{40,}$/i.test(s)) return s.slice(0, 12) + "…" + s.slice(-4);
  return s;
}

function miniChip(label, href, on) {
  return chip(chipLabel(label), href, on, "mini-chip");
}

const SORTS = [
  ["newest", "Newest upload"],
  ["oldest", "Oldest upload"],
  ["alpha", "Title A–Z"],
  ["author", "Author A–Z"],
  ["domain", "Domain A–Z"],
];

function browseTools({ action = "/", showLibChips = true, ...raw }) {
  const state = browseState(raw);
  const sortKey = state.sort === "title" ? "alpha" : state.sort;
  const opts = SORTS.map(
    ([v, lab]) => `<option value="${v}"${sortKey === v ? " selected" : ""}>${lab}</option>`
  ).join("");
  const hiddenLib = action === "/" ? `<input type="hidden" name="lib" value="${esc(state.lib)}">` : "";
  const libChips = showLibChips
    ? `<div class="chips">${chip("All", browseHref("/", state, { lib: "all" }), state.lib === "all" || !state.lib)}${chip("Aziel Library", browseHref("/", state, { lib: "aziel" }), state.lib === "aziel")}${chip("Corpus", browseHref("/", state, { lib: "corpus" }), state.lib === "corpus")}</div>`
    : "";
  return `<form class="tools" method="get" action="${esc(action)}">
<div class="hero-search"><input class="search" name="q" value="${esc(state.q)}" placeholder="Search title, text, author, domain, subjects, keywords…">${hiddenLib}<button>Search</button></div>
<div class="tools-grid">
<label>Sort<select name="sort">${opts}</select></label>
<label>Domain<input name="domain" value="${esc(state.domain)}" placeholder="Domain"></label>
<label>Subject<input name="subject" value="${esc(state.subject)}" placeholder="Subject"></label>
<label>Keyword<input name="keyword" value="${esc(state.keyword)}" placeholder="Keyword"></label>
<label>Author<input name="author" value="${esc(state.author)}" placeholder="Author"></label>
</div>
${libChips}
</form>`;
}

function facetRow(label, items, param, state, path) {
  if (!items || !items.length) return "";
  const current = String(state[param] || "").trim();
  const chips = visibleTagEntries(items)
    .map((entry) => {
      const on = current.toLowerCase() === entry.value.toLowerCase();
      return chip(entry.label, browseHref(path, state, { [param]: on ? "" : entry.value }), on);
    })
    .join("");
  return `<div class="facet"><span class="facet-label">${esc(label)}</span><div class="chips">${chips}</div></div>`;
}

function facetBlock(facets, state, path) {
  const f = facets || {};
  const rows = [
    facetRow("Domain", f.domains, "domain", state, path),
    facetRow("Subject", f.subjects, "subject", state, path),
    facetRow("Keyword", f.keywords, "keyword", state, path),
    facetRow("Author", f.authors, "author", state, path),
  ].filter(Boolean);
  return rows.length ? `<div class="facets">${rows.join("")}</div>` : "";
}

function isAzielRow(r) {
  return String(r && r.library || "").toLowerCase() === "aziel";
}

function recordTimeMs(row) {
  const ms = Date.parse(String((row && row.created_utc) || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function preferredShelfRow(a, b) {
  const la = String((a && a.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  const lb = String((b && b.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  if (la !== lb) return la > lb ? a : b;
  const ta = recordTimeMs(a);
  const tb = recordTimeMs(b);
  if (ta !== tb) return ta > tb ? a : b;
  return String((a && a.record_id) || "") >= String((b && b.record_id) || "") ? a : b;
}

function dedupeShelf(rows) {
  const bySha = new Map();
  const noSha = [];
  for (const r of rows || []) {
    const sha = String(r.content_sha256 || "").trim().toLowerCase();
    if (!sha) {
      noSha.push(r);
      continue;
    }
    const prev = bySha.get(sha);
    bySha.set(sha, prev ? preferredShelfRow(prev, r) : r);
  }
  const keepers = new Set([...bySha.values(), ...noSha].map((r) => r && r.record_id).filter(Boolean));
  return (rows || []).filter((r) => keepers.has(r.record_id));
}

export function shelfScoreRows(row) {
  const st = shelfScoreState(row);
  const triadRow = st.triad_display != null
    ? `<p class="triad"><span class="metric">${esc(st.triad_display)}</span><span class="muted">Triad score</span></p>`
    : `<p class="muted">Triad score pending backfill</p>`;
  let zRow = "";
  if (st.zsolver_omit) {
    zRow = "";
  } else if (st.zsolver_display != null) {
    const queued = st.zsolver_queued ? ", retry queued" : "";
    zRow = `<p class="triad zsolver"><span class="metric">${esc(st.zsolver_display)}</span><span class="muted zsolver-label">ZionPattern Solver (secondary${queued})</span></p>`;
  } else if (st.zsolver_pending) {
    zRow = `<p class="muted">ZionPattern Solver pending backfill</p>`;
  }
  return { triadRow, zRow, ...st };
}

function docCards(rows, state = {}, path = "/") {
  const unique = dedupeShelf(rows);
  if (!unique.length) {
    return emptyShelfHtml(path);
  }
  const st = browseState(state);
  return `<div class="shelf">${unique
    .map((r) => {
      const aziel = isAzielRow(r);
      const { triadRow, zRow } = shelfScoreRows(r);
      const sha = String(r.content_sha256 || "").trim();
      const open = `<p class="doc-actions"><a class="button" href="/file/${esc(r.record_id)}">Download</a>` + (sha ? ` <a class="button ghost" href="/download?hash=${esc(sha)}">By hash</a>` : "") + `</p>`;
      const file = r.filename && !isMachineFileTag(r.filename) ? esc(r.filename) : "text record";
      const when = r.created_utc ? esc(String(r.created_utc).replace("T", " ").slice(0, 16)) : "";
      const authorName = String(r.author || "").trim();
      const byline = authorName && !isChromeAuthorByline(authorName)
        ? `<p class="byline">${miniChip(authorName, browseHref(path, st, { author: authorName }), String(st.author).toLowerCase() === authorName.toLowerCase())}</p>`
        : "";
      const domainChips = visibleTagEntries(r.domain)
        .map((t) => miniChip(t.label, browseHref(path, st, { domain: t.value }), String(st.domain).toLowerCase() === t.value.toLowerCase()))
        .join("");
      const subjectChips = visibleTagEntries(r.subjects)
        .map((t) => miniChip(t.label, browseHref(path, st, { subject: t.value }), String(st.subject).toLowerCase() === t.value.toLowerCase()))
        .join("");
      const keywordChips = visibleTagEntries(r.keywords)
        .map((t) => miniChip(t.label, browseHref(path, st, { keyword: t.value }), String(st.keyword).toLowerCase() === t.value.toLowerCase()))
        .join("");
      const extra = [domainChips, subjectChips, keywordChips].filter(Boolean).join("");
      const q = String(r.quarantine_status || "").toUpperCase();
      const qBadge = q === "POISON_SUSPECT" || q === "QUARANTINE"
        ? `<span class="q-badge stop">Quarantine</span>`
        : q === "OPERATOR_FLAG" || q === "FLAGGED"
          ? `<span class="q-badge slow">Flagged</span>`
          : "";
      const extraRow = extra ? `<div class="mini-chips">${extra}</div>` : "";
      const docCls = aziel ? "doc doc-aziel" : "doc";
      return `<article class="${docCls}">${libTag(r.library)}${qBadge}<h3><a href="/record/${esc(r.record_id)}">${esc(r.title)}</a></h3>${byline}${extraRow}${triadRow}${zRow}<p class="meta">${file}${when ? " · " + when : ""}</p><p class="excerpt">${esc(cardExcerpt(r.snippet || r.body || ""))}</p>${open}</article>`;
    })
    .join("")}</div>`;
}

function metaInputs({ authorPlaceholder = "Author" } = {}) {
  return `<div class="meta-fields">
<input name="author" placeholder="${esc(authorPlaceholder)}" autocomplete="off">
<input name="domain" placeholder="Domain">
<input name="subjects" placeholder="Subjects (comma-separated)">
<input name="keywords" placeholder="Keywords (comma-separated)">
</div>`;
}

export function homeSearchActive(state = {}) {
  const s = browseState(state);
  return !!(s.q || s.domain || s.subject || s.keyword || s.author);
}

function formatFileCount(n) {
  return Number(n).toLocaleString("en-US");
}

/** Visible file count from packed library:index:v1. Omit when the index was not read. */
export function libraryFileCountHtml({ records_packed, records_aziel, records_corpus, shelf } = {}) {
  const total = Number(records_packed);
  if (!Number.isFinite(total)) return "";
  const az = Number(records_aziel);
  const co = Number(records_corpus);
  const attrs = [`data-source="library:index:v1"`, `data-records-packed="${total}"`];
  if (Number.isFinite(az)) attrs.push(`data-records-aziel="${az}"`);
  if (Number.isFinite(co)) attrs.push(`data-records-corpus="${co}"`);
  if (shelf === "aziel" && Number.isFinite(az)) {
    return `<p class="library-count" ${attrs.join(" ")}><strong>${formatFileCount(az)}</strong> files in Aziel Library <span class="muted">of ${formatFileCount(total)} in the libraries</span>.</p>`;
  }
  if (shelf === "corpus" && Number.isFinite(co)) {
    return `<p class="library-count" ${attrs.join(" ")}><strong>${formatFileCount(co)}</strong> files in Corpus <span class="muted">of ${formatFileCount(total)} in the libraries</span>.</p>`;
  }
  let extra = "";
  if (Number.isFinite(az) && Number.isFinite(co)) {
    extra = ` · <a href="/aziel-library">Aziel Library ${formatFileCount(az)}</a> · <a href="/corpus">Corpus ${formatFileCount(co)}</a>`;
  }
  return `<p class="library-count" ${attrs.join(" ")}><strong>${formatFileCount(total)}</strong> files in the libraries${extra}.</p>`;
}

function shelfMoreHtml(path, state, rows, pageSize = SHELF_PAGE_SIZE) {
  if (!rows || rows.length < pageSize) return "";
  const next = (Number(state && state.offset) || 0) + pageSize;
  return `<p class="empty-actions"><a class="button ghost" href="${esc(browseHref(path, state, { offset: next }))}">More records</a></p>`;
}

function emptyShelfHtml(path = "/") {
  const here = String(path || "/");
  const browse = here === "/aziel-library"
    ? `<a class="button ghost" href="/aziel-library">Open Aziel Library</a>`
    : here === "/corpus"
      ? `<a class="button ghost" href="/corpus">Open Corpus</a>`
      : `<a class="button ghost" href="/aziel-library">Browse Aziel Library</a><a class="button ghost" href="/corpus">Browse Corpus</a>`;
  return `<div class="shelf"><div class="empty"><strong>No matching records yet.</strong><p>Try a shorter word, clear a filter, or open a shelf.</p><p class="empty-actions">${browse}<a class="button" href="/upload">Upload a file</a><a class="button ghost" href="/">New search</a></p></div></div>`;
}

function homeLibraryChips(state) {
  const st = browseState(state);
  return `<div class="chips">${chip("All", "/", !st.q && !st.domain && !st.subject && !st.keyword && !st.author)}${chip("Aziel Library", "/aziel-library", false)}${chip("Corpus", "/corpus", false)}</div>`;
}

function homeSignupCard() {
  return `<div class="card" id="signup">
<h2>Sign up</h2>
<p class="muted">Create an account to post under a name. Anyone may browse.</p>
<form method="post" action="/signup">
<input name="username" required minlength="3" placeholder="username" autocomplete="username">
${pwField("password")}
<p><button>Create account</button></p>
</form>
<p class="muted">Already have an account? <a href="/login">Log in</a>.</p>
</div>`;
}

function requiredTitleField(id) {
  return `<label class="field-label" for="${id}">Title <span class="req" aria-hidden="true">*</span></label>
<input id="${id}" name="title" placeholder="Title" required pattern=".*\\S.*" title="Title is required" autocomplete="off">`;
}

function homeAnonymousUploadCard({ error } = {}) {
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  return `<div class="drop" id="upload-anonymous">
<h2>Upload anonymously</h2>
${err}
<form method="post" action="/ingest" enctype="multipart/form-data">
<input type="hidden" name="from" value="home">
<input type="file" name="file">
${requiredTitleField("anon-title")}
${metaInputs({ authorPlaceholder: "Author (optional)" })}
<textarea name="body" rows="5" placeholder="Text or notes"></textarea>
<p><button>Upload to Corpus</button></p>
</form>
</div>`;
}

/** Honest Top viewed. Packed library views are site-wide, not per-record — never invent ranks. */
export function trendingHtml(items = []) {
  const rows = (Array.isArray(items) ? items : [])
    .filter((r) => r && Number(r.views) > 0)
    .sort((a, b) => Number(b.views) - Number(a.views))
    .slice(0, 5);
  if (!rows.length) {
    return `<section class="trend" aria-label="Top viewed"><h2>Top viewed</h2><div class="empty"><strong>Per-record view counts are not published.</strong><p>Library-wide views stay on Stats when counted. This list stays empty rather than invent ranks.</p></div></section>`;
  }
  const cards = rows.map((r) => {
    const id = esc(r.record_id || "");
    const title = esc(r.title || r.record_id || "Record");
    const n = Number(r.views);
    return `<p class="event-row"><a href="/record/${id}">${title}</a> <span class="muted">${n.toLocaleString("en-US")} views</span></p>`;
  }).join("");
  return `<section class="trend" aria-label="Top viewed"><h2>Top viewed</h2>${cards}</section>`;
}

export function homeBody({ q, lib, sort, domain, subject, keyword, author, rows, error, records_packed, records_aziel, records_corpus, trending } = {}) {
  const state = browseState({ q, lib, sort, domain, subject, keyword, author });
  const searching = homeSearchActive(state);
  const tools = browseTools({ action: "/", showLibChips: false, ...state });
  const results = searching
    ? docCards(rows, state, "/")
    : "";
  return `<section class="hero">
<h1>Search the libraries</h1>
<p>Aziel Corpus Library is the public MASTER of hashed records. Search a title, browse a shelf, or upload a file.</p>
<p class="muted">Public search across Aziel Library and Corpus. Ask Jeeves — the gold button — answers from filed text.</p>
${libraryFileCountHtml({ records_packed, records_aziel, records_corpus })}
</section>
${tools}
${homeLibraryChips(state)}
${trendingHtml(trending)}
${LCP_FOLD}
${results}
${startPathsHtml()}
<div class="home-doors">${homeSignupCard()}${homeAnonymousUploadCard({ error })}</div>
${agentsTabHtml()}`;
}

export function uploadBody({ signed, error } = {}) {
  const op = isOperator(signed);
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  if (op) {
    return `<section class="hero">
<h1>Upload</h1>
<p class="muted">Upload to <span class="aziel-name">Aziel Library</span>.</p>
${exploreRowHtml("/upload")}
</section>
<div class="drop">
${err}
<form method="post" action="/upload" enctype="multipart/form-data">
<input type="file" name="file" required>
<input name="title" placeholder="Title (optional)" autocomplete="off">
<textarea name="body" rows="4" placeholder="Notes (optional)"></textarea>
<p><button>Upload to Aziel Library</button></p>
</form>
</div>`;
  }
  return `<section class="hero">
<h1>Upload</h1>
<p class="muted">Upload to Corpus. No account required.</p>
<p>Give the file a title, then send it. After a clear review you land on the record page. Agents cite it at <code>/record/{id}/llms.txt</code>.</p>
${exploreRowHtml("/upload")}
</section>
<div class="drop">
${err}
<form method="post" action="/upload" enctype="multipart/form-data">
<input type="file" name="file">
${requiredTitleField("upload-title")}
<textarea name="body" rows="4" placeholder="Text or notes (optional)"></textarea>
<p><button>Upload to Corpus</button></p>
</form>
<p class="muted">Same door as the homepage upload. Help: <a href="/help/uploads.txt">uploads.txt</a> · browse <a href="/corpus">Corpus</a>.</p>
</div>`;
}

export function azielLibraryBody({ rows, error, q, sort, domain, subject, keyword, author, facets, signed, records_packed, records_aziel, records_corpus } = {}) {
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  const state = browseState({ q, lib: "aziel", sort, domain, subject, keyword, author });
  const op = isOperator(signed);
  const upload = op
    ? `<div class="drop">
<h3>Upload a file</h3>
<p class="muted">Multipart file upload. Title and notes are optional. Files stay in Aziel Library.</p>
${err}
<form method="post" action="/aziel-library" enctype="multipart/form-data">
<label class="filepick">File<input type="file" name="file" required></label>
<input name="title" placeholder="Title (optional)">
${metaInputs({ authorPlaceholder: "Aziel Eliab" })}
<textarea name="notes" rows="4" placeholder="Notes (optional)"></textarea>
<p><button>Upload to Aziel Library</button></p>
</form>
</div>`
    : `<div class="card"><p class="muted">Anyone can browse Aziel Library. Uploads are operator-only.</p></div>`;
  return `<section class="hero about-aziel"><h1>Aziel Library</h1><p class="muted">Aziel Eliab's work across domains. Open a card to read or download.</p>${libraryFileCountHtml({ records_packed, records_aziel, records_corpus, shelf: "aziel" })}${exploreRowHtml("/aziel-library")}</section>
${browseTools({ action: "/aziel-library", showLibChips: false, ...state })}
${facetBlock(facets, state, "/aziel-library")}
${upload}
${LCP_FOLD}
${docCards(rows, state, "/aziel-library")}
${shelfMoreHtml("/aziel-library", state, rows)}`;
}

export function corpusBody({ signed, rows, error, q, sort, domain, subject, keyword, author, facets, records_packed, records_aziel, records_corpus } = {}) {
  const op = isOperator(signed);
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  const state = browseState({ q, lib: "corpus", sort, domain, subject, keyword, author });
  let form = "";
  if (op) {
    form = `<div class="card"><p>Operator files always go to Aziel Library.</p><p><a class="button" href="/upload">Upload</a></p></div>`;
  } else if (signed) {
    form = `<div class="drop">
<h3>Post to the corpus</h3>
<p class="muted">Signed-in accounts can upload a file and/or title + notes. Signup is required to post.</p>
${err}
<form method="post" action="/ingest" enctype="multipart/form-data">
<input type="file" name="file">
${requiredTitleField("corpus-title")}
${metaInputs({ authorPlaceholder: "Author" })}
<textarea name="body" rows="6" placeholder="Text or notes"></textarea>
<p><button>Preserve + index</button></p>
</form>
</div>`;
  } else {
    form = `<div class="card"><p>Anyone can view this library. <a href="/signup">Sign up</a> to post under a name, or <a href="/upload">upload</a> without an account. Corpus uploads are reviewed for safety before they appear. Aziel Library stays operator-only.</p><p><a class="button" href="/signup">Sign up</a> <a class="button ghost" href="/upload">Upload</a></p></div>`;
  }
  return `<section class="hero"><h1>Corpus library</h1><p class="muted">Files from every other account. Search, open a card, or <a href="/upload">upload</a> your own.</p>${libraryFileCountHtml({ records_packed, records_aziel, records_corpus, shelf: "corpus" })}${exploreRowHtml("/corpus")}</section>
${browseTools({ action: "/corpus", showLibChips: false, ...state })}
${facetBlock(facets, state, "/corpus")}
${form}
${LCP_FOLD}
${docCards(rows, state, "/corpus")}
${shelfMoreHtml("/corpus", state, rows)}`;
}

export function stub(title, lead) {
  return `<div class="card"><h2>${esc(title)}</h2><p>${lead}</p><p class="muted">Hosted MASTER UI. Full local vault tools also run via <code>python3 aziel_launcher.py</code> on 127.0.0.1:8765.</p></div>`;
}

function patternCard(href, n, label, kind) {
  return `<a class="pattern-card" href="${esc(href)}"><div class="metric">${esc(n)}</div><div><b>${esc(label)}</b><div class="muted">${esc(kind)}</div></div></a>`;
}

export function patternBody({ total, domains, subjects, keywords, crosses } = {}) {
  const n = Number(total) || 0;
  const domainCards = (domains || []).map((x) => patternCard("/?domain=" + encodeURIComponent(x.label), x.n, x.label, "domain")).join("");
  const subjectCards = (subjects || []).map((x) => patternCard("/?subject=" + encodeURIComponent(x.label), x.n, x.label, "subject")).join("");
  const keywordCards = (keywords || []).map((x) => patternCard("/?keyword=" + encodeURIComponent(x.label), x.n, x.label, "keyword")).join("");
  const crossCards = (crosses || []).map((x) => patternCard("/?domain=" + encodeURIComponent(x.domain) + "&subject=" + encodeURIComponent(x.subject), x.n, x.domain + " × " + x.subject, "domain × subject")).join("");
  return `<section class="hero"><h1>Pattern</h1><p class="muted">Domain, subject, and keyword clusters across ${esc(n)} recent records. Cards open Search with that filter.</p>${exploreRowHtml("/pattern")}</section>
<div class="card"><h2>Domains</h2><div class="pattern-grid">${domainCards || "<p class=\"muted\">No domains yet.</p>"}</div></div>
<div class="card"><h2>Subjects</h2><div class="pattern-grid">${subjectCards || "<p class=\"muted\">No subjects yet.</p>"}</div></div>
<div class="card"><h2>Keywords</h2><div class="pattern-grid">${keywordCards || "<p class=\"muted\">No keywords yet.</p>"}</div></div>
<div class="card"><h2>Domain × subject</h2><div class="pattern-grid">${crossCards || "<p class=\"muted\">No pairs yet.</p>"}</div></div>`;
}

export function aboutBody() {
  return `<section class="hero about-aziel" id="aziel-eliab"><h1>About Aziel</h1>
<div class="card about-prose">
<p>Who? Does not matter. What matters is the record.</p>
<p>I do not ask you to believe a name. I ask you to read a record. This library is the public MASTER of the work: hashed receipts, timed files, and software that can be opened without taking the speaker on faith. If the files hold, the name was never the point.</p>
<p class="about-sign"><strong>— Aziel Elroi Eliab</strong></p>
</div>
<aside class="card about-record">
<p>Aziel Eliab publishes <strong>GodLock</strong>, <strong>Aziel Digital Library</strong> on this site, <strong>Aziel Runtime</strong> (MCP), and the <strong>He Didn't Jump</strong> archive. This library is the public MASTER of hashed receipts, timed files, and software.</p>
<p>Canonical Person <code>@id</code> <a href="https://www.azieleliab.com/#aziel">https://www.azieleliab.com/#aziel</a>. Also Aziel Elroi Eliab. The public identity is the work. GodLock is a product.</p>
<p><strong class="aziel-name">Aziel Library</strong> is the operator collection of Aziel Eliab’s own papers and software notes. <strong>Corpus</strong> is the public Lamb Lens shelf — anyone may browse; signed-in accounts or anonymous homepage uploads file there after safety review. The two shelves share the same scoring and hash-chain rules; they are not the same collection.</p>
<ul class="about-mission">
<li>What matters is the record.</li>
<li>Hashed receipts, timed files, and software that can be opened without taking the speaker on faith.</li>
<li>If the files hold, the name was never the point.</li>
<li>Publisher resolves to <a href="https://www.azieleliab.com/#aziel">https://www.azieleliab.com/#aziel</a>.</li>
<li><a href="${HEDIDNTJUMP_HOME}">${HEDIDNTJUMP_LABEL}</a> is a sister archive challenging the 1936 official Zioncheck suicide narrative. It does not invent court holdings.</li>
</ul>
<p>The software suite is listed on <a href="/software">Software</a>. The catalog/MCP door lives on <strong>this domain</strong> at <a href="/runtime">/runtime</a> — Aziel Runtime, a node-meshed MCP Softwares suite for digital forensics and auditing (${RUNTIME_LIVE_COUNT} live advisory engines; ${RUNTIME_LOCAL_ONLY} local_only; stubs refuse). The workers.dev origin is an alternate/sameAs. GodLock is one product Aziel Eliab built; the corresponding identity page is <a href="${GODLOCK_IDENTITY}">godlock.uk/AzielEliab</a>. How records are scored — triad SPRE × CLCE × PhysLing, and ZionPattern as a separate public reading — is on <a href="/how-its-scored">How it's scored</a>. Source: <a href="https://github.com/AzielEliab/aziel-corpus">github.com/AzielEliab/aziel-corpus</a>.</p>
</aside>
</section>`;
}

export function whoBody() {
  return `<section class="hero about-aziel" id="who-is-aziel-eliab"><h1>Who is Aziel Eliab</h1>
<div class="card about-prose">
<p>${esc(WHO_IS_AZIEL_ELIAB)}</p>
</div>
</section>`;
}

export function howItsScoredBody() {
  return `<section class="hero"><h1>How it's scored</h1>
<p class="muted">Public scoring on Aziel Corpus Library. Published numbers: the triad (always, when scored), ZionPattern Solver (when that reading applies), unranked Bayesian posterior, and HEURISTIC possibility.</p></section>
<div class="card">
<h2>Triad — always published</h2>
<p>The <strong>triad</strong> is the primary report card. It is always computed and always shown on a scored record. TRIAD_V3 public combined is the <strong>36-cycle mean</strong> of applicable factors:</p>
<p><code>triad_cycle_mean = mean(factor_i × factor_j)</code> for i,j in {physics, linguistics, bayesian, truth_formula, CLCE, SPRE} (36 pairings when all six apply, including diagonals).</p>
<p>Also stored: <code>geometric_mean_applicable = (Π applicable SPRE/CLCE/PLR)<sup>1/n</sup></code>. Named axis products: physics × linguistics, bayesian × truth_formula, CLCE × SPRE. Display is <code>round(combined × 100)</code> and is never written back into combined. <code>triad_raw</code> freezes to the content SHA-256 at first REVIEW_SCORE. Downloads verify bytes. They do not mint a new mean. No collection offset. Ingest always runs this path. Stored papers remint via <code>GET /v1/recalibrate-all</code> (repeat <code>?all=1</code> until <code>done:true</code>; alias <code>GET /v1/verify-backfill?recalibrate=1</code>). Scores recalibrate when papers are uploaded so an early lie cannot poison the shelf forever.</p>
<ul>
<li><strong>SPRE</strong> — provenance completeness (title, body ≥ 20, hash, structure, author, evidence language). physics_language and independent_source are audit flags, not silent rank boosters.</li>
<li><strong>CLCE</strong> — structural match: claims↔evidence + headings + verified-file bit. <code>x_CLCE = 0.7×rd + 0.3×sp</code>. Token Jaccard is audit-only. SHA-256 hex is never layer P. Omit if no claims (never 0). Light PASS iff x_CLCE ≥ 0.7.</li>
<li><strong>PhysLing</strong> — equal-weight physics × linguistics. linguistic_neutrality is 1.00 PASS / 0.70 REVIEW / 0.25 FLAG. Applies on a unit span or (conservation/causal verb + quantity), or energy/engineering. Bare energy / force / forensic do not qualify.</li>
<li><strong>Truth Formula</strong> — Cover-Up Truth Formula v1/v2 (T0/T1/T2, ΔT, suppression, metadata shadows, backpull) on archival/cover-up papers. Ordinary Softwares/AZDOC filings use a documented subset. Omit if N/A.</li>
<li><strong>Bayesian</strong> — unranked likelihood of internal consistency (five Bernoulli checks). Not world accuracy. Never a shelf sort key.</li>
</ul>
<p>N/A components stay stored for audit with <code>applicable:false</code> and never enter the cycle as 0. Possibility stays a separate HEURISTIC over lattice time×geo pins.</p>
<p class="muted">See a record page, <code>GET /v1/review?record_id=</code>, or <a href="/help.txt">/help.txt</a> and <a href="/help/how-to-read-scores.txt">how to read scores</a>.</p>
</div>
<div class="card">
<h2>AZCoherence — second-pass triad coherence</h2>
<p><strong>AZCoherence</strong> (AZC-0.1, slug <code>azcoherence</code>) is Softwares Plain / scoring-review. After the primary triad, it reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. Peer <strong>AZ-CLCE</strong> detects R/D/P inconsistency. Never invents evidence. FragGate is the single door. Author Aziel Eliab.</p>
<p class="soft-links"><a class="button" href="${esc(AZCOHERENCE_WORKER_HOME)}">Worker</a> <a class="button ghost" href="${esc(AZCOHERENCE_GITHUB)}">GitHub</a> <a class="button ghost" href="/runtime/v1/fraggate/describe?slug=azcoherence">FragGate describe</a> <a class="button ghost" href="/software">Software</a></p>
<p class="muted">${esc(AZCOHERENCE.dual_surface)} Compatible AI clients: ${esc(AI_CLIENTS)}.</p>
</div>
<div class="card">
<h2>Possibility vs Bayesian</h2>
<p><strong>Bayesian</strong> is an unranked Beta-Bernoulli posterior from review priors (evidence, physics, language, SPRE, CLCE).</p>
<p><strong>Possibility</strong> is a labeled <code>HEURISTIC</code> in [0,1] (or refuse) derived from hashchain lattice time×geo pins: support density, contradiction density, travel/plausibility. It asks: could this have occurred as stated given the anchors?</p>
<p>Adaptive learning via hashchain lattice for recollection and reasoning. LEARN / POISON_LEARN / MAP_PIN / POSSIBILITY_SCORE append. Recollection is tip + prev-hash verify (fail closed). No opaque memory store. No LLM-as-memory. Sister cite: <a href="https://github.com/AzielEliab/4dmap">4DMap 4DM-WP-1.0</a>.</p>
<p class="muted"><code>GET /v1/possibility?record_id=</code> · <code>GET /v1/recollect?record_id=</code> · <code>GET /v1/pin?record_id=</code> · <code>GET /v1/poison-learn</code></p>
</div>
<div class="card">
<h2>ZionPattern Solver — honest reading</h2>
<p><strong>ZionPattern Solver</strong> is the secondary public score. It stays separate from the triad. It qualifies only for historical, research, investigation, and crime documents. Philosophy, software, hardware, and designs omit the ZionPattern line (never shown as 0). Zioncheck Visual Archive vols 1–5 are the seed baseline and always display <strong>75</strong>. Provisional and assistive.</p>
<p>A published reading of <strong>75</strong> is intentional suppression confidence — the ceiling. <strong>Lower is more natural</strong>: less confidence that a suppression pattern holds. The solver also keeps a 25 uncertainty floor so thin evidence cannot pretend to be certainty in the other direction.</p>
<p>If a later paper supersedes an earlier one <em>and</em> proves a pattern break with first-hand / primary materials only, the succession chain can be force-rescored. Narrative, news, and second-source materials never trigger that path.</p>
</div>
<div class="card">
<h2>Where to go next</h2>
<p class="soft-links"><a class="button" href="/software">Software</a> <a class="button ghost" href="/runtime">Runtime</a> <a class="button ghost" href="/pattern">Pattern</a> <a class="button ghost" href="${ABOUT_PATH}">${ABOUT_NAV_LABEL}</a> <a class="button ghost" href="/help.txt">help.txt</a> <a class="button ghost" href="/help/how-to-read-scores.txt">Read scores</a> <a class="button ghost" href="/help/uploads.txt">uploads</a> <a class="button ghost" href="/llms.txt">llms.txt</a> <a class="button ghost" href="/cite.json">cite.json</a></p>
</div>`;
}

function distributionAnchor(l) {
  if (l.muted) {
    return `<a class="runtime-muted" href="${esc(l.href)}" rel="noopener noreferrer">${esc(l.label)}</a>`;
  }
  return `<a class="${l.primary ? "button" : "button ghost"}" href="${esc(l.href)}" rel="noopener noreferrer">${esc(l.label)}</a>`;
}

export function runtimeDistributionButtons() {
  return runtimeDistributionLinks().map(distributionAnchor).join(" ");
}

export function runtimeBody(version) {
  const ver = resolveRuntimeVersion(version);
  const changelog = RUNTIME_CHANGELOG.map((line) => `<li>${esc(line)}</li>`).join("");
  return `<section class="hero"><h1>${esc(RUNTIME_TITLE)}</h1>
<p>${esc(RUNTIME_ABSTRACT)}</p>
<p class="runtime-dist">${runtimeDistributionButtons()}</p>
<p class="muted">Softwares stay heading then list on <a href="/software">Softwares</a>. Scoring is explained on <a href="/how-its-scored">How it's scored</a>. HTTP <code>/p/{slug}/{op}</code> is a proxy. Session tools are advanced/internal. Hosted AZAI is protocol mirror + Lamb check. Suite mesh is read-only QNM ON — <a href="/v1/mesh"><code>/v1/mesh</code></a> · <a href="/runtime/v1/mesh"><code>/runtime/v1/mesh</code></a>. GET <code>/v1/mesh</code> never enables. Disable is refused. This public HTTPS surface is a counts/status rollup. Cold copies survive a pull. Re-expand is archive restore. Reheal is self tip + trusted pull or phoenix-WAIT. Network never lies to stay alive. No rewrite key. Remain-OFF untouched. No invented Zenodo DOIs. Author Aziel Eliab (aka Aziel Elroi Eliab; primary credit Aziel Eliab). GodLock is one catalog engine; identity at <a href="${GODLOCK_IDENTITY}">godlock.uk/AzielEliab</a>.</p></section>
<div class="card">
<h2>Version ${esc(ver)}</h2>
<p>Cite live <a href="/runtime/v1/health"><code>/runtime/v1/health</code></a> (fallback ${esc(RUNTIME_VERSION)}). SoT LIVE: <code>${esc(RUNTIME_SOT_BRANCH)}</code> <code>${esc(RUNTIME_GIT_SHA)}</code> / version_id <code>${esc(RUNTIME_VERSION_ID)}</code>. Engine count must match: <strong>${esc(String(RUNTIME_LIVE_COUNT))} live advisory engines</strong>; <strong>${esc(RUNTIME_LOCAL_ONLY)} local_only</strong>; stubs refuse. Prefer same-origin <code>/runtime/*</code>. One door — discover, route, refuse. Kernel: <a href="${esc(RUNTIME_KERNEL)}">github.com/AzielEliab/fraggate</a> (FG-0.1). Engine manifest: <code>/runtime/v1/runtime.json</code> (not library <code>/v1/runtime</code>). Author Aziel Eliab.</p>
<p class="muted">${esc(runtimeLaunchNote())} VPN HTTPS/WS REAL; WireGuard/OpenVPN SLOT; channel_plane <code>worker_hardware:false</code>. Plane B Framagit stays SLOT (<code>CNS-NO-FORGE-MIRROR</code>). Plane C stays SLOT (<code>CNS-OPERATOR-ATTEST</code>).</p>
<ul>${changelog}</ul>
</div>
<div class="card">
<h2>FragGate how-to (prefer)</h2>
<p>AIs and tools should call these Digital Library URLs first (send <code>User-Agent: Mozilla/5.0</code>):</p>
<ol>
<li><strong>Discover.</strong> <a href="/runtime/v1/fraggate/list"><code>GET /runtime/v1/fraggate/list</code></a> (MCP <code>fraggate_list</code>). Describe one name with <code>fraggate_describe</code>.</li>
<li><strong>Route.</strong> <code>POST /runtime/v1/fraggate/call</code> (MCP <code>fraggate_call</code>) with <code>{ name|slug, op, payload, claim? }</code>. DecisionGATE runs before exec.</li>
<li><strong>Refuse.</strong> Unknown names return <code>FG-HALLUC-TOOL</code>. ${esc(RUNTIME_LOCAL_ONLY)} stays local_only. Stub verbs refuse.</li>
<li><strong>Show the output</strong> (<code>display.title</code>, <code>display.summary</code>), then take the next input.</li>
</ol>
<p>Compatible AI clients: ${esc(AI_CLIENTS)}.</p>
<p class="soft-links"><a class="button" href="/runtime/v1/fraggate/list">fraggate/list</a> <a class="button ghost" href="/runtime/v1/fraggate">fraggate</a> <a class="button ghost" href="/runtime/mcp">MCP</a> <a class="button ghost" href="/runtime/openapi.json">OpenAPI</a> <a class="button ghost" href="/runtime/v1/skill">skill</a></p>
</div>
<div class="card">
<h2>Same-origin pull (this domain)</h2>
<ul>
<li><a href="/runtime/v1/health"><code>/runtime/v1/health</code></a> — live health (version ${esc(ver)}, door=fraggate, ${esc(String(RUNTIME_LIVE_COUNT))} live engines)</li>
<li><a href="/runtime/v1/uses"><code>/runtime/v1/uses</code></a> — local API use log for this door (does not increment)</li>
<li><a href="/runtime/v1/mesh"><code>/runtime/v1/mesh</code></a> · <a href="/v1/mesh"><code>/v1/mesh</code></a> — suite Live Nodes / mesh status (human mesh presence + current website page viewers — not Softwares <code>software_nodes</code>, not uses; read-only QNM ON; counts/status rollup; CROSS-NETWORK-SURVIVAL-1.0: cold copies survive a pull; crawlers are extra shelves; re-expand is archive restore (MESH-REEXPAND-1.0); reheal is self tip + trusted pull or phoenix-WAIT (MESH-REHEAL-1.0); NO-LIE-NO-REWRITE-1.0: network never lies to stay alive; no rewrite key)</li>
<li><a href="/runtime/v1/runtime.json"><code>/runtime/v1/runtime.json</code></a> — runtime manifest</li>
<li><a href="/runtime/v1/skill"><code>/runtime/v1/skill</code></a> — runtime skill markdown</li>
<li><a href="/runtime/v1/fraggate"><code>/runtime/v1/fraggate</code></a> · <a href="/runtime/v1/fraggate/list"><code>/runtime/v1/fraggate/list</code></a> · <code>POST /runtime/v1/fraggate/call</code></li>
<li><code>GET /runtime/v1/pull/{slug}</code> — pull descriptor (example <a href="/runtime/v1/pull/aziel-corpus"><code>/runtime/v1/pull/aziel-corpus</code></a>)</li>
<li><code>GET /runtime/v1/bundle/{slug}</code> — bundle alias of pull</li>
<li><a href="/runtime/v1/catalog.json"><code>/runtime/v1/catalog.json</code></a> — machine catalog</li>
<li><a href="/runtime/openapi.json"><code>/runtime/openapi.json</code></a> — combined OpenAPI</li>
<li><code>POST /runtime/mcp</code> — MCP JSON-RPC (thin FragGate door)</li>
<li><a href="/runtime/llms.txt"><code>/runtime/llms.txt</code></a> · <a href="/runtime/cite.json"><code>/runtime/cite.json</code></a> · <a href="/runtime/robots.txt"><code>/runtime/robots.txt</code></a></li>
<li>Library alias: <a href="/v1/runtime.json"><code>/v1/runtime.json</code></a> (distinct from library package <a href="/v1/runtime"><code>/v1/runtime</code></a>)</li>
<li class="muted">Advanced/internal: <code>POST /runtime/v1/session/open</code> then <code>POST /runtime/v1/session/{id}/exec</code>. Prefer <code>fraggate_call</code>.</li>
</ul>
<p class="soft-links"><a class="button" href="/runtime/v1/runtime.json">runtime.json</a> <a class="button ghost" href="/runtime/v1/skill">skill</a> <a class="button ghost" href="/runtime/v1/health">health</a> <a class="button ghost" href="/runtime/v1/catalog.json">catalog.json</a> <a class="button ghost" href="/runtime/openapi.json">OpenAPI</a></p>
</div>
<div class="card">
<h2>Alternate origin (sameAs)</h2>
<p>Same Aziel Runtime ${esc(ver)} Worker without the <code>/runtime</code> prefix. Prefer the library URLs above; keep this origin as alternate/sameAs:</p>
<ul>
<li><a href="${esc(RUNTIME_ORIGIN)}/">${esc(RUNTIME_ORIGIN)}/</a></li>
<li><a href="${esc(RUNTIME_ORIGIN)}/v1/fraggate/list"><code>/v1/fraggate/list</code></a> · <a href="${esc(RUNTIME_ORIGIN)}/v1/health"><code>/v1/health</code></a> · <a href="${esc(RUNTIME_ORIGIN)}/openapi.json"><code>/openapi.json</code></a></li>
<li><code>POST ${esc(RUNTIME_ORIGIN)}/mcp</code></li>
<li><a href="${esc(RUNTIME_ORIGIN)}/llms.txt">llms.txt</a> · <a href="${esc(RUNTIME_ORIGIN)}/cite.json">cite.json</a> · <a href="${esc(RUNTIME_GITHUB)}">GitHub</a></li>
</ul>
<p class="muted">Counted downloads stay on each product Worker <code>/download</code> + <code>/count</code>. The Software tab lists those cards. AzielTether is the survival mesh for downloaded nodes. A counted download is a cold multiply of the vault tip. Suite mesh is read-only <strong>ON</strong> — Live Nodes via <a href="/v1/mesh"><code>/v1/mesh</code></a> (human mesh presence + current website page viewers; Softwares stay <code>software_nodes</code>; uses stay on Nodes).</p>
<p class="soft-links"><a class="button ghost" href="/software">Software catalog</a> <a class="button ghost" href="/how-its-scored">How it's scored</a> <a class="runtime-muted" href="${esc(RUNTIME_ORIGIN)}/">Open alternate origin</a> <a class="button ghost" href="/runtime/v1/catalog.json">catalog.json</a> <a class="button ghost" href="/v1/lattice">Lattice API</a> <a class="button ghost" href="${esc(RUNTIME_GITHUB)}">GitHub</a></p>
</div>`;
}

function pillClass(label) {
  return /\d/.test(String(label)) && !/live on Worker/i.test(String(label)) ? "pill ok" : "pill";
}

function softCard(p) {
  const cls = ["soft-card"];
  if (p.root) cls.push("root");
  if (p.door) cls.push("door");
  if (p.catalog_only) cls.push("catalog-only");
  if (p.featured) cls.push("featured");
  const tagLabel = p.root ? "AI root" : p.door ? "Door" : p.catalog_only ? "Catalog-only" : p.kind === "gate" ? "Gate" : p.kind === "lock" ? "Lock" : "Software";
  const tag = `<span class="lib-tag ${p.root || p.door ? "aziel" : "corpus"}">${tagLabel}</span> `;
  const pills = (p.pills && p.pills.length ? p.pills : (p.countLabel ? [p.countLabel] : []))
    .map((label) => `<span class="${pillClass(label)}">${esc(label)}</span>`).join("");
  const ver = p.version ? `<span class="pill">v${esc(p.version)}</span>` : "";
  const links = (p.links || []).map((l) => {
    if (l.muted) return `<a class="runtime-muted" href="${esc(l.href)}" rel="noopener noreferrer">${esc(l.label)}</a>`;
    return `<a class="${l.primary ? "button" : "button ghost"}" href="${esc(l.href)}">${esc(l.label)}</a>`;
  }).join("");
  return `<article class="${cls.join(" ")}" data-slug="${esc(p.slug || "")}" data-kind="${esc(p.kind || "")}">${tag}<h3>${esc(p.name)}</h3><div class="soft-meta">${ver}${pills}</div><p>${esc(p.blurb)}</p><p class="soft-links">${links}</p></article>`;
}

function softSection(title, rows) {
  if (!rows.length) return "";
  return `<section class="soft-section"><h2>${esc(title)}</h2><div class="soft-grid">${rows.map(softCard).join("")}</div></section>`;
}

export function softwareBody(model = {}) {
  const products = model.products || [];
  const hub = model.hub;
  const groups = { plain: [], gate: [], lock: [] };
  for (const p of products) {
    const k = p.kind && groups[p.kind] ? p.kind : "plain";
    groups[k].push(p);
  }
  if (hub) groups.plain.unshift(hub);
  const chip = softwareChip();
  return `<section class="hero" data-softwares="1"><h1>Softwares</h1></section>
${softSection("Software", groups.plain)}
${LCP_FOLD}
${softSection("Gate", groups.gate)}
${softSection("Lock", groups.lock)}
<div class="card"><p class="soft-links runtime-dist">${runtimeDistributionButtons()}</p>
<p class="muted">Softwares heading then list — Plain → Gate → Lock (Clock is a separate lane from Lock). MCP Softwares via <code>fraggate_call</code> only. FragGate is THE single door. Human UI on the Runtime Worker (<code>#op-panel</code> <code>#dashboard</code> <code>#fg-console</code> <code>#task-*</code> + About Aziel + hashtags + <code>/download</code>). SoT LIVE <code>${esc(RUNTIME_SOT_BRANCH)}</code> <code>${esc(RUNTIME_GIT_SHA)}</code> / version_id <code>${esc(RUNTIME_VERSION_ID)}</code>. Lamb Lens ${esc(LAMB_LENS_PATH)}. Dual surface. NO-LIE. Growth-ON.</p>
<p class="soft-links"><a class="button" href="/runtime">${esc(chip)}</a> <a class="button ghost" href="/how-its-scored">How it's scored</a> <a class="button ghost" href="/runtime/v1/software">/v1/software</a> <a class="button ghost" href="/runtime/mcp">MCP</a> <a class="button ghost" href="/runtime/v1/uses">uses</a> <a class="button ghost" href="/v1/lattice">Lattice API</a> <a class="button ghost" href="${GODLOCK_IDENTITY}">godlock.uk/AzielEliab</a> <a class="button ghost" href="${HEDIDNTJUMP_HOME}">${esc(HEDIDNTJUMP_LABEL)}</a> <a class="button ghost" href="https://github.com/AzielEliab/aziel-corpus">aziel-corpus</a> <a class="button ghost" href="${esc(RUNTIME_GITHUB)}">aziel-runtime</a></p></div>
${softwareHydrateScript()}`;
}

/** After first paint: if SSR timed out empty, fill cards from cached Worker SSoT. Never rewrite purpose copy. */
export function softwareHydrateScript() {
  return `<script>
(function(){
  var root=document.querySelector("[data-softwares]");
  if(!root||!("fetch"in window))return;
  if(document.querySelectorAll("article.soft-card[data-slug]").length>=8)return;
  var ctrl=typeof AbortController==="function"?new AbortController():null;
  if(ctrl)setTimeout(function(){try{ctrl.abort();}catch(e){}},2500);
  fetch("/v1/software?view=tab",{headers:{Accept:"application/json"},credentials:"omit",signal:ctrl&&ctrl.signal})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(j){
      if(!j||!Array.isArray(j.products)||!j.products.length)return;
      var host=document.querySelector(".soft-grid")||root.parentNode;
      if(!host)return;
      j.products.forEach(function(p){
        if(!p||!p.slug)return;
        if(document.querySelector('article.soft-card[data-slug="'+String(p.slug).replace(/"/g,"")+'"]'))return;
        var a=document.createElement("article");
        a.className="soft-card";
        a.setAttribute("data-slug",p.slug);
        if(p.kind)a.setAttribute("data-kind",p.kind);
        var h=document.createElement("h3");
        h.textContent=p.name||p.slug;
        var t=document.createElement("p");
        t.textContent=p.one_line||"";
        a.appendChild(h);
        a.appendChild(t);
        host.appendChild(a);
      });
    })
    .catch(function(){});
})();
</script>`;
}

export { treeBody, mapBody, historicalBody, gazetteerBody, intelligenceBody, healthBody, verifyBody, recordBody, receiptBody, ocrPageBody, ocrBody, ocrFormHtml, SPECTRAL_LENSES, blockedAvBody } from "./hosted-pages.js";
export { exploreRowHtml, startPathsHtml, agentsTabHtml, EXPLORE_LINKS } from "./explore-nav.js";
