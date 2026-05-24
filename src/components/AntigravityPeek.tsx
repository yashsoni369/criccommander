"use client";

import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventData } from "@/components/BallCard";

interface Props {
  events: EventData[];
}

const TYPE_PROMPT: Record<EventData["type"], string> = {
  stats: "stats_agent →",
  banter: "banter_agent →",
  prediction: "predictor_agent →",
};

const TYPE_COLOR: Record<EventData["type"], string> = {
  stats: "text-lane-stats",
  banter: "text-lane-banter",
  prediction: "text-lane-predict",
};

export function AntigravityPeek({ events }: Props) {
  const [open, setOpen] = useState(false);
  const latest = events.slice(0, 6);

  return (
    <aside className="mt-6 rounded-2xl border border-white/[0.07] bg-black/40 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-mi-gold" aria-hidden />
          <span className="font-display text-sm uppercase tracking-[0.16em] text-neutral-100">
            Antigravity peek
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            last {latest.length} agent calls
          </span>
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-neutral-500 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04] font-mono text-[12px]">
          {latest.length === 0 ? (
            <div className="px-4 py-6 text-neutral-500 text-center">
              No invocations yet. Waiting for the next ball…
            </div>
          ) : (
            latest.map((ev) => (
              <div key={ev.id} className="px-4 py-3 grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("uppercase tracking-[0.16em] text-[10px] font-bold", TYPE_COLOR[ev.type])}>
                    {TYPE_PROMPT[ev.type]}
                  </span>
                  <span className="text-neutral-500 tabular text-[10px]">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <pre className="text-neutral-300 whitespace-pre-wrap break-words leading-relaxed">
                  {typeof ev.content === "string"
                    ? ev.content
                    : JSON.stringify(ev.content, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
