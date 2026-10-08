"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingTitle from "@/components/LoadingTitle";
import { inactivityExpired, LAST_ACTIVE_KEY, SESSION_HEARTBEAT_MS, SESSION_IDLE_MS } from "@/lib/session";

export default function SessionGuard({ children }) {
  const pathname = usePathname();
  const publicPage = pathname === "/gate";
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (publicPage) return;
    let canceled = false;
    let checking = false;
    let timer;
    let idleHideTimer;
    const lastActive = () => { try { return Number(localStorage.getItem(LAST_ACTIVE_KEY)); } catch { return 0; } };
    const remember = () => { try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* Server expiry remains enforced. */ } };
    const gate = () => {
      setVerified(false);
      const next = window.location.pathname + window.location.search;
      window.location.replace("/gate?next=" + encodeURIComponent(next));
    };
    const check = async () => {
      if (document.visibilityState !== "visible" || canceled || checking) return;
      checking = true;
      if (inactivityExpired(lastActive())) {
        setVerified(false);
        try { await fetch("/api/session", { method: "DELETE", cache: "no-store", signal: AbortSignal.timeout(3000) }); } catch { /* The server expiry still locks the gate. */ } finally { if (!canceled) gate(); }
        checking = false;
        return;
      }
      try {
        const response = await fetch("/api/session", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (canceled) return;
        if (!response.ok) { gate(); return; }
        if (document.visibilityState === "visible") { remember(); setVerified(true); }
      } catch {
        if (!canceled) gate();
      } finally { checking = false; }
    };
    const pause = () => {
      remember();
      clearInterval(timer);
      clearTimeout(idleHideTimer);
      // Keep a verified page painted during brief tab switches. Hide it once
      // the absence actually reaches the lock deadline, rather than on every blur.
      idleHideTimer = setTimeout(() => setVerified(false), SESSION_IDLE_MS);
    };
    const resume = () => {
      clearTimeout(idleHideTimer);
      clearInterval(timer);
      check();
      timer = setInterval(check, SESSION_HEARTBEAT_MS);
    };
    const visibility = () => { if (document.visibilityState === "visible") resume(); else pause(); };
    const pageShow = () => { if (document.visibilityState === "visible") resume(); };
    if (document.visibilityState === "visible") resume();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", pageShow);
    return () => {
      canceled = true; clearInterval(timer); clearTimeout(idleHideTimer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("pageshow", pageShow);
    };
  }, [publicPage]);

  return <>
    {!publicPage && !verified && <LoadingTitle />}
    <div className="min-h-full flex flex-1 flex-col" inert={!publicPage && !verified}
      style={{ visibility: publicPage || verified ? "visible" : "hidden" }}>{children}</div>
  </>;
}
