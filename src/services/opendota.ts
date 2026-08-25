import type {
  OpenDotaHero,
  OpenDotaMatch,
  OpenDotaPlayer,
} from "@/types/opendota";

const OPENDOTA_BASE = "https://api.opendota.com/api";
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const REQUEST_TIMEOUT_MS = 10_000;

const heroCache = new Map<number, string>();
let heroesPromise: Promise<void> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`opendota_http_${response.status}_${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function loadHeroes(): Promise<void> {
  const heroes = await fetchJson<OpenDotaHero[]>(`${OPENDOTA_BASE}/heroes`);
  for (const hero of heroes) {
    heroCache.set(hero.id, hero.localized_name);
  }
}

function ensureHeroesLoaded(): Promise<void> | undefined {
  if (heroCache.size > 0) return;
  if (!heroesPromise) {
    heroesPromise = loadHeroes().catch((err) => {
      heroesPromise = null;
      throw err;
    });
  }
  return heroesPromise;
}

export async function getHeroName(heroId: number): Promise<string> {
  if (heroCache.has(heroId)) return heroCache.get(heroId)!;
  await ensureHeroesLoaded();
  return heroCache.get(heroId) ?? "Unknown";
}

export function isRadiant(playerSlot: number): boolean {
  return playerSlot < 128;
}

export async function fetchMatch(matchId: string): Promise<OpenDotaMatch | null> {
  if (Number.isNaN(Number(matchId))) {
    throw new Error("invalid_match_id");
  }

  ensureHeroesLoaded();

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      const match = await fetchJson<OpenDotaMatch>(`${OPENDOTA_BASE}/matches/${matchId}`);
      return match;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isHttp404 = msg.startsWith("opendota_http_404");
      const isLast = attempt === RETRY_DELAYS_MS.length - 1;
      if (!isHttp404) {
        throw error;
      }
      if (isLast) return null;
      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }

  return null;
}

export type { OpenDotaPlayer };