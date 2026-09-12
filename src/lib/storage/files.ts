import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Image upload storage.
 *
 * Backend 1 (default): the local filesystem under `data/uploads/` — works in dev, on a VPS and in
 * Docker with a volume. It is *read-only on serverless*, so before deploying to Netlify/Vercel
 * point this at object storage (Vercel Blob, S3, Liara object storage, Cloudinary) by replacing
 * `write()`/`read()`; nothing else in the app touches the filesystem for uploads.
 *
 * Files are served back through `/uploads/[name]` (a route handler), not from `public/`, so the
 * same code path works whether or not the host lets us write into the build output.
 */

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

/** 8 MB by default; override with UPLOAD_MAX_BYTES. */
export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Generated names only — never a client-supplied filename (path traversal). */
const NAME_RE = /^[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/;

export function isAllowedUploadName(name: string): boolean {
  return NAME_RE.test(name);
}

export function contentTypeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? "application/octet-stream";
}

export class UploadError extends Error {
  constructor(readonly code: "unsupported_type" | "too_large" | "empty" | "invalid_name" | "not_found", message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** Store raw bytes under a generated name and return the site-relative URL to serve them. */
export async function write(bytes: Uint8Array, contentType: string): Promise<{ name: string; url: string }> {
  if (!bytes.byteLength) throw new UploadError("empty", "file is empty");
  if (bytes.byteLength > UPLOAD_MAX_BYTES) throw new UploadError("too_large", "file exceeds the size limit");

  const ext = ALLOWED[contentType.toLowerCase()];
  if (!ext) throw new UploadError("unsupported_type", "only jpeg, png, webp and gif are accepted");

  const name = `u-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(bytes));
  return { name, url: `/uploads/${name}` };
}

/** Read a stored upload. `name` must already have passed `isAllowedUploadName()`. */
export async function read(name: string): Promise<Uint8Array | null> {
  if (!isAllowedUploadName(name)) throw new UploadError("invalid_name", "invalid file name");
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

/** Which backend is active — reported by /api/health so a read-only host is obvious. */
export function uploadBackendName(): "file" {
  return "file";
}
