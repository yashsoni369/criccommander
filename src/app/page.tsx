"use client";

import { LiveBadge } from "@/components/LiveBadge";
import { MatchHUD } from "@/components/MatchHUD";
import { AgentLanes } from "@/components/AgentLanes";
import { AntigravityPeek } from "@/components/AntigravityPeek";
import { useLiveFeed } from "@/lib/useLiveFeed";

export default function Home() {
  const feed = useLiveFeed();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <div className="font-display text-xl md:text-2xl tracking-[0.06em] uppercase leading-none text-neutral-50">
              Cricket<span className="text-mi-gold">Commander</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              <span className="inline-block h-3 w-px bg-white/15" />
              Three agents · One ball
            </div>
          </div>
          <LiveBadge />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-16">
        <MatchHUD
          header={feed.header}
          accuracy={feed.accuracy}
          winProbSeries={feed.winProbSeries}
          latestOutcome={feed.latestOutcome}
          latestBallNumber={feed.latestBallNumber}
          pulseKey={feed.pulseKey}
        />

        <AgentLanes lanes={feed.lanes} loading={feed.loading} />

        <AntigravityPeek events={feed.events} />

        <footer className="mt-10 text-center text-[10px] uppercase tracking-[0.28em] text-neutral-600">
          Built on Antigravity · APL Mumbai 2026
        </footer>
      </main>
    </div>
  );
}
