/**
 * Explicit origin stand-ins for tests. These answer in process.
 * They do not call global fetch for a public host, so the runner
 * guard never sees them. Unavailable and observed are different fixtures.
 */

export function isLoopbackHost(host) {
  if (host == null) return false;
  let h = String(host).trim().toLowerCase();
  if (!h) return false;
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    h = end === -1 ? h.slice(1) : h.slice(1, end);
  }
  while (h.endsWith(".")) h = h.slice(0, -1);
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1") return true;
  if (h.startsWith("::ffff:")) h = h.slice("::ffff:".length);
  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && Number(p) <= 255)) {
    return Number(parts[0]) === 127;
  }
  return false;
}

export function requestUrl(input) {
  if (input && typeof input === "object" && input.url) return String(input.url);
  return String(input || "");
}

let fixtureHits = 0;

export function originFixtureHits() {
  return fixtureHits;
}

export function unavailableResponse() {
  return new Response("unavailable", {
    status: 503,
    headers: {
      "Content-Type": "text/plain",
      "X-Aziel-Fixture": "unavailable",
    },
  });
}

function loopbackFetch(prev, input, init) {
  const url = requestUrl(input);
  let host = "";
  let protocol = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    protocol = parsed.protocol;
  } catch {
    host = "";
  }
  if ((protocol === "http:" || protocol === "https:") && isLoopbackHost(host)) {
    return prev(input, init);
  }
  return null;
}

/** Every public origin read is a local 503. Loopback test servers still pass through. */
export function installUnavailableOrigin() {
  const prev = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const local = loopbackFetch(prev, input, init);
    if (local) return local;
    fixtureHits += 1;
    return unavailableResponse();
  };
  return function restoreUnavailableOrigin() {
    globalThis.fetch = prev;
  };
}

/**
 * A real observation is whatever `handler` returns for a public URL.
 * The handler is the fixture. A null return is the unavailable 503.
 */
export function installObservedOrigin(handler) {
  const prev = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const local = loopbackFetch(prev, input, init);
    if (local) return local;
    const res = await handler(input, init, requestUrl(input));
    if (!res) return unavailableResponse();
    return res;
  };
  return function restoreObservedOrigin() {
    globalThis.fetch = prev;
  };
}

/** Service-binding stand-in. Callers that prefer AZIEL_RUNTIME never use global fetch. */
export function runtimeBinding(handler) {
  return {
    async fetch(request) {
      const res = await handler(request);
      if (!res) return unavailableResponse();
      return res;
    },
  };
}
