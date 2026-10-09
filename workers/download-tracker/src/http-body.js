/**
 * Unread fetch()/cache.match() bodies hold one of the Worker's 6 concurrent
 * connections open. Enough of them and the runtime logs "A stalled HTTP response
 * was canceled to prevent deadlock" (69 times on /software in the #169 tail).
 * Always read or cancel a body you are not going to use.
 */
export async function discardBody(res) {
  try {
    if (res && res.body && !res.bodyUsed && typeof res.body.cancel === "function") await res.body.cancel();
  } catch { /* already closed */ }
}

/** Promise.all with a concurrency cap (outbound fetch fan-out stays under the 6-connection limit). */
export async function mapLimit(items, limit, fn) {
  const list = Array.from(items || []);
  const out = new Array(list.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i], i);
    }
  });
  await Promise.all(lanes);
  return out;
}
