"use client";

import { RouteReveal } from "@/components/AppTransitions";

export default function ErrorPage({ retry }) {
  return <RouteReveal><main className="relative z-10 m-auto px-6 py-16 text-center">
    <h1 className="scrapbook-text font-handwriting text-4xl">Unable to load this page.</h1>
    <button type="button" onClick={retry} className="primary-button mt-6 px-5 py-3">Try again</button>
  </main></RouteReveal>;
}
