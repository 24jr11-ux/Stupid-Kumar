import { cookies } from "next/headers";
import { isAuthorized } from "@/lib/auth";
import { deleteMemory, updateMemory } from "@/lib/memories";

export async function PATCH(request, { params }) {
  if (!isAuthorized(await cookies())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    return Response.json(await updateMemory(id, await request.json()));
  } catch (error) {
    console.error("Update memory failed:", error);
    return Response.json({ error: error.message }, { status: error.message === "Memory not found." ? 404 : 500 });
  }
}

export async function DELETE(_request, { params }) {
  if (!isAuthorized(await cookies())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await deleteMemory(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete memory failed:", error);
    return Response.json({ error: error.message }, { status: error.message === "Memory not found." ? 404 : 500 });
  }
}
