# MESH-OUTLET-1.0

Corpus cite-sync consumer for the aziel-runtime SoT mesh updater. Draft contract. No merge and no deploy in the change that added this file.

Author identity is **Aziel Eliab** only.

## Authority

`GET https://aziel-runtime.vibelock.workers.dev/v1/software`

Frozen bake at the time this contract was written:

| Field | Value |
| --- | --- |
| version | `2.0.0-rc1` |
| branch | `main` |
| git | `231b02f` |
| git_full | `231b02fcbb7b50fbd52762a49329042bc1715fe9` |
| Softwares tab `count` | `42` |
| `live_count` | `41` |
| isolation `software_count` | `33` |

Do not equate the Softwares tab count, the live engine count, and the isolation software_count. The live `count_note` is the framing text.

## What this outlet applies

- Runtime / suite cite: version, branch, short git, full git, optional `version_id`
- Softwares count framing: tab count, live count, local_only count, isolation software_count, `count_note`, framing
- Ask Jeeves suite-help wording

Ask Jeeves is FragGate op `jeeves` on `aziel-corpus` (suite help). `software_tab` is false. `interface_call` is `jeeves_help`. It is not a Softwares-tab card and it does not change the tab count.

## Routes

| Method | Path | Who |
| --- | --- | --- |
| GET, HEAD | `/v1/mesh/outlet` | Public. Returns the applied cite, or the frozen last-known cite when nothing has been stored. |
| GET | `/v1/mesh/outlet?sync=1` | Operator token. Pulls live `GET /v1/software` and stores it. |
| POST | `/v1/mesh/outlet` | Operator token. Receives one fan-out envelope. |
| GET, HEAD | `/v1/inventory` | Public. Last-known peer inventory, or an honest not-synced empty list. |
| GET | `/v1/inventory?sync=1` | Operator token. Refreshes peer hubs. |

Operator header: `X-Aziel-Operator-Token` (`OPERATOR_TOKEN`, `GATE_TOKEN`, or `LIBRARY_OPERATOR_TOKEN`).

`/runtime/v1/mesh/*` stays a proxy of the runtime Worker. The corpus outlet is `/v1/mesh/outlet` on this library host. It is not forwarded to the runtime mesh proxy.

## Fan-out envelope

```json
{
  "spec": "MESH-OUTLET-1.0",
  "author": "Aziel Eliab",
  "identity": "Aziel Eliab",
  "sot": {
    "branch": "main",
    "git": "231b02f",
    "git_full": "231b02fcbb7b50fbd52762a49329042bc1715fe9",
    "version": "2.0.0-rc1",
    "version_id": "a8f7fdc9"
  },
  "softwares": {
    "count": 42,
    "live_count": 41,
    "local_only_count": 1,
    "isolation_software_count": 33,
    "count_note": "Softwares-tab count includes placements. Do not equate with isolation software_count."
  },
  "suite_help": {
    "name": "Ask Jeeves",
    "slug": "jeeves",
    "software_tab": false,
    "parent_slug": "aziel-corpus",
    "fraggate_slug": "aziel-corpus",
    "fraggate_op": "jeeves",
    "interface_call": "jeeves_help"
  }
}
```

Omitted cite fields stay at the previous last-known value. `version_id: null` clears that field only when the key is present.

## Refusals

| Code | When |
| --- | --- |
| `OUTLET-AUTH` | POST or `sync=1` without the operator token |
| `OUTLET-IDENTITY` | `author` or `identity` is anything other than Aziel Eliab |
| `OUTLET-NO-ROWS` | Envelope includes `records`, `rows`, `library_rows`, `inventory`, or `library` arrays |
| `OUTLET-SUITE-HELP` | Ask Jeeves is marked `software_tab: true`, or the op / parent slug is not corpus `jeeves` |
| `OUTLET-SHA` / `OUTLET-COUNT` / `OUTLET-VERSION` | Cite field is present and not a legal value |
| `OUTLET-COUNTERS` | A write targets a download-counter KV key (internal guard) |

`downloads`, `views`, and the other counter fields on an envelope are dropped. They are not stored and they do not increment `/count`.

## Unreachable peers

`GET /v1/inventory?sync=1` reads:

- This library: packed `library:index:v1` (local)
- `https://www.azieleliab.com/v1/library-index`
- `https://godlock.uk/v1/library-index`
- `https://www.hedidntjump.com/v1/library-index`

A failed fetch keeps that peer's last-known rows and sets `reachable: false`, `status: "unreachable"`, `invented: false`. If there is no last-known list, `rows` is `[]`. Rows without an `AZDOC-…` `record_id` are dropped. A live response that has no row list keeps the last-known rows and says the list was unspecified. This outlet does not invent library rows to fill a gap.

A failed SoT pull keeps the last-known cite the same way (`source: "last-known"`, `reachable: false`).

## Storage

KV keys, separate from view and download counters:

- `mesh:outlet:sot:v1`
- `mesh:outlet:inventory:v1`

Binding: `DOWNLOADS`. The keys are not `aziel-corpus|__views__` or `aziel-corpus|__total__`.
