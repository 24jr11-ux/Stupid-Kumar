import { cookies } from "next/headers";
import { isAuthorized } from "@/lib/auth";
import { createMemory } from "@/lib/memories";

export async function POST(request) {
  if (!isAuthorized(await cookies())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { date } = await request.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Invalid date" }, { status: 400 });
    return Response.json(await createMemory(date), { status: 201 });
  } catch (error) {
    console.error("Create memory failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
