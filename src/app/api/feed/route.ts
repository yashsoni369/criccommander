import { NextResponse } from 'next/server';
import { getRecentEvents, getAccuracy, getMatchHeader } from '@/lib/redis';
import { fetchCommentary } from '@/lib/cricbuzz';

export const revalidate = 0;

export async function GET() {
  const matchId = process.env.MATCH_ID || '114145';

  try {
    let header = await getMatchHeader(matchId);

    if (!header) {
      try {
        const data = await fetchCommentary(matchId);
        const latest = (data?.commentaryList || [])[0];
        header = {
          teams: {
            bat: data?.miniscore?.batTeam?.teamName || 'BAT',
            bowl: data?.miniscore?.bowlTeam?.teamName || 'BOWL',
          },
          teamScore: data?.miniscore?.batTeam?.teamScore || null,
          bowlTeamScore: data?.miniscore?.bowlTeam?.teamScore || null,
          overs: data?.miniscore?.overs || null,
          runRate: data?.miniscore?.currentRunRate || null,
          latestBallText: (latest?.commText || '').replace(/<[^>]+>/g, '') || null,
          source: data?.source || 'fixture',
        };
      } catch {
        header = null;
      }
    }

    const [events, accuracy] = await Promise.all([
      getRecentEvents(matchId, 40),
      getAccuracy(matchId),
    ]);

    return NextResponse.json({ events, header, accuracy });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ events: [], header: null, accuracy: { hits: 0, total: 0 } }, { status: 500 });
  }
}
