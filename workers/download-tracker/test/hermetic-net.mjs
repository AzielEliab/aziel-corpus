/**
 * Default test runner guard. Loaded with node --import before any test file.
 * Non-loopback DNS and sockets are refused here, before a packet can leave.
 * A test that still reaches this guard fails in afterEach, even when the
 * product caught the error. Loopback test servers stay open.
 * Intentional observations belong in src/fixtures/hermetic-observe.js,
 * which answers locally and never calls this guard.
 */
import dns from "node:dns";
import net from "node:net";
import { pathToFileURL, fileURLToPath } from "node:url";

const MARK = Symbol.for("aziel.hermetic.net");
if (globalThis[MARK]) {
  /* node --test re-imports this file in the child; install once */
} else {
  globalThis[MARK] = true;
  globalThis.__AZIEL_HERMETIC_NET__ = true;

  const selfUrl = pathToFileURL(fileURLToPath(import.meta.url)).href;
  const flag = "--import " + selfUrl;
  const nodeOptions = String(process.env.NODE_OPTIONS || "");
  if (!nodeOptions.includes(selfUrl)) {
    process.env.NODE_OPTIONS = nodeOptions ? nodeOptions + " " + flag : flag;
  }

  const pending = [];
  let totalAttempts = 0;
  let originalSocketCalls = 0;
  let originalDnsCalls = 0;
  let lastTest = "";

  function deny(kind, target) {
    totalAttempts += 1;
    const err = new Error("HERMETIC_NET_DENIED " + kind + " " + target);
    err.code = "HERMETIC_NET_DENIED";
    pending.push({ kind, target: String(target), test: lastTest });
    return err;
  }

  function isLoopbackHost(host) {
    if (host == null) return false;
    let h = String(host).trim().toLowerCase();
    if (!h) return false;
    if (h.startsWith("[")) {
      const end = h.indexOf("]");
      h = end === -1 ? h.slice(1) : h.slice(1, end);
    }
    const zone = h.indexOf("%");
    if (zone !== -1) h = h.slice(0, zone);
    const colon = h.indexOf(":");
    if (colon !== -1 && h.indexOf(":") === h.lastIndexOf(":")) {
      /* host:port accidentally passed as one string */
      const maybePort = h.slice(colon + 1);
      if (/^\d+$/.test(maybePort)) h = h.slice(0, colon);
    }
    while (h.endsWith(".")) h = h.slice(0, -1);
    if (h === "localhost" || h.endsWith(".localhost")) return true;
    if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
    if (h.startsWith("::ffff:")) h = h.slice("::ffff:".length);
    const parts = h.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && Number(p) <= 255)) {
      return Number(parts[0]) === 127;
    }
    return false;
  }

  function hostFromUrl(input) {
    const raw = input && typeof input === "object" && input.url ? input.url : input;
    try {
      const url = new URL(String(raw));
      return { protocol: url.protocol, host: url.hostname };
    } catch {
      return { protocol: "", host: "" };
    }
  }

  const origLookup = dns.lookup;
  const origPromisesLookup = dns.promises.lookup;
  function finishLookup(err, callback) {
    if (typeof callback === "function") {
      process.nextTick(() => callback(err));
      return;
    }
    return Promise.reject(err);
  }
  dns.lookup = function lookup(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (isLoopbackHost(hostname)) {
      originalDnsCalls += 1;
      return origLookup.call(dns, hostname, options, callback);
    }
    return finishLookup(deny("dns.lookup", hostname), callback);
  };
  dns.promises.lookup = function lookup(hostname, options) {
    if (isLoopbackHost(hostname)) {
      originalDnsCalls += 1;
      return origPromisesLookup.call(dns.promises, hostname, options);
    }
    return Promise.reject(deny("dns.promises.lookup", hostname));
  };

  const skipDns = new Set([
    "setServers",
    "getServers",
    "setDefaultResultOrder",
    "getDefaultResultOrder",
    "Resolver",
    "lookup",
  ]);
  function wrapDnsNamespace(obj, label) {
    for (const key of Object.keys(obj)) {
      if (skipDns.has(key)) continue;
      const fn = obj[key];
      if (typeof fn !== "function") continue;
      obj[key] = function wrapped(hostname, ...rest) {
        const allow = key === "reverse" ? isLoopbackHost(hostname) : isLoopbackHost(hostname);
        if (allow) {
          originalDnsCalls += 1;
          return fn.call(this, hostname, ...rest);
        }
        const err = deny(label + "." + key, hostname);
        const cb = rest.find((item) => typeof item === "function");
        if (typeof cb === "function") {
          process.nextTick(() => cb(err));
          return;
        }
        return Promise.reject(err);
      };
    }
  }
  wrapDnsNamespace(dns, "dns");
  wrapDnsNamespace(dns.promises, "dns.promises");

  function hostFromConnect(args) {
    let spec = args[0];
    let hostArg = args[1];
    if (Array.isArray(spec)) {
      hostArg = spec[1];
      spec = spec[0];
    }
    if (typeof spec === "string") {
      if (spec.startsWith("/") || spec.startsWith("\\\\")) return { ipc: true, host: "" };
      return { ipc: false, host: spec };
    }
    if (typeof spec === "number") {
      return { ipc: false, host: typeof hostArg === "string" ? hostArg : "localhost" };
    }
    if (spec && typeof spec === "object") {
      if (spec.path && !spec.host && !spec.hostname && !spec.port) return { ipc: true, host: "" };
      return { ipc: false, host: spec.host || spec.hostname || "" };
    }
    return { ipc: false, host: "" };
  }

  const origConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function connect(...args) {
    const target = hostFromConnect(args);
    if (target.ipc || isLoopbackHost(target.host)) {
      originalSocketCalls += 1;
      return origConnect.apply(this, args);
    }
    const err = deny("socket", target.host || "(no host)");
    process.nextTick(() => {
      if (this.listenerCount("error") === 0) this.once("error", () => {});
      this.destroy(err);
    });
    return this;
  };

  const origFetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null;
  globalThis.fetch = async function hermeticFetch(input, init) {
    const parsed = hostFromUrl(input);
    if (parsed.protocol === "data:" || parsed.protocol === "file:" || parsed.protocol === "blob:") {
      return origFetch(input, init);
    }
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && isLoopbackHost(parsed.host)) {
      return origFetch(input, init);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return origFetch(input, init);
    }
    throw deny("fetch", (init && init.method ? init.method : "GET") + " " + String(input && input.url ? input.url : input));
  };

  const testingThisProcess = process.argv.some((arg) => arg === "--test" || /\.(?:test|spec)\.(?:js|mjs|cjs)$/.test(arg));
  if (testingThisProcess) {
    const { afterEach, beforeEach } = await import("node:test");
    beforeEach((t) => {
      lastTest = t.name;
      if (!pending.length) return;
      const lines = pending.splice(0).map((item) => item.kind + " " + item.target);
      throw new Error("unmocked external network attempt leaked into " + t.name + " after " + (lines.join(" | ")));
    });

    afterEach((t) => {
      if (!pending.length) return;
      const lines = pending.splice(0).map((item) => item.kind + " " + item.target);
      const err = new Error("unmocked external network attempt during " + JSON.stringify(t.name) + ": " + lines.join(" | "));
      err.code = "HERMETIC_NET_DENIED";
      throw err;
    });
  }

  process.on("exit", () => {
    if (pending.length) process.exitCode = process.exitCode || 1;
    console.error("HERMETIC_EXTERNAL_ATTEMPTS " + totalAttempts);
    console.error("HERMETIC_ORIGINAL_SOCKETS " + originalSocketCalls);
    console.error("HERMETIC_ORIGINAL_DNS " + originalDnsCalls);
  });
}
