import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { seedContent } from "./seed";
import type { CollectionKey, SiteContent } from "../types";

/**
 * Content store with pluggable persistence — the UI never touches this directly.
 *
 *  1. Upstash Redis  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *  2. Local file     data/content.json
 *
 * The first configured backend wins. Admin edits go live immediately (all pages are dynamic).
 */

const KEY = "rosie-atelier:content";
const FILE = path.join(process.cwd(), "data", "content.json");

/* ---------- backend: Upstash Redis (REST, no SDK) ---------- */
const redis = {
  enabled: () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  async cmd(args: string[]) {
    const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json()) as { result: unknown };
  },
  async read() {
    const { result } = await this.cmd(["GET", KEY]);
    return typeof result === "string" ? result : null;
  },
  async write(json: string) {
    await this.cmd(["SET", KEY, json]);
  },
  async remove() {
    await this.cmd(["DEL", KEY]);
  },
};

/* ---------- backend: local file ---------- */
const file = {
  async read() {
    try {
      return await fs.readFile(FILE, "utf8");
    } catch {
      return null;
    }
  },
  async write(json: string) {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, json, "utf8");
  },
  async remove() {
    try {
      await fs.unlink(FILE);
    } catch {
      /* nothing to reset */
    }
  },
};

function backend() {
  if (redis.enabled()) return redis;
  return file;
}

export function storeBackendName(): "redis" | "file" {
  return redis.enabled() ? "redis" : "file";
}

/* ---------- public API ---------- */
export async function getContent(): Promise<SiteContent> {
  try {
    const raw = await backend().read();
    if (!raw) return seedContent;
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...seedContent, ...parsed };
  } catch {
    return seedContent;
  }
}

export async function saveContent(next: SiteContent): Promise<void> {
  await backend().write(JSON.stringify(next, null, 2));
}

export async function updateCollection<K extends CollectionKey>(key: K, items: SiteContent[K]) {
  const current = await getContent();
  await saveContent({ ...current, [key]: items });
}

export async function updateHero(hero: SiteContent["hero"]) {
  const current = await getContent();
  await saveContent({ ...current, hero });
}

export async function resetContent() {
  await backend().remove();
}
