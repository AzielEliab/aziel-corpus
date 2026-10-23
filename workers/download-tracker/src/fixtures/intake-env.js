/** Stub env for CORPUS-INTAKE-SAFETY-1.0 tests. Records every write so tests can prove nothing was stored. */
export function intakeStubEnv(extra = {}) {
  const writes = { sql: [], binds: [], puts: [], kv: [] };
  const kv = new Map();
  const files = new Map();
  const env = {
    DB: {
      prepare(sql) {
        const st = {
          binds: [],
          bind(...args) { st.binds = args; return st; },
          async run() {
            if (extra.failReceipts && /intake_refusals/.test(sql)) throw new Error("receipt store down");
            writes.sql.push(sql);
            writes.binds.push(st.binds);
            return { success: true, meta: { changes: 1 } };
          },
          async first() {
            if (typeof extra.first === "function") return extra.first(sql, st.binds);
            return null;
          },
          async all() {
            if (typeof extra.all === "function") {
              const r = await extra.all(sql, st.binds);
              if (r) return r;
            }
            return { results: [] };
          },
        };
        return st;
      },
      async batch() { return []; },
    },
    FILES: {
      async head(key) { return files.has(key) ? { key } : null; },
      async put(key, bytes) { writes.puts.push(key); files.set(key, bytes); },
      async get(key) { return files.has(key) ? { arrayBuffer: async () => files.get(key) } : null; },
    },
    DOWNLOADS: {
      async get(key) { return kv.has(key) ? kv.get(key) : null; },
      async put(key, value) { writes.kv.push(key); kv.set(key, String(value)); },
    },
    writes,
    // Test-only salt (the gate refuses INTAKE-NOT-READY without a real secret).
    INTAKE_SALT: "test-only-intake-salt-0123456789",
    ...extra,
  };
  return env;
}

/** True when any corpus content write happened (record row, ledger append, object put). */
export function contentWritten(env) {
  const w = env.writes;
  if (w.puts.length || w.kv.length) return true;
  // Any row write other than the hash-only refusal receipt counts as content written.
  return w.sql.some((s) => /\b(INSERT|REPLACE|UPDATE)\b/i.test(s) && !/intake_refusals/i.test(s));
}

/** True when any captured write (SQL binds, object keys, KV keys) contains the marker. */
export function writesContain(env, marker) {
  const blob = JSON.stringify(env.writes);
  return blob.includes(marker);
}
