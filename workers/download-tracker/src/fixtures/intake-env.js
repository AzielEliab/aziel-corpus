/** Stub env for CORPUS-INTAKE-SAFETY-1.0 tests. Records every write so tests can prove nothing was stored. */
export function intakeStubEnv(extra = {}) {
  const writes = { sql: [], binds: [], puts: [], kv: [] };
  const kv = new Map();
  const files = new Map();
  // In-memory hash-only intake tables so flood / rate checks can be exercised.
  const tables = extra.tables || { intake_seen: [], intake_refusals: [] };
  const intakeTable = (sql) => (sql.match(/\b(?:INTO|FROM)\s+(intake_seen|intake_refusals)\b/i) || [])[1];
  const whereRows = (sql, binds) => {
    const t = intakeTable(sql);
    const m = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    const conds = m ? m[1].split(/\s+AND\s+/i).map((c) => c.match(/(\w+)\s*(>=|=)\s*\?/)) : [];
    return tables[t].filter((r) => conds.every((c, i) => (c[2] === "=" ? r[c[1]] === binds[i] : String(r[c[1]]) >= String(binds[i]))));
  };
  const env = {
    DB: {
      prepare(sql) {
        const st = {
          binds: [],
          bind(...args) { st.binds = args; return st; },
          async run() {
            if (extra.failReceipts && /intake_refusals/.test(sql)) throw new Error("receipt store down");
            if (extra.failFlood && /intake_seen/.test(sql)) throw new Error("flood store down");
            writes.sql.push(sql);
            writes.binds.push(st.binds);
            const ins = sql.match(/INSERT\s+INTO\s+(intake_seen|intake_refusals)\s*\(([^)]*)\)/i);
            if (ins) {
              const cols = ins[2].split(",").map((c) => c.trim());
              tables[ins[1]].push(Object.fromEntries(cols.map((c, i) => [c, st.binds[i]])));
            }
            return { success: true, meta: { changes: 1 } };
          },
          async first() {
            if (extra.failFlood && /intake_seen/.test(sql)) throw new Error("flood store down");
            if (/SELECT\s+COUNT\(\*\)\s+AS\s+n\s+FROM\s+intake_/i.test(sql)) return { n: whereRows(sql, st.binds).length };
            if (typeof extra.first === "function") return extra.first(sql, st.binds);
            return null;
          },
          async all() {
            if (extra.failFlood && /intake_seen/.test(sql)) throw new Error("flood store down");
            if (intakeTable(sql)) {
              const lim = Number((sql.match(/LIMIT\s+(\d+)/i) || [])[1] || 1e9);
              return { results: whereRows(sql, st.binds).slice().reverse().slice(0, lim) };
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
    tables,
    ...extra,
  };
  return env;
}

/** True when any corpus content write happened (record row, ledger append, object put). */
export function contentWritten(env) {
  const w = env.writes;
  if (w.puts.length || w.kv.length) return true;
  // Any row write other than the hash-only refusal receipt counts as content written.
  // intake_seen is hash-only flood bookkeeping (no content), so it does not count either.
  return w.sql.some((s) => /\b(INSERT|REPLACE|UPDATE)\b/i.test(s) && !/intake_(refusals|seen)/i.test(s));
}

/** True when any captured write (SQL binds, object keys, KV keys) contains the marker. */
export function writesContain(env, marker) {
  const blob = JSON.stringify(env.writes);
  return blob.includes(marker);
}
