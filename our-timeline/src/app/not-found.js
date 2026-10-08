import Link from "next/link";
import { RouteReveal } from "@/components/AppTransitions";

export default function NotFound() {
  return <RouteReveal><main className="relative z-10 m-auto px-6 py-16 text-center">
    <h1 className="scrapbook-text font-handwriting text-4xl">This memory isn’t here anymore.</h1>
    <Link href="/" className="primary-button mt-6 inline-flex px-5 py-3">Back to timeline</Link>
  </main></RouteReveal>;
}
