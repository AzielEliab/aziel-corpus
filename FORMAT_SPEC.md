# Aziel Intelligence Package Format Specification v1

## Goals

1. No dependence on a vendor registry.2. Every package can be verified with only SHA-256 and ZIP support.3. Models and knowledge data remain separate from the corpus.4. Reprocessing never mutates an original object.5. Future runtimes can reimplement the format from this document alone.

## AZM

Extension: `.azm`

Magic: `AZIEL_MODEL_PACKAGE_V1`

## AZK

Extension: `.azk`

Magic: `AZIEL_KNOWLEDGE_KIT_V1`

## Container

Both are ZIP files containing:
```text
manifest.json
integrity.json
payload/<one or more files>

```

`manifest.json` keys:
```json
{"magic": "AZIEL_MODEL_PACKAGE_V1","format_version": 1,"package_id": "aziel.subject.local.v1","package_type": "HASHED_NAIVE_BAYES_TEXT","version": "1.0.0","payloads": {"model.json": {"sha256": "...", "bytes": 1234}},"metadata": {}}

```

Canonical manifest bytes are UTF-8 JSON sorted by key with separators `,` and `:` and no unnecessary whitespace. `integrity.json` stores the canonical manifest SHA-256 and optionally an HMAC-SHA256.## Native model family currently executable

`HASHED_NAIVE_BAYES_TEXT`

Payload: `model.json`

Used for locally-trained deterministic text classification. Neural tensor package types are reserved for future Aziel executors; a package can already be archived and verified even before its executor exists.

## Knowledge kit family currently executable

`ENTITY_GAZETTEER`

Payload: `kit.json`

Fields:
```json
{"entities": [{"type":"PERSON","name":"Name","aliases":["Alias"]}],"places": [{"name":"Place","aliases":[],"lat":0.0,"lon":0.0}],"dictionary": ["term"]}

```


Kits add interpretations. They never modify original bytes.

## `.azh` — Aziel Historical Geography Kit
Version 1.0 is a ZIP containing `manifest.json` and `layer.geojson`. `manifest.json` identifies 
`AZIEL_HISTORICAL_GEOGRAPHY_KIT`, source/license metadata, layer validity, confidence, and the SHA-256 of `layer.geojson`. See `HISTORICAL_GEOGRAPHY.md`.
