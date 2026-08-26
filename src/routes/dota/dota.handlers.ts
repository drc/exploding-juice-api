import { StatusCodes } from 'http-status-codes/build/cjs/status-codes';

import { encoder, print } from '@/lib/printer';
import type { AppRouteHander } from '@/lib/types';
import { fetchMatch, fetchPlayerProfile, getHeroName, isRadiant } from '@/services/opendota';
import type { OpenDotaPlayer } from '@/types/opendota';

import type { PrintMatchResultRoute } from './dota.routes';
import { formatDuration } from './dota.schema';

interface DebugLogger {
  info: (details: Record<string, unknown>, message: string) => void;
}

const COLUMNS = 48,
  DIVIDER = '='.repeat(COLUMNS),
  THIN_DIVIDER = '-'.repeat(COLUMNS),
  activeMatchPrintJobs = new Set<string>();

function debugLog(logger: DebugLogger, event: string, details: Record<string, unknown> = {}): void {
  logger.info(details, `[dota-match-debug] ${event}`);
}

function padRight(s: string, n: number): string {
  if (s.length >= n) {
    return s.slice(0, n);
  }
  return s + ' '.repeat(n - s.length);
}

async function mapPlayer(p: OpenDotaPlayer) {
  let player_name = p.personaname;
  if (!player_name && p.account_id) {
    const profile = await fetchPlayerProfile(p.account_id);
    player_name = profile ?? `acct#${p.account_id}`;
  }
  if (!player_name) {
    player_name = `Anonymous (slot ${p.player_slot})`;
  }
  return {
    player_name,
    hero: await getHeroName(p.hero_id),
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
  };
}

async function processMatchResult(match_id: string, logger: DebugLogger): Promise<void> {
  debugLog(logger, 'job_started', { match_id });
  const match = await (async () => {
    try {
      return await fetchMatch(match_id, logger);
    } catch (error) {
      debugLog(logger, 'job_fetch_failed', {
        match_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  })();
  if (match === null) {
    debugLog(logger, 'match_not_ready_after_polling', { match_id });
    debugLog(logger, 'job_completed', { match_id, outcome: 'not_ready' });
    return;
  }

  const date = new Date(match.start_time * 1000).toISOString().slice(0, 10),
    duration = formatDuration(match.duration),
    winner = match.radiant_win ? 'RADIANT' : 'DIRE',
    winnerScore = match.radiant_win ? match.radiant_score : match.dire_score,
    loserScore = match.radiant_win ? match.dire_score : match.radiant_score,
    radiant_players = match.players.filter((p) => isRadiant(p.player_slot)),
    dire_players = match.players.filter((p) => !isRadiant(p.player_slot)),
    radiant_team = await Promise.all(radiant_players.map(mapPlayer)),
    dire_team = await Promise.all(dire_players.map(mapPlayer));

  let e = encoder
    .line(DIVIDER)
    .align('center')
    .bold(true)
    .line('DOTA 2 - MATCH COMPLETE')
    .bold(false)
    .line(DIVIDER)
    .align('left')
    .line(`${padRight(date, 32)}${duration}`)
    .line(`Match #${match_id}`)
    .line(THIN_DIVIDER)
    .align('center')
    .bold(true)
    .line(`${winner} WINS!  ${winnerScore} - ${loserScore}`)
    .bold(false)
    .line(THIN_DIVIDER)
    .align('left')
    .bold(true)
    .line('RADIANT')
    .bold(false);

  for (const p of radiant_team) {
    e = e.line(`  ${padRight(p.player_name, 16)}${padRight(p.hero, 18)}${p.kills}/${p.deaths}/${p.assists}`);
  }

  e = e.line(THIN_DIVIDER).bold(true).line('DIRE').bold(false);

  for (const p of dire_team) {
    e = e.line(`  ${padRight(p.player_name, 16)}${padRight(p.hero, 18)}${p.kills}/${p.deaths}/${p.assists}`);
  }

  e = e.line(THIN_DIVIDER).align('center').line('GG WP').line(DIVIDER).newline(3).cut();

  debugLog(logger, 'receipt_ready', {
    match_id,
    date,
    duration,
    winner,
    score: { winner: winnerScore, loser: loserScore },
    radiant_team,
    dire_team,
  });
  try {
    print(e, logger);
    debugLog(logger, 'job_completed', { match_id });
  } catch (error) {
    debugLog(logger, 'job_print_failed', {
      match_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function enqueueMatchPrint(match_id: string, logger: DebugLogger): void {
  if (activeMatchPrintJobs.has(match_id)) {
    debugLog(logger, 'job_duplicate_suppressed', { match_id });
    return;
  }
  activeMatchPrintJobs.add(match_id);
  debugLog(logger, 'job_queued', { match_id });

  void processMatchResult(match_id, logger)
    .catch((error) => {
      debugLog(logger, 'job_failed', {
        match_id,
        error: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      activeMatchPrintJobs.delete(match_id);
      debugLog(logger, 'job_queue_released', { match_id });
    });
}

const printMatchResult: AppRouteHander<PrintMatchResultRoute> = (c) => {
  const { match_id } = c.req.valid('json');
  debugLog(c.var.logger, 'request_accepted', { match_id });
  enqueueMatchPrint(match_id, c.var.logger);

  return c.json({ status: 'accepted', match_id }, StatusCodes.ACCEPTED);
};

export default printMatchResult;
