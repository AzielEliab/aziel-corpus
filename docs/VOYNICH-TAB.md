# voynich tab (`/voynich`, `/voynich.json`)

Front-door label and machine name are exactly `voynich`.

The tab reads the public Unseal registry and does not post a wrap (`post` false, `wrap_sent` false) until Aziel says post. `LATTICE_REMOTE` stays off.

- Receipts: `https://timetounsealthebook.net/receipts/index.json` (`test_id`, `ledger_entry_hash`, `sha256`, `source_blob`, `decryption_complete` false).
- Theories: `https://timetounsealthebook.net/data/theories.json`. A theory id that is not in the local stub list is housed as new and can be wrapped as `timetounsealthebook.theory`.
- Tests: `https://timetounsealthebook.net/data/tests.json`. Method cards are listed. A method-input run wraps as `timetounsealthebook.method_run`. The page does not run the procedure.
- Keywords: `https://timetounsealthebook.net/data/keywords.json`. Each keyword is filed against the test ids it names. A missing log lists nothing. A lattice row is `timetounsealthebook.keyword` plus one `test_id`.

Not live. `decryption_complete` stays false. Cap-7 is not ICANN (`cap7_is_icann` false, `resolves_to_hub` false). Paid sat is HELD.

## Lattice hooks

Unseal receipts ride the secondary lattice from `#195`. `LATTICE_REMOTE` defaults off (fail closed). Wrap needs the same operator grant as GodLock bidir: operator session, `X-Aziel-Operator-Token`, `Authorization: Bearer`, or `X-Aziel-Runtime-Token`.

- `POST /v1/lattice/wrap` — one hash block with `offline: false` and no username, plus `unseal: { source: "timetounsealthebook", kind, id, slot }`. The row is stored on the `unseal` plane. `entry_hash` is the receipt hash.
- `GET /v1/lattice/pull?entry_hash=&unseal=1` — pulls that one row back. A hash that is not an Unseal receipt returns `UNSEAL-PULL-MISS` and does not substitute another row.
- A `tiebreak` field is refused (`LATTICE-TIEBREAK-CORPUS`). `unseal=1` together with `aggregate` is refused the same way. A second site for one aggregated hash is the same refusal. Corpus does not choose a winner. aziel-runtime owns tie-break. A different block that is not a site change stays `LATTICE-DOUBLE`.
- `lattice.tab` is accepted only with an Unseal pointer, and only when the value is `voynich`. A GodLock block that carries `tab` is refused (`VOYNICH-TAB`).
- `decryption_complete: true` is refused (`UNSEAL-DECRYPTION-HELD`).

The tip cite and HTML security headers are unchanged by this tab.
