import type { OpenDotaHero, OpenDotaMatch, OpenDotaPlayer } from '@/types/opendota';

const OPENDOTA_BASE = 'https://api.opendota.com/api';
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const REQUEST_TIMEOUT_MS = 10_000;

const heroCache = new Map<number, string>();
const profileCache = new Map<number, string>();
let heroesPromise: Promise<void> | null = null;

const PARSE_REQUEST_TTL_MS = 5 * 60_000;
const parseRequested = new Map<string, { expiresAt: number; promise: Promise<void> }>();
type DebugLogger = { info: (details: Record<string, unknown>, message: string) => void };

function debugLog(logger: DebugLogger, event: string, details: Record<string, unknown> = {}): void {
  logger.info(details, `[dota-match-debug] ${event}`);
}

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
  return heroCache.get(heroId) ?? 'Unknown';
}

export async function fetchPlayerProfile(accountId: number): Promise<string | null> {
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

export async function requestParse(matchId: string, logger: DebugLogger): Promise<void> {
  const now = Date.now();
  const existing = parseRequested.get(matchId);
  if (existing) {
    if (existing.expiresAt > now) {
      debugLog(logger, 'parse_request_suppressed', { match_id: matchId });
      return existing.promise;
    }
    parseRequested.delete(matchId);
  }

  let promise!: Promise<void>;
  promise = (async () => {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${OPENDOTA_BASE}/request/${matchId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      debugLog(logger, 'parse_request_response', {
        match_id: matchId,
        elapsed_ms: Date.now() - startedAt,
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        throw new Error(`opendota_http_${response.status}_${response.statusText}`);
      }
      parseRequested.set(matchId, {
        expiresAt: Date.now() + PARSE_REQUEST_TTL_MS,
        promise,
      });
      debugLog(logger, 'parse_request_succeeded', { match_id: matchId });
    } catch (error) {
      if (parseRequested.get(matchId)?.promise === promise) {
        parseRequested.delete(matchId);
      }
      const msg = error instanceof Error ? error.message : String(error);
      debugLog(logger, 'parse_request_failed', { match_id: matchId, error: msg });
      throw new Error(`opendota_parse_request_failed: ${msg}`);
    }
  })();
  parseRequested.set(matchId, { expiresAt: Number.POSITIVE_INFINITY, promise });
  return promise;
}

function isIncompleteMatch(match: OpenDotaMatch): boolean {
  return match.od_data?.has_parsed === false || match.version == null || match.players.length === 0;
}

export async function fetchMatch(matchId: string, logger: DebugLogger): Promise<OpenDotaMatch | null> {
  if (Number.isNaN(Number(matchId))) {
    throw new Error('invalid_match_id');
  }

  await ensureHeroesLoaded();

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    debugLog(logger, 'match_fetch_attempt', {
      match_id: matchId,
      attempt: attempt + 1,
      retry: false,
    });
    try {
      const match = await fetchMatchJson(matchId, attempt + 1, false, logger);
      if (!isIncompleteMatch(match)) {
        return match;
      }

      await requestParse(matchId, logger).catch(() => {});
      for (let retryAttempt = 0; retryAttempt < RETRY_DELAYS_MS.length; retryAttempt++) {
        const retryDelay = RETRY_DELAYS_MS[retryAttempt] as number;
        await delay(retryDelay);
        let parsedMatch: OpenDotaMatch;
        try {
          debugLog(logger, 'match_fetch_attempt', {
            match_id: matchId,
            attempt: attempt + 1,
            retry: true,
            retry_attempt: retryAttempt + 1,
          });
          parsedMatch = await fetchMatchJson(matchId, attempt + 1, true, logger, retryAttempt + 1);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.startsWith('opendota_http_404')) {
            debugLog(logger, 'match_fetch_null', { match_id: matchId, reason: 'http_404' });
            return null;
          }
          throw error;
        }
        if (!isIncompleteMatch(parsedMatch)) return parsedMatch;
      }
      debugLog(logger, 'match_fetch_null', {
        match_id: matchId,
        reason: 'incomplete_after_polling',
      });
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isHttp404 = msg.startsWith('opendota_http_404');
      const isLast = attempt === RETRY_DELAYS_MS.length - 1;
      if (!isHttp404) {
        throw error;
      }
      if (isLast) {
        debugLog(logger, 'match_fetch_null', {
          match_id: matchId,
          reason: 'http_404_after_retries',
        });
        return null;
      }
      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }

  return null;
}

async function fetchMatchJson(
  matchId: string,
  attempt: number,
  retry: boolean,
  logger: DebugLogger,
  retryAttempt?: number,
): Promise<OpenDotaMatch> {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      debugLog(logger, 'match_fetch_response', {
        match_id: matchId,
        attempt,
        retry,
        retry_attempt: retryAttempt,
        elapsed_ms: Date.now() - startedAt,
        status: response.status,
        ok: false,
      });
      throw new Error(`opendota_http_${response.status}_${response.statusText}`);
    }
    const match = (await response.json()) as OpenDotaMatch;
    debugLog(logger, 'match_fetch_response', {
      match_id: matchId,
      attempt,
      retry,
      retry_attempt: retryAttempt,
      elapsed_ms: Date.now() - startedAt,
      status: response.status,
      ok: true,
      players_count: match.players.length,
      has_api: match.od_data?.has_api,
      has_gcdata: match.od_data?.has_gcdata,
      has_parsed: match.od_data?.has_parsed,
      has_archive: match.od_data?.has_archive,
      has_version: match.version != null,
    });
    return match;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('opendota_http_')) throw error;
    debugLog(logger, 'match_fetch_failed', {
      match_id: matchId,
      attempt,
      retry,
      retry_attempt: retryAttempt,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export type { OpenDotaPlayer };
