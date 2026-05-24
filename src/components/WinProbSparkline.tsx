"use client";

import { useMemo } from "react";

interface Props {
  series: { ball: string | null; p: number }[];
  height?: number;
  className?: string;
}

export function WinProbSparkline({ series, height = 36, className }: Props) {
  const { d, fillD, lastX, lastY, lastP } = useMemo(() => {
    const w = 220;
    const h = height;
    const pad = 4;
    if (series.length === 0) {
      return { d: "", fillD: "", lastX: 0, lastY: 0, lastP: null as number | null };
    }
    const xs = series.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1));
    const ys = series.map((s) => h - pad - ((s.p / 100) * (h - pad * 2)));
    const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");
    const fillD = `${d} L ${xs[xs.length - 1].toFixed(2)} ${h - pad} L ${xs[0].toFixed(2)} ${h - pad} Z`;
    return {
      d,
      fillD,
      lastX: xs[xs.length - 1],
      lastY: ys[ys.length - 1],
      lastP: series[series.length - 1].p,
    };
  }, [series, height]);

  if (series.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 ${className || ""}`}>
        <span>Win prob</span>
        <span className="font-mono">awaiting predictor…</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 shrink-0">Win prob</span>
      <svg
        viewBox={`0 0 220 ${height}`}
        preserveAspectRatio="none"
        className="w-full max-w-[220px] h-9"
        aria-label="Win probability over recent balls"
      >
        <defs>
          <linearGradient id="winprob-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--mi-gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--mi-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#winprob-fill)" />
        <path
          d={d}
          fill="none"
          stroke="var(--mi-gold)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r={2.6} fill="var(--mi-gold)" />
        <circle cx={lastX} cy={lastY} r={5} fill="var(--mi-gold)" opacity={0.25}>
          <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <span className="font-display text-lg tabular text-mi-gold leading-none shrink-0">
        {lastP !== null ? `${Math.round(lastP)}%` : "—"}
      </span>
    </div>
  );
}
