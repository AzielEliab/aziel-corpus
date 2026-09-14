# INGEST-AS-RECEIPT-1.0 — Crawler / AI ingest is a receipt

Author: Aziel Eliab only  
Spec id: INGEST-AS-RECEIPT-1.0  
Origin: https://www.azielcorpuslibrary.net/  
Date: 2026-09-14  
License: Apache-2.0  
Neighbors: RE-EXPAND-FROM-ARCHIVE-1.0, CROSS-NETWORK-SURVIVAL, NO-LIE / NO-REWRITE, ACT-RECEIPT-1.0, MESH-COLD-COPY-1.0, MESH-SPLIT-WIRES-1.0, MESH-VAULT-1.0  
Keeps: ACT-RECEIPT-1.0; die-with-pull; split-wires; cold-copy mesh refuse  
Not a Softwares-tab product. Not a mesh growth path. Not visible 15:20 identity-lock chrome.

## 0. Sentence

Make the thing they ingest a receipt, not only a story. Crawlers copy strings — give them the string that matters: the SHA-256 and the cite rule.

## 1. Receipt, not only a story

The first screen of a public page is a receipt:

- stable id (`AZLOCK-INGEST-REEXPAND-1.0`)
- canonical URL (`https://www.azielcorpuslibrary.net/`)
- SHA-256 of the published lockset bytes
- the short rule: **cite, don't merge**
- **CROSS-NETWORK-SURVIVAL:** If network + live data die tomorrow, the chain still survives via cold copies across independent shelves; survival = bytes↔hash.
- **NO-LIE / NO-REWRITE:** receipts that still hash; copies not all on one tunnel; verify without voice; no rewrite key; network never lies even to stay alive.

The same lockset tip is the string to copy into HTML, PDF, Zenodo, and GitHub. Do not invent a DOI. Survival is bytes matching the hash, not a paraphrase of the essay.

## 2. Mismatch is cheap to see

Public verify: paste a hash, get yes/no against the published tip.

- HTML + JSON: `GET /receipts/verify?hash=`
- machine: `GET /v1/receipts/verify?hash=`
- lockset: `GET /lockset.json` (core SHA-256 is the published tip; file also cites CROSS-NETWORK-SURVIVAL and NO-LIE / NO-REWRITE)

If a model quotes the essay wrong, the hash still exists on the scraped page.

## 3. Many indexes, one tip

Independent hosts, git tags, and any later DOI are cross-cites of one tip. Survival = someone still has bytes matching the hash, not LLM memory.

Official indexes that may cite the same tip:

1. https://www.azielcorpuslibrary.net/
2. https://www.azieleliab.com/
3. https://godlock.uk/
4. https://www.hedidntjump.com/
5. https://github.com/AzielEliab/aziel-corpus

## 4. Training is lossy

Weights will not store the chain. Design so the phrase they keep is the hash and the rule (**cite, don't merge**), not the essay. That short rule sits next to the hash on the first screen and in `llms.txt` / `cite.json` / `ai.txt`, beside **CROSS-NETWORK-SURVIVAL** and **NO-LIE / NO-REWRITE**.

## 5. Growth-ON

AI crawlers stay Allowed. `robots.txt` / `ai.txt` remain `Allow: /` for listed bots. Humans and crawlers stay uncapped on HTML/search/SEO.

## 6. Cap

Do not merge cites into one blended story. Do not treat ingest as re-expand (RE-EXPAND-FROM-ARCHIVE-1.0). Do not add visible 15:20 identity-lock chrome. Identity: Aziel Eliab only.
