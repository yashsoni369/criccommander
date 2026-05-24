import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function getLastBallSeen(matchId: string): Promise<string | null> {
  return await redis.get(`lastBallSeen:${matchId}`);
}

export async function setLastBallSeen(matchId: string, ballId: string) {
  return await redis.set(`lastBallSeen:${matchId}`, ballId);
}

export async function pushEvent(matchId: string, event: any) {
  const key = `events:${matchId}`;
  await redis.lpush(key, event);
  await redis.ltrim(key, 0, 99);
}

export async function getRecentEvents(matchId: string, count = 30) {
  const key = `events:${matchId}`;
  return await redis.lrange(key, 0, count - 1);
}

export async function updateAndGetViewers(clientId: string) {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  const key = 'live_viewers_zset';
  
  // Update this client's last seen timestamp
  await redis.zadd(key, { score: now, member: clientId });
  
  // Clean up expired clients (older than 1 minute)
  await redis.zremrangebyscore(key, 0, oneMinuteAgo);
  
  // Get the accurate count of currently active clients
  const count = await redis.zcard(key);
  return count;
}

export async function bumpAccuracy(matchId: string, hit: boolean) {
  await redis.incr(`accuracy:${matchId}:total`);
  if (hit) await redis.incr(`accuracy:${matchId}:hits`);
}

export async function getAccuracy(matchId: string): Promise<{ hits: number; total: number }> {
  const [hits, total] = await Promise.all([
    redis.get(`accuracy:${matchId}:hits`),
    redis.get(`accuracy:${matchId}:total`),
  ]);
  return {
    hits: Number(hits || 0),
    total: Number(total || 0),
  };
}

export async function setMatchHeader(matchId: string, header: any) {
  await redis.set(`match:header:${matchId}`, JSON.stringify(header));
}

export async function getMatchHeader(matchId: string): Promise<any | null> {
  const raw = await redis.get(`match:header:${matchId}`);
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

export async function setPendingPrediction(matchId: string, forOver: number, predictedRuns: number) {
  await redis.set(
    `pendingPred:${matchId}`,
    JSON.stringify({ forOver, predictedRuns }),
  );
}

export async function getPendingPrediction(
  matchId: string,
): Promise<{ forOver: number; predictedRuns: number } | null> {
  const raw = await redis.get(`pendingPred:${matchId}`);
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw as any;
}

export async function clearPendingPrediction(matchId: string) {
  await redis.del(`pendingPred:${matchId}`);
}

export async function addOverRuns(matchId: string, overIdx: number, runs: number) {
  if (runs <= 0) return;
  await redis.incrby(`overRuns:${matchId}:${overIdx}`, runs);
  await redis.expire(`overRuns:${matchId}:${overIdx}`, 60 * 60 * 6);
}

export async function getOverRuns(matchId: string, overIdx: number): Promise<number> {
  const v = await redis.get(`overRuns:${matchId}:${overIdx}`);
  return Number(v || 0);
}
