import { parseBallRef } from "@/lib/ball";
import { cn } from "@/lib/utils";

export type EventType = "stats" | "banter" | "prediction";

export interface EventData {
  id: string;
  type: EventType;
  content: any;
  timestamp: string;
  ballRef?: string;
}

interface Props {
  event: EventData;
  index: number;
}

const LANE_ACCENT: Record<EventType, string> = {
  stats: "bg-lane-stats/70",
  banter: "bg-lane-banter/70",
  prediction: "bg-lane-predict/70",
};

export function BallCard({ event, index }: Props) {
  const parsed = parseBallRef(event.ballRef);
  const isPrediction = event.type === "prediction";

  const outcomeChip =
    parsed.outcome === "six"
      ? { label: "SIX", tone: "text-out-six border-out-six/40 bg-out-six/10" }
      : parsed.outcome === "four"
      ? { label: "FOUR", tone: "text-out-four border-out-four/40 bg-out-four/10" }
      : parsed.outcome === "wicket"
      ? { label: "WICKET", tone: "text-out-wicket border-out-wicket/40 bg-out-wicket/10" }
      : parsed.outcome === "dot"
      ? { label: "DOT", tone: "text-out-dot border-white/10 bg-white/5" }
      : parsed.runs > 0
      ? { label: `${parsed.runs} RUN${parsed.runs > 1 ? "S" : ""}`, tone: "text-neutral-300 border-white/10 bg-white/5" }
      : null;

  const animationDelay = `${Math.min(index, 6) * 60}ms`;

  return (
    <article
      style={{ animationDelay }}
      className={cn(
        "lane-rise group relative rounded-xl border border-white/[0.07] bg-white/[0.025]",
        "hover:bg-white/[0.04] transition-colors duration-200",
        "px-3.5 py-3 flex flex-col gap-2"
      )}
    >
      <div className={cn("absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full", LANE_ACCENT[event.type])} />

      <div className="flex items-center justify-between gap-2 pl-2">
        <div className="flex items-center gap-2 min-w-0">
          {parsed.ballNumber && (
            <span className="font-mono text-[10px] tabular text-neutral-400 bg-black/30 border border-white/5 rounded px-1.5 py-0.5">
              {parsed.ballNumber}
            </span>
          )}
          {outcomeChip && (
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em] rounded px-1.5 py-0.5 border", outcomeChip.tone)}>
              {outcomeChip.label}
            </span>
          )}
        </div>
        <span className="text-[10px] text-neutral-500 font-mono tabular shrink-0">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      <div className="pl-2">
        {isPrediction ? (
          <PredictionBody content={event.content} />
        ) : event.type === "banter" ? (
          <p className="text-base text-neutral-100 font-medium leading-snug">
            {String(event.content)}
          </p>
        ) : (
          <p className="text-[15px] text-neutral-200 leading-snug">
            {String(event.content)}
          </p>
        )}
      </div>
    </article>
  );
}

function PredictionBody({ content }: { content: any }) {
  const wp = Number(content?.winProbability);
  const next = content?.nextOverRunsPrediction;
  const wicket = content?.wicketInNextOver;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Win" value={Number.isFinite(wp) ? `${Math.round(wp)}%` : "—"} accent="text-lane-predict" />
        <Stat label="Next ov" value={next != null ? String(next) : "—"} accent="text-neutral-100" />
        <Stat
          label="Wicket"
          value={wicket === true ? "YES" : wicket === false ? "NO" : "—"}
          accent={wicket === true ? "text-out-wicket" : "text-neutral-100"}
        />
      </div>
      {content?.reasoning && (
        <p className="text-[13px] text-neutral-400 leading-snug italic border-l-2 border-lane-predict/50 pl-2 mt-1">
          “{content.reasoning}”
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-md bg-black/25 border border-white/[0.06] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn("font-display text-lg leading-none tabular mt-0.5", accent)}>{value}</div>
    </div>
  );
}
