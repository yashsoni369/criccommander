import { NextResponse } from 'next/server';
import { fetchCommentary } from '@/lib/cricbuzz';
import {
  getLastBallSeen,
  setLastBallSeen,
  pushEvent,
  setMatchHeader,
  setPendingPrediction,
  getPendingPrediction,
  clearPendingPrediction,
  addOverRuns,
  getOverRuns,
  bumpAccuracy,
} from '@/lib/redis';
import { generateStats } from '@/lib/agents/stats';
import { generateBanter } from '@/lib/agents/banter';
import { generatePrediction } from '@/lib/agents/predictor';
import { parseBallRef } from '@/lib/ball';

export const maxDuration = 60;
export const revalidate = 0;

const ACCURACY_TOLERANCE = 2;

export async function GET() {
  const matchId = process.env.MATCH_ID || '114145';

  try {
    const data = await fetchCommentary(matchId);

    const commentaryList = data?.commentaryList || [];
    if (commentaryList.length === 0) {
      return NextResponse.json({ success: false, message: 'No commentary data' });
    }

    await setMatchHeader(matchId, {
      teams: {
        bat: data?.miniscore?.batTeam?.teamName || 'BAT',
        bowl: data?.miniscore?.bowlTeam?.teamName || 'BOWL',
      },
      teamScore: data?.miniscore?.batTeam?.teamScore || null,
      bowlTeamScore: data?.miniscore?.bowlTeam?.teamScore || null,
      overs: data?.miniscore?.overs || null,
      runRate: data?.miniscore?.currentRunRate || null,
      latestBallText: (commentaryList[0]?.commText || '').replace(/<[^>]+>/g, '') || null,
      source: data?.source || 'fixture',
    });

    const lastBallSeen = await getLastBallSeen(matchId);

    const newBalls: any[] = [];
    for (const ball of commentaryList) {
      if (ball.timestamp && String(ball.timestamp) === lastBallSeen) break;
      if (ball.commText) newBalls.push(ball);
    }

    if (newBalls.length === 0) {
      return NextResponse.json({ success: true, message: 'No new balls' });
    }

    newBalls.reverse();

    for (const ball of newBalls) {
      const ballEventText = (ball.commText || '').replace(/<[^>]+>/g, '');
      const parsed = parseBallRef(ballEventText);
      const currentOver = parsed.ballNumber ? parseInt(parsed.ballNumber.split('.')[0], 10) : null;
      const currentBallInOver = parsed.ballNumber ? parseInt(parsed.ballNumber.split('.')[1], 10) : null;

      const batScore = data?.miniscore?.batTeam?.teamScore || 'N/A';
      const overs = data?.miniscore?.overs || 'N/A';
      const crr = data?.miniscore?.currentRunRate || 'N/A';
      const matchState = `Score: ${batScore}, Overs: ${overs}, Run Rate: ${crr}`;

      const [stats, banter, prediction] = await Promise.all([
        generateStats(ballEventText),
        generateBanter(ballEventText),
        generatePrediction(matchState),
      ]);

      const timestamp = new Date().toISOString();
      const eventId = ball.timestamp || Date.now();

      if (stats) {
        await pushEvent(matchId, { id: `stats_${eventId}`, type: 'stats', content: stats, timestamp, ballRef: ballEventText });
      }
      if (banter) {
        await pushEvent(matchId, { id: `banter_${eventId}`, type: 'banter', content: banter, timestamp, ballRef: ballEventText });
      }
      if (prediction) {
        await pushEvent(matchId, { id: `pred_${eventId}`, type: 'prediction', content: prediction, timestamp, ballRef: ballEventText });
      }

      if (currentOver !== null && parsed.runs > 0) {
        await addOverRuns(matchId, currentOver, parsed.runs);
      }

      if (currentOver !== null) {
        const pending = await getPendingPrediction(matchId);
        if (pending && pending.forOver < currentOver) {
          const actualRuns = await getOverRuns(matchId, pending.forOver);
          const hit = Math.abs(actualRuns - pending.predictedRuns) <= ACCURACY_TOLERANCE;
          await bumpAccuracy(matchId, hit);
          await clearPendingPrediction(matchId);
        }
      }

      if (
        prediction &&
        currentOver !== null &&
        currentBallInOver !== null &&
        currentBallInOver >= 6 &&
        typeof prediction.nextOverRunsPrediction === 'number'
      ) {
        await setPendingPrediction(matchId, currentOver + 1, prediction.nextOverRunsPrediction);
      }

      if (ball.timestamp) {
        await setLastBallSeen(matchId, String(ball.timestamp));
      }
    }

    return NextResponse.json({ success: true, processed: newBalls.length });
  } catch (error: any) {
    console.error('Poll Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
