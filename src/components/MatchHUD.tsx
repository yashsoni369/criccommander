"use client";

import { useEffect, useRef } from "react";
import { WinProbSparkline } from "@/components/WinProbSparkline";
import { parseBallRef, outcomeLabel } from "@/lib/ball";
import type { MatchHeader } from "@/lib/useLiveFeed";

interface Props {
  header: MatchHeader | null;
  accuracy: { hits: number; total: number };
  winProbSeries: { ball: string | null; p: number }[];
  latestOutcome: "six" | "four" | "wicket" | "dot" | "run";
  latestBallNumber: string | null;
  pulseKey: number;
}

export function MatchHUD({
  header,
  accuracy,
  winProbSeries,
  latestOutcome,
  latestBallNumber,
  pulseKey,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pulseTypeForCSS =
    latestOutcome === "six" || latestOutcome === "four" || latestOutcome === "wicket"
      ? latestOutcome
      : "dot";

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || pulseKey === 0) return;
    el.setAttribute("data-pulse", pulseTypeForCSS);
    const t = window.setTimeout(() => el.removeAttribute("data-pulse"), 1400);
    return () => window.clearTimeout(t);
  }, [pulseKey, pulseTypeForCSS]);

  const parsedLatest = parseBallRef(header?.latestBallText || "");
  const score = header?.teamScore || null;
  const overs = header?.overs || null;
  const rr = header?.runRate || null;
  const accuracyPct =
    accuracy.total > 0 ? Math.round((accuracy.hits / accuracy.total) * 100) : null;
  const warming = !header;

  const outcomeTone =
    latestOutcome === "six"
      ? "text-out-six"
      : latestOutcome === "four"
      ? "text-out-four"
      : latestOutcome === "wicket"
      ? "text-out-wicket"
      : "text-neutral-300";

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] shadow-[0_2px_40px_-12px_rgba(0,0,0,0.6)] scanlines"
    >
      <div className="px-4 md:px-5 py-4 grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] uppercase tracking-[0.28em] text-neutral-500 font-medium">
              {header?.teams?.bat || "RR"} <span className="text-neutral-700">vs</span>{" "}
              {header?.teams?.bowl || "MI"}
            </span>
            {warming && (
              <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Warming up the agents…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${warming ? "bg-neutral-600" : "bg-out-four"} ticker-dot`} />
            {warming ? "Connecting" : "Innings live"}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <div>
              <div className="font-display text-5xl md:text-6xl leading-none tabular text-neutral-50 drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
                {score ?? <span className="text-neutral-700">000/0</span>}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 mt-1">
                Score
              </div>
            </div>
            <div className="h-12 w-px bg-white/10 mx-1" />
            <div>
              <div className="font-display text-3xl md:text-4xl leading-none tabular text-mi-gold">
                {overs ?? <span className="text-neutral-700">0.0</span>}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 mt-1">
                Overs
              </div>
            </div>
            <div className="h-12 w-px bg-white/10 mx-1 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="font-display text-3xl leading-none tabular text-neutral-200">
                {rr ?? <span className="text-neutral-700">0.00</span>}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 mt-1">
                Run rate
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Predictor
            </div>
            <div className="font-display text-2xl tabular text-lane-predict leading-none mt-1">
              {accuracyPct !== null ? `${accuracyPct}%` : <span className="text-neutral-700">—</span>}
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 tabular">
              {accuracy.hits}/{accuracy.total} calls
            </div>
          </div>
        </div>

        {(parsedLatest.ballNumber || latestBallNumber) && (
          <div className="flex items-start gap-3 rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
            <div className="shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">Ball</span>
              <span className="font-display text-lg leading-none tabular text-neutral-100">
                {parsedLatest.ballNumber || latestBallNumber}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-[0.28em] font-bold ${outcomeTone}`}>
                  {outcomeLabel(latestOutcome)}
                </span>
                {parsedLatest.bowler && parsedLatest.batter && (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 truncate">
                    {parsedLatest.bowler} → {parsedLatest.batter}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-200 leading-snug mt-1 line-clamp-2">
                {parsedLatest.headline || header?.latestBallText}
              </p>
            </div>
          </div>
        )}

        <WinProbSparkline series={winProbSeries} className="pt-1" />
      </div>
    </div>
  );
}
