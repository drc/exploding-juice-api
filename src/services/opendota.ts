import type {
  OpenDotaHero,
  OpenDotaMatch,
  OpenDotaPlayer,
} from "@/types/opendota";

const OPENDOTA_BASE = "https://api.opendota.com/api";
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const REQUEST_TIMEOUT_MS = 10_000;

const heroCache = new Map<number, string>();
const profileCache = new Map<number, string>();
let heroesPromise: Promise<void> | null = null;

const PARSE_REQUEST_TTL_MS = 5 * 60_000;
const parseRequested = new Map<
  string,
  { expiresAt: number; promise: Promise<void> }
>();

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

export async function fetchPlayerProfile(
  accountId: number,
): Promise<string | null> {
  if (profileCache.has(accountId)) return profileCache.get(accountId)!;
  try {
    const profile = await fetchJson<{ profile?: { personaname?: string | null } }>(
      `${OPENDOTA_BASE}/players/${accountId}`,
    );
    const name = profile.profile?.personaname;
    if (name) profileCache.set(accountId, name);
    return name ?? null;
  } catch {
    return null;
  }
}

export function isRadiant(playerSlot: number): boolean {
  return playerSlot < 128;
}

export async function requestParse(matchId: string): Promise<void> {
  const now = Date.now();
  const existing = parseRequested.get(matchId);
  if (existing) {
    if (existing.expiresAt > now) return existing.promise;
    parseRequested.delete(matchId);
  }

  let promise!: Promise<void>;
  promise = (async () => {
    try {
      const response = await fetch(`${OPENDOTA_BASE}/request/${matchId}`, {
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`opendota_http_${response.status}_${response.statusText}`);
      }
      parseRequested.set(matchId, {
        expiresAt: Date.now() + PARSE_REQUEST_TTL_MS,
        promise,
      });
    } catch (error) {
      if (parseRequested.get(matchId)?.promise === promise) {
        parseRequested.delete(matchId);
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`opendota_parse_request_failed: ${msg}`);
    }
  })();
  parseRequested.set(matchId, { expiresAt: Number.POSITIVE_INFINITY, promise });
  return promise;
}

function isIncompleteMatch(match: OpenDotaMatch): boolean {
  return (
    match.od_data?.has_parsed === false ||
    match.version == null ||
    match.players.length === 0
  );
}

export async function fetchMatch(matchId: string): Promise<OpenDotaMatch | null> {
  if (Number.isNaN(Number(matchId))) {
    throw new Error("invalid_match_id");
  }

  await ensureHeroesLoaded();

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      const match = await fetchJson<OpenDotaMatch>(`${OPENDOTA_BASE}/matches/${matchId}`);
      if (!isIncompleteMatch(match)) {
        return match;
      }

      await requestParse(matchId).catch(() => {});
      for (const retryDelay of RETRY_DELAYS_MS) {
        await delay(retryDelay);
        let parsedMatch: OpenDotaMatch;
        try {
          parsedMatch = await fetchJson<OpenDotaMatch>(
            `${OPENDOTA_BASE}/matches/${matchId}`,
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.startsWith("opendota_http_404")) return null;
          throw error;
        }
        if (!isIncompleteMatch(parsedMatch)) return parsedMatch;
      }
      return null;
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
