import { cookies } from "next/headers";
import { isAuthorized } from "@/lib/auth";
import { uploadMemoryPhoto } from "@/lib/memories";

export async function POST(request, { params }) {
  if (!isAuthorized(await cookies())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose an image file." }, { status: 400 });
    return Response.json({ url: await uploadMemoryPhoto(id, file) }, { status: 201 });
  } catch (error) {
    console.error("Photo upload failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
