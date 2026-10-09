/**
 * One answer to "is this a bot?" for counting and rendering decisions:
 * classify.js (Bot Management score / UA denylist / health checks) OR a generic
 * crawler UA pattern (Amazonbot, GPTBot, Applebot, bingbot, ClaudeBot...), which
 * the UA denylist alone let through as "human".
 * No import of crawl.js / rate-limit.js here: that would create a module cycle.
 * Author: Aziel Eliab.
 */
import { classifyRequest } from "./classify.js";

// Tight on purpose: a bare word ending in "bot" (phones such as "CUBOT X30") is not a crawler.
// Crawlers announce themselves as name-bot/version, "compatible; ...bot", or with a +http info URL.
const CRAWLER_UA = /\b[\w.-]*bot\/\d|compatible;\s*[^;)]*bot\b|\+https?:\/\/|crawler|spider|slurp|facebookexternalhit|ia_archiver|google-extended|googleother|anthropic-ai|perplexity-user|chatgpt-user|claude-user|meta-external|bytespider|headlesschrome|\b(?:googlebot|bingbot|applebot|amazonbot|gptbot|claudebot|duckduckbot|yandexbot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|oai-searchbot|perplexitybot)\b/i;

export function isCrawlerUa(ua) {
  return CRAWLER_UA.test(String(ua || ""));
}

export function isCrawlerRequest(request) {
  try {
    if (!request) return true;
    const ua = request.headers && typeof request.headers.get === "function" ? request.headers.get("user-agent") : "";
    if (isCrawlerUa(ua)) return true;
    return classifyRequest(request).bucket !== "human";
  } catch {
    return false;
  }
}
