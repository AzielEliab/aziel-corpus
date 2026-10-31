# receipts tab (`/receipts`, `/receipts/sites`)

Front-door label is `receipts`. The library nav still says Receipts and opens the same path.

`/receipts/sites` is the subtree. Each folder is a source hub: godlock.uk, aziel-runtime, TimeToUnsealTheBook (`unseal`), azieleliab.com (`ae`), hedidntjump.com (`hdj`), and this corpus. Add a hub in `workers/download-tracker/src/receipt-aggregate.js`.

The subtree does not fetch sister pages and does not invent receipt sentences. A hash is filed only by an operator wrap.

## Lattice

Same routes as `#195`. `LATTICE_REMOTE` defaults off.

- `POST /v1/lattice/wrap` with a hash block (`offline: false`, no username) and `aggregate: { site }`. The row is stored on the `sites` plane and the hash is filed under that site folder.
- `GET /v1/lattice/pull?entry_hash=` reads it back.
- A second site for the same hash is refused (`LATTICE-TIEBREAK-CORPUS`). Corpus does not choose a winner. aziel-runtime owns tie-break. A different block that is not a site change stays `LATTICE-DOUBLE`.
- `decryption_complete: true` is refused. Cap-7 is not ICANN. Paid sat is HELD. live stays false.

The lattice row is written in D1, then the site folder is written in KV. Those two stores are not one transaction. If the KV put fails, the response is fail-closed (`filed: false`, not a 201 success). The same operator wrap can be replayed: the lattice row is already there (`LATTICE-ALREADY`) and the file is tried again. A crash between the two writes leaves the hash on the lattice until that replay. `lattice.tab` is stored only with an Unseal pointer. A GodLock block that carries `tab` is refused (`VOYNICH-TAB`).

Unseal housing stays on the `voynich` tab. An Unseal pointer and an aggregate pointer are not the same wrap.
