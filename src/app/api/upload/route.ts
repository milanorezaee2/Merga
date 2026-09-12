import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { write, UploadError, UPLOAD_MAX_BYTES, uploadBackendName } from "@/lib/storage/files";
import { withNoStore } from "@/lib/http";
import { consumeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload — multipart form with a single `file` field.
 *
 * Restricted to signed-in artists and admins (the only people who need to attach an image to a
 * profile or a pattern). The stored name is generated server-side; the client never chooses a
 * filename, so there is no path to traverse. Returns `{ ok, url }` to put in an avatar/cover field.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 24;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  if (!consumeQuota(`upload:${session.id}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "too_many_uploads" }, withNoStore({ status: 429 }));
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  try {
    const stored = await write(new Uint8Array(await file.arrayBuffer()), file.type);
    return NextResponse.json({ ok: true, ...stored, backend: uploadBackendName() }, withNoStore());
  } catch (e) {
    if (e instanceof UploadError) {
      const status = e.code === "too_large" ? 413 : e.code === "unsupported_type" ? 415 : 400;
      return NextResponse.json(
        { ok: false, error: e.code, maxBytes: UPLOAD_MAX_BYTES },
        withNoStore({ status }),
      );
    }
    // A read-only filesystem (serverless without object storage) lands here.
    console.error("[upload] write failed:", e);
    return NextResponse.json({ ok: false, error: "storage_write_failed" }, withNoStore({ status: 502 }));
  }
}
