import { contentTypeFor, isAllowedUploadName, read } from "@/lib/storage/files";

/**
 * GET /uploads/<name> — serves a stored upload.
 *
 * A route handler rather than `public/` because the host may not let us write into the build
 * output. The name is validated against a generated-name pattern before it reaches the filesystem,
 * and it always contains a dot, so the i18n/auth middleware skips this path entirely.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isAllowedUploadName(name)) return new Response("Not found", { status: 404 });

  const bytes = await read(name);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": contentTypeFor(name),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
