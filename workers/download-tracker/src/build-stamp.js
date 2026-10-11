/**
 * HEALTH-BUILD-STAMP-1.0 (corpus): git_sha + version_id on GET /v1/health,
 * matching aziel-runtime #263. Read at serve time, never guessed:
 * - git_sha from env.GIT_SHA (wrangler deploy --var GIT_SHA:$(git rev-parse HEAD)), hex only.
 * - version_id from the CF_VERSION_METADATA binding (wrangler.toml [version_metadata]).
 * Anything missing is null with a *_source of "unstamped" / "unbound".
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
const HEX = /^[0-9a-f]{7,40}$/;

export function buildStamp(env) {
  const raw = String((env && env.GIT_SHA) || "").trim().toLowerCase();
  const sha = HEX.test(raw) ? raw : null;
  const vm = env && env.CF_VERSION_METADATA;
  const vid = vm && typeof vm.id === "string" && vm.id ? vm.id : null;
  return {
    git_sha: sha,
    git_sha_source: sha ? "env.GIT_SHA" : "unstamped",
    version_id: vid,
    version_id_source: vid ? "CF_VERSION_METADATA" : "unbound",
  };
}
