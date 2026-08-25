import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import { client, encoder } from "@/lib/printer";
import type { AppRouteHander } from "@/lib/types";
import { fetchMatch, getHeroName, isRadiant } from "@/services/opendota";
import type { OpenDotaPlayer } from "@/types/opendota";
import type { PrintMatchResultRoute } from "./dota.routes";
import { formatDuration } from "./dota.schema";

const COLUMNS = 48;
const DIVIDER = "=".repeat(COLUMNS);
const THIN_DIVIDER = "-".repeat(COLUMNS);

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}

async function mapPlayer(p: OpenDotaPlayer) {
  return {
    player_name: p.personaname ?? "Anonymous",
    hero: await getHeroName(p.hero_id),
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
  };
}

export const printMatchResult: AppRouteHander<PrintMatchResultRoute> = async (
  c,
) => {
  const { match_id } = c.req.valid("json");

  let match;
  try {
    match = await fetchMatch(match_id);
  } catch {
    return c.json(
      { error: "opendota_upstream_error" },
      StatusCodes.BAD_GATEWAY,
    );
  }
  if (match === null) {
    return c.json(
      { error: "match_not_ready", match_id },
      StatusCodes.NOT_FOUND,
    );
  }

  const date = new Date(match.start_time * 1000).toISOString().slice(0, 10);
  const duration = formatDuration(match.duration);
  const winner = match.radiant_win ? "RADIANT" : "DIRE";
  const winnerScore = match.radiant_win
    ? match.radiant_score
    : match.dire_score;
  const loserScore = match.radiant_win ? match.dire_score : match.radiant_score;

  const radiant_players = match.players.filter((p) => isRadiant(p.player_slot));
  const dire_players = match.players.filter((p) => !isRadiant(p.player_slot));

  const radiant_team = await Promise.all(radiant_players.map(mapPlayer));
  const dire_team = await Promise.all(dire_players.map(mapPlayer));

  let e = encoder
    .line(DIVIDER)
    .align("center")
    .bold(true)
    .line("DOTA 2 - MATCH COMPLETE")
    .bold(false)
    .line(DIVIDER)
    .align("left")
    .line(`${padRight(date, 32)}${duration}`)
    .line(`Match #${match_id}`)
    .line(THIN_DIVIDER)
    .align("center")
    .bold(true)
    .line(`${winner} WINS!  ${winnerScore} - ${loserScore}`)
    .bold(false)
    .line(THIN_DIVIDER)
    .align("left")
    .bold(true)
    .line("RADIANT")
    .bold(false);

  for (const p of radiant_team) {
    e = e.line(
      `  ${padRight(p.player_name, 16)}${padRight(p.hero, 18)}${p.kills}/${p.deaths}/${p.assists}`,
    );
  }

  e = e.line(THIN_DIVIDER).bold(true).line("DIRE").bold(false);

  for (const p of dire_team) {
    e = e.line(
      `  ${padRight(p.player_name, 16)}${padRight(p.hero, 18)}${p.kills}/${p.deaths}/${p.assists}`,
    );
  }

  e = e
    .line(THIN_DIVIDER)
    .align("center")
    .line("GG WP")
    .line(DIVIDER)
    .newline(3)
    .cut();

  try {
    client.write(e.encode());
  } catch (err) {
    console.error("printer write failed:", err);
  }

  return c.json(null, StatusCodes.CREATED);
};
