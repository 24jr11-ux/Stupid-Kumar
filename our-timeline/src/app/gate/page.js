import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorized, sanitizeNextPath } from "@/lib/auth";
import GateForm from "./GateForm";

// /gate — the passphrase/question entry point. Visitors who are already authed skip
// straight to where they were headed.
export const dynamic = "force-dynamic";

export default async function GatePage({ searchParams }) {
  const params = await searchParams;
  const next = sanitizeNextPath(String(params?.next || "/"));

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  // Cookie writes re-render this page as part of the unlock action response.
  // Let GateForm receive success and retain its exit layer before navigating;
  // ordinary visits by an already-authorized user still skip the gate.
  if (isAuthorized(cookieStore) && !requestHeaders.has("next-action")) {
    redirect(next);
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-1 items-center justify-center px-4 py-12">
      <GateForm next={next} />
    </main>
  );
}
