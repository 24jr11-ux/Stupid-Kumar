import { SESSION_IDLE_MS } from "./session.js";

export const LAST_READY_PAGE_KEY = "timeline_last_ready_page";

function validateReadyPage(value, now, maxAge) {
  try {
    const page = JSON.parse(value);
    if (!Number.isFinite(page?.readyAt) || page.readyAt <= 0 || page.readyAt > now || now - page.readyAt >= maxAge) return null;
    if (typeof page.path !== "string" || !/^(\/(?:\?[^#]*)?|\/memory\/[a-zA-Z0-9-]+(?:\?[^#]*)?)$/.test(page.path) || /[\\\r\n]/.test(page.path)) return null;
    return page.path;
  } catch { return null; }
}

export function recentReadyPage(value, now = Date.now()) {
  return validateReadyPage(value, now, SESSION_IDLE_MS);
}

// Runs before body paint so a recent relaunch never flashes the launch title.
export const launchBootstrap = `(() => {
  try {
    const path = (${validateReadyPage.toString()})(localStorage.getItem("${LAST_READY_PAGE_KEY}"), Date.now(), ${SESSION_IDLE_MS});
    if (!path || location.pathname === "/gate") return;
    document.documentElement.classList.add("warm-launch");
    const installed = (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches)
      || (typeof navigator !== "undefined" && navigator.standalone === true);
    if (location.pathname === "/" && (new URLSearchParams(location.search).get("resume") === "1" || installed)) {
      if (path !== location.pathname + location.search) location.replace(path);
    }
  } catch { /* Storage may be unavailable; use the normal launch flow. */ }
})();`;
