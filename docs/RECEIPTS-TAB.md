# receipts tab (`/receipts`, `/receipts/sites`)

Front-door label is `receipts`. The library nav still says Receipts and opens the same path.

`/receipts/sites` is the subtree. Each folder is a source hub: godlock.uk, aziel-runtime, TimeToUnsealTheBook (`unseal`), azieleliab.com (`ae`), hedidntjump.com (`hdj`), and this corpus. Add a hub in `workers/download-tracker/src/receipt-aggregate.js`.

The subtree does not fetch sister pages and does not invent receipt sentences. A hash is filed only by an operator wrap.

## Lattice

Same routes as `#195`. `LATTICE_REMOTE` defaults off.

- `POST /v1/lattice/wrap` with a hash block (`offline: false`, no username) and `aggregate: { site }`. The row is stored on the `sites` plane and the hash is filed under that site folder.
- `GET /v1/lattice/pull?entry_hash=` reads it back.
- A second site for the same hash is refused (`LATTICE-TIEBREAK-CORPUS`). Corpus does not choose a winner. aziel-runtime owns tie-break.
- `decryption_complete: true` is refused. Cap-7 is not ICANN. Paid sat is HELD. live stays false.

Unseal housing stays on the `voynich` tab. An Unseal pointer and an aggregate pointer are not the same wrap.
