export const SESSION_IDLE_MS = 10 * 60 * 1000;
export const SESSION_HEARTBEAT_MS = 60 * 1000;
export const LAST_ACTIVE_KEY = "timeline_last_active";

export function inactivityExpired(lastActive, now = Date.now()) {
  return Number.isFinite(lastActive) && lastActive > 0 && now - lastActive >= SESSION_IDLE_MS;
}
