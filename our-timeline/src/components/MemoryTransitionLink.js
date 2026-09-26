"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function isModifiedClick(event) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function waitForElement(selector) {
  if (!selector || document.querySelector(selector)) return Promise.resolve();

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 2500);
  });
}

export default function MemoryTransitionLink({
  href,
  targetSelector,
  children,
  onClick,
  ...props
}) {
  const router = useRouter();

  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented || isModifiedClick(event)) return;

    if (!document.startViewTransition || prefersReducedMotion()) return;

    event.preventDefault();
    document.startViewTransition(async () => {
      router.push(href);
      await waitForElement(targetSelector);
    });
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
