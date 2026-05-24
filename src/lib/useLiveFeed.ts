"use client";

import { useEffect, useRef, useState } from "react";
import { parseBallRef, type BallOutcome } from "@/lib/ball";
import type { EventData } from "@/components/BallCard";

export interface MatchHeader {
  teams: { bat: string; bowl: string };
  teamScore: string | null;
  bowlTeamScore?: string | null;
  overs: string | null;
  runRate: string | null;
  latestBallText: string | null;
  source?: 'live' | 'fixture';
}

export interface LiveFeed {
  loading: boolean;
  events: EventData[];
  lanes: {
    stats: EventData[];
    banter: EventData[];
    prediction: EventData[];
  };
  header: MatchHeader | null;
  accuracy: { hits: number; total: number };
  winProbSeries: { ball: string | null; p: number }[];
  latestBallNumber: string | null;
  latestOutcome: BallOutcome;
  pulseKey: number;
}

const TYPE_TO_LANE = {
  stats: "stats",
  banter: "banter",
  prediction: "prediction",
} as const;

export function useLiveFeed(): LiveFeed {
  const [events, setEvents] = useState<EventData[]>([]);
  const [header, setHeader] = useState<MatchHeader | null>(null);
  const [accuracy, setAccuracy] = useState({ hits: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [pulseKey, setPulseKey] = useState(0);
  const lastSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const kickPoll = () => {
      fetch("/api/poll", { cache: "no-store" }).catch(() => {});
    };

    const tick = async () => {
      try {
        const res = await fetch("/api/feed", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const rawEvents: EventData[] = data.events || [];
        const seen = new Set<string>();
        const nextEvents: EventData[] = [];
        for (const ev of rawEvents) {
          if (!ev?.id || seen.has(ev.id)) continue;
          seen.add(ev.id);
          nextEvents.push(ev);
        }
        setEvents(nextEvents);
        setHeader(data.header || null);
        setAccuracy(data.accuracy || { hits: 0, total: 0 });

        const newestId = nextEvents[0]?.id || null;
        if (newestId && lastSeenIdRef.current && newestId !== lastSeenIdRef.current) {
          setPulseKey((k) => k + 1);
        }
        if (newestId) lastSeenIdRef.current = newestId;
      } catch (err) {
        console.error("feed tick failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    kickPoll();
    tick();
    const feedId = setInterval(tick, 10_000);
    const pollId = setInterval(kickPoll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(feedId);
      clearInterval(pollId);
    };
  }, []);

  const lanes = {
    stats: events.filter((e) => e.type === TYPE_TO_LANE.stats),
    banter: events.filter((e) => e.type === TYPE_TO_LANE.banter),
    prediction: events.filter((e) => e.type === TYPE_TO_LANE.prediction),
  };

  const winProbSeries = lanes.prediction
    .slice(0, 20)
    .map((e) => {
      const parsed = parseBallRef(e.ballRef);
      const p = Number(e.content?.winProbability);
      return Number.isFinite(p) ? { ball: parsed.ballNumber, p } : null;
    })
    .filter((x): x is { ball: string | null; p: number } => x !== null)
    .reverse();

  const latest = events[0];
  const parsedLatest = parseBallRef(latest?.ballRef || header?.latestBallText || "");

  return {
    loading,
    events,
    lanes,
    header,
    accuracy,
    winProbSeries,
    latestBallNumber: parsedLatest.ballNumber,
    latestOutcome: parsedLatest.outcome,
    pulseKey,
  };
}
