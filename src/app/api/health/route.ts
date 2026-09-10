import { NextResponse } from "next/server";
import { storeBackendName } from "@/lib/data/store";
import { adminConfigured } from "@/lib/auth";

/**
 * Unauthenticated readiness probe for uptime checks.
 * Reports which storage backend is active and whether admin auth is configured, never secrets.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const persistent = storeBackendName() !== "file";
  const configured = adminConfigured();

  return NextResponse.json(
    {
      ok: true,
      service: "rosie-atelier",
      time: new Date().toISOString(),
      persistent,
      configured,
      storage: { backend: storeBackendName(), persistent },
      admin: { configured },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
