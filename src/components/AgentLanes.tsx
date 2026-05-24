"use client";

import { useEffect, useRef, useState } from "react";
import { BallCard, type EventData } from "@/components/BallCard";
import { cn } from "@/lib/utils";
import { BarChart3, MessageSquareQuote, Sparkles } from "lucide-react";

type LaneKey = "stats" | "banter" | "prediction";

interface Props {
  lanes: { stats: EventData[]; banter: EventData[]; prediction: EventData[] };
  loading: boolean;
}

const LANES: { key: LaneKey; label: string; tagline: string; Icon: typeof BarChart3; accent: string }[] = [
  { key: "stats", label: "Stats Agent", tagline: "Surprising nuggets", Icon: BarChart3, accent: "text-lane-stats" },
  { key: "banter", label: "Banter Agent", tagline: "Hinglish hot takes", Icon: MessageSquareQuote, accent: "text-lane-banter" },
  { key: "prediction", label: "Predictor Agent", tagline: "Next-over outlook", Icon: Sparkles, accent: "text-lane-predict" },
];

export function AgentLanes({ lanes, loading }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const laneRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.laneIdx);
          if (entry.isIntersecting && (best === null || entry.intersectionRatio > best.ratio)) {
            best = { idx, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveIdx(best.idx);
      },
      { root, threshold: [0.4, 0.6, 0.8] }
    );
    laneRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToLane = (idx: number) => {
    const el = laneRefs.current[idx];
    if (el && scrollerRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  };

  return (
    <section className="mt-4">
      <div className="md:hidden flex items-center justify-between mb-3 px-1">
        <div className="flex gap-1.5">
          {LANES.map((l, i) => (
            <button
              key={l.key}
              type="button"
              onClick={() => scrollToLane(i)}
              aria-label={`Show ${l.label}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                activeIdx === i ? "w-6 bg-neutral-200" : "w-1.5 bg-neutral-700"
              )}
            />
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          {LANES[activeIdx].label}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4",
          "md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0"
        )}
      >
        {LANES.map((lane, idx) => {
          const events = lanes[lane.key];
          const { Icon } = lane;
          return (
            <section
              key={lane.key}
              ref={(el) => { laneRefs.current[idx] = el; }}
              data-lane-idx={idx}
              className={cn(
                "snap-start shrink-0 w-[86vw] md:w-auto",
                "rounded-2xl border border-white/[0.07] bg-white/[0.015]",
                "flex flex-col"
              )}
            >
              <header className={cn(
                "sticky top-0 z-10 backdrop-blur-md bg-black/40 border-b border-white/[0.06]",
                "px-3.5 py-2.5 rounded-t-2xl flex items-center gap-2.5"
              )}>
                <Icon className={cn("w-4 h-4", lane.accent)} aria-hidden />
                <div className="min-w-0">
                  <div className={cn("font-display text-sm tracking-[0.06em] uppercase leading-none", lane.accent)}>
                    {lane.label}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-[0.18em] mt-1">
                    {lane.tagline} · {events.length}
                  </div>
                </div>
              </header>

              <div className="flex flex-col gap-2.5 p-3 min-h-[180px]">
                {events.length === 0 ? (
                  <LaneWarmup laneKey={lane.key} loading={loading} />
                ) : (
                  events.map((ev, i) => <BallCard key={ev.id} event={ev} index={i} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

const WARMUP_COPY: Record<LaneKey, { line1: string; line2: string }> = {
  stats: { line1: "Pulling career numbers", line2: "First insight on the next ball." },
  banter: { line1: "Loading the punchlines", line2: "Banter drops on the next ball." },
  prediction: { line1: "Modeling the next over", line2: "First forecast on ball one." },
};

function LaneWarmup({ laneKey, loading }: { laneKey: LaneKey; loading: boolean }) {
  const copy = WARMUP_COPY[laneKey];
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-6 gap-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-pulse" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-pulse" style={{ animationDelay: "180ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-pulse" style={{ animationDelay: "360ms" }} />
      </div>
      <div className="font-display text-sm uppercase tracking-[0.18em] text-neutral-300">
        {loading ? "Connecting" : copy.line1}
      </div>
      <div className="text-[12px] text-neutral-500 max-w-[20ch] leading-snug">
        {copy.line2}
      </div>
    </div>
  );
}
