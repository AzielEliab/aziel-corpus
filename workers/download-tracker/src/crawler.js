/**
 * One answer to "is this a bot?" for counting and rendering decisions:
 * classify.js (Bot Management score / UA denylist / health checks) OR a generic
 * crawler UA pattern (Amazonbot, GPTBot, Applebot, bingbot, ClaudeBot...), which
 * the UA denylist alone let through as "human".
 * No import of crawl.js / rate-limit.js here: that would create a module cycle.
 * Author: Aziel Eliab.
 */
import { classifyRequest } from "./classify.js";

const CRAWLER_UA = /bot\b|bot\/|crawler|spider|slurp|facebookexternalhit|ia_archiver|google-extended|googleother|anthropic-ai|perplexity-user|chatgpt-user|claude-user|meta-external|bytespider|headlesschrome/i;

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
