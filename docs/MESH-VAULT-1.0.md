# MESH-VAULT-1.0 — Snapshot vault on transfer + official-host standby

Author: Aziel Eliab only
Spec id: MESH-VAULT-1.0
Date: 2026-09-14
License: Apache-2.0
Neighbors: ACT-RECEIPT-1.0, TUN-WP-0.1, RL-WP-0.1-library, QNM-WP-1.0, ChainLock CL-0.4
Not a VPN. Not an IP-mask product. Not an untraceable-origin path.

## 0. Sentence

Every upload or download of library, software, runtime, or receipt material refreshes a content-addressed vault of the current public versions of the four official sites. If the official origin fails a ping, standby is the existing Worker packed index and an operator-run Cloudflare Tunnel to the same hostname — only while the token, DNS name, Worker, and account still exist. Pull the site, revoke the token, drop the Worker, or kill DNS and cloudflared has nowhere legal to land. That is not automatic lawful relaunch. Downloaders keep a local replica. They do not become a masked host network.

## 1. Four official surfaces

1. https://www.azielcorpuslibrary.net — Corpus / MASTER / receipts / runtime door
2. https://www.azieleliab.com — public landing
3. https://godlock.uk — public mesh stress-test node
4. https://hedidntjump.com — historical reconstruction site

Runtime catalog and software doors are included as objects under those origins, not as a fifth hidden host.

## 2. What the vault stores

On significant transfer (upload to Corpus, counted software/library download, receipt append, catalog pull):

- packed library index (AZDOC id, title, shelf, content_sha256, chain_tip)
- action-receipt chain tip + last N public receipts (four fields only)
- software catalog + version pins
- runtime catalog.json + mesh status
- per-origin health + index hash
- this spec hash

Bodies of papers already on the shelf may be included when the operator requested a full zip. Hot path stores hashes and tips, not a silent re-download of every PDF on every click.

Each vault write mints an ACT-RECEIPT-1.0 row.

## 3. Mesh bake

QNM / ChainLock treat the vault tip as a library-chain stamp. Card cap 4096B. No stamp dumps. No remote body pull required to verify the tip.

## 4. Standby when origin ping fails

TUN-WP-0.1: Cloudflare Tunnel outbound-only may front the library origin. Worker packed index is standby on the same hostname. Failover is timeout / 5xx / health miss. Visitors see the official name.

Standby is not automatic lawful relaunch after a pull. It works only while the token, DNS name, Worker, and account still exist. A process supervisor on the operator box can restart cloudflared. That is operator kit. It is not in the public contract, and it fails if the credential or hostname is gone. Pull the site, revoke the token, drop the Worker, or kill DNS and cloudflared has nowhere legal to land.

## 5. What this is not

Not a VPN. Not an IP-mask toolkit. Not an untraceable-origin upload path. Not a program that turns human, AI, or search-engine downloaders into covert tunnel servers. Not account-provisioning for third-party tunnel vendors. Not a claim that tunnel plus Worker relaunch a pulled site.

Slingshot Prep may strip embedded GPS/author tags from an export copy. The operator moves the file on their own named channel.

## 6. Reader replicas

A human, an AI client, or a search indexer may keep the packed vault they just downloaded. If the origin fails a health ping they may read the local vault and serve it on localhost. They are not instructed here to mask IP, forge origin, or stand up anonymous public hosts.

Sites pulled → public rollup is down → local node can keep verifying and appending. The mesh does not climb back onto the public hostname by itself.

## 7. Cap

Recognition of suppression risk is not a kit for hidden infrastructure. The kit that exists is: hashed shelf, public receipts, packed index, Worker standby, operator Cloudflare Tunnel on the named site — while those named surfaces still exist. After a pull, the public rollup is dead. Local verify and append remain. Phoenix is a wait / re-seal after poison or isolation, not "bring the .uk node back."
