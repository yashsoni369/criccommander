import fs from 'fs';
import path from 'path';
import { redis } from './redis';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MATCH_SLUGS: Record<string, string> = {
  '152252': 'rr-vs-mi-69th-match-indian-premier-league-2026',
};

const LIVE_CACHE_TTL_SEC = 25;

interface MiniScore {
  batTeam: { teamName?: string; teamScore: string };
  bowlTeam?: { teamName?: string; teamScore: string };
  overs: string;
  currentRunRate: string;
}

interface CommentaryBall {
  timestamp: number;
  commText: string;
}

interface CommentaryPayload {
  commentaryList: CommentaryBall[];
  miniscore: MiniScore | null;
  source: 'live' | 'fixture';
}

export async function fetchCommentary(matchId: string): Promise<CommentaryPayload> {
  const cacheKey = `live_cb:${matchId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : (cached as CommentaryPayload);
      if (parsed?.commentaryList?.length) return parsed;
    } catch {
      /* fall through */
    }
  }

  const live = await scrapeMobileCricbuzz(matchId).catch((err) => {
    console.warn('[cricbuzz] live scrape failed:', err?.message || err);
    return null;
  });

  if (live && live.commentaryList.length) {
    try {
      await redis.set(cacheKey, JSON.stringify(live), { ex: LIVE_CACHE_TTL_SEC });
    } catch { /* ignore cache errors */ }
    return live;
  }

  return await simulateFromFixture(matchId);
}

async function scrapeMobileCricbuzz(matchId: string): Promise<CommentaryPayload | null> {
  const slug = MATCH_SLUGS[matchId];
  if (!slug) return null;

  const url = `https://m.cricbuzz.com/live-cricket-scores/${matchId}/${slug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://m.cricbuzz.com/',
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const html = await res.text();
  if (html.length < 5_000) return null;

  const miniscore = extractMiniscoreFromMeta(html);
  const balls = extractBallsFromHtml(html, matchId);

  if (balls.length === 0 && !miniscore) return null;

  balls.sort((a, b) => b.timestamp - a.timestamp);
  return { commentaryList: balls, miniscore, source: 'live' };
}

function extractMiniscoreFromMeta(html: string): MiniScore | null {
  const meta = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']*?(\w{2,4})\s+(\d+\/\d+)\s+\(([\d.]+)\)\s+vs\s+(\w{2,4})\s*\n?\s*(\d+\/\d+)/,
  );
  if (!meta) return null;

  const [, batTeam, batScore, overs, bowlTeam, bowlScore] = meta;
  const runs = parseInt(batScore.split('/')[0] || '0', 10);
  const oversFloat = parseFloat(overs);
  const crr = oversFloat > 0 ? (runs / oversFloat).toFixed(2) : '0.00';

  return {
    batTeam: { teamName: batTeam, teamScore: batScore.replace('/', '-') },
    bowlTeam: { teamName: bowlTeam, teamScore: bowlScore.replace('/', '-') },
    overs,
    currentRunRate: crr,
  };
}

function extractBallsFromHtml(html: string, matchId: string): CommentaryBall[] {
  const idRe = matchId.replace(/[^0-9]/g, '');
  const chunkRe = new RegExp(
    String.raw`\\"(\d{13})\\":\{\\"matchId\\":${idRe},(.*?)(?=\},\\"\d{13}\\":\{|\}\},\\"matchHeader\\"|\}\}\}|$)`,
    'g',
  );

  const out: CommentaryBall[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;

  while ((m = chunkRe.exec(html)) !== null) {
    const ts = Number(m[1]);
    if (seen.has(ts)) continue;

    const chunk = m[2];
    if (!chunk.includes('\\"commType\\":\\"commentary\\"')) continue;

    const commTextMatch = chunk.match(/\\"commText\\":\\"((?:[^\\]|\\.)*?)\\",\\"inningsId\\"/);
    if (!commTextMatch) continue;
    const escText = commTextMatch[1];

    const ballMetricMatch = chunk.match(/\\"ballMetric\\":([\d.]+|\\"\$undefined\\")/);
    const ballMetricRaw = ballMetricMatch?.[1] || '';
    if (!ballMetricRaw || ballMetricRaw.includes('undefined')) continue;

    const decoded = decodeJsonStringChunk(escText);
    const clean = decoded.replace(/<[^>]+>/g, '').trim();
    if (!/\s+to\s+/i.test(clean)) continue;

    seen.add(ts);
    out.push({ timestamp: ts, commText: `${ballMetricRaw} ${clean}` });
  }

  return out;
}

function decodeJsonStringChunk(raw: string): string {
  try {
    return JSON.parse('"' + raw + '"');
  } catch {
    return raw
      .replace(/\\\\"/g, '"')
      .replace(/\\\\n/g, '\n')
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\\/g, '\\');
  }
}

async function simulateFromFixture(matchId: string): Promise<CommentaryPayload> {
  try {
    const fallbackPath = path.join(process.cwd(), 'fixtures', 'sample-commentary.json');
    const fileData = fs.readFileSync(fallbackPath, 'utf-8');
    const data = JSON.parse(fileData);
    const pool: any[] = data.commentaryList || [];
    if (pool.length === 0) return { commentaryList: [], miniscore: null, source: 'fixture' };

    const demoKey = `demo_start_time:${matchId}`;
    let demoStartTimeStr = await redis.get(demoKey);
    let demoStartTime = demoStartTimeStr ? parseInt(demoStartTimeStr as string, 10) : 0;
    if (!demoStartTime) {
      demoStartTime = Date.now();
      await redis.set(demoKey, String(demoStartTime));
    }

    const elapsedSeconds = (Date.now() - demoStartTime) / 1000;
    const ballsToRelease = Math.min(3 + Math.floor(elapsedSeconds / 15), pool.length);
    const sliced = pool.slice(pool.length - ballsToRelease);

    const overTable: Record<number, { o: string; s: string }> = {
      3:  { o: '18.3', s: '162-5' },
      4:  { o: '18.4', s: '163-5' },
      5:  { o: '18.5', s: '167-5' },
      6:  { o: '18.6', s: '169-5' },
      7:  { o: '19.1', s: '175-5' },
      8:  { o: '19.2', s: '177-5' },
      9:  { o: '19.3', s: '177-5' },
      10: { o: '19.6', s: '187-6' },
    };
    const entry = overTable[ballsToRelease] || { o: '18.3', s: '162-5' };
    const runs = parseFloat(entry.s.split('-')[0]);
    const crr = (runs / parseFloat(entry.o)).toFixed(2);

    return {
      commentaryList: sliced as CommentaryBall[],
      miniscore: {
        batTeam: { teamName: 'RR', teamScore: entry.s },
        bowlTeam: { teamName: 'MI', teamScore: '' },
        overs: entry.o,
        currentRunRate: crr,
      },
      source: 'fixture',
    };
  } catch (err) {
    console.error('Fixture fallback failed:', err);
    return { commentaryList: [], miniscore: null, source: 'fixture' };
  }
}
