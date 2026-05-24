export type BallOutcome = "six" | "four" | "wicket" | "dot" | "run";

export interface ParsedBall {
  ballNumber: string | null;
  outcome: BallOutcome;
  runs: number;
  wicket: boolean;
  bowler: string | null;
  batter: string | null;
  headline: string;
}

const BALL_RE = /^(\d{1,2}\.\d)\s/;
const BOWLER_BATTER_RE = /^\d{1,2}\.\d\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)*)\s+to\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)*),/;

export function parseBallRef(text: string | undefined | null): ParsedBall {
  const safe = (text || "").trim();
  const ballMatch = safe.match(BALL_RE);
  const ballNumber = ballMatch ? ballMatch[1] : null;

  const upper = safe.toUpperCase();
  let outcome: BallOutcome = "run";
  let runs = 0;
  let wicket = false;

  if (/\bOUT\b|CAUGHT|BOWLED|LBW|STUMPED|RUN OUT/.test(upper)) {
    outcome = "wicket";
    wicket = true;
  } else if (/\bSIX\b|SIX RUNS|SIX!/.test(upper)) {
    outcome = "six";
    runs = 6;
  } else if (/\bFOUR\b|FOUR!|FOUR RUNS/.test(upper)) {
    outcome = "four";
    runs = 4;
  } else if (/\bNO RUN\b|DOT BALL|, NO RUN/.test(upper)) {
    outcome = "dot";
    runs = 0;
  } else {
    const runMatch = safe.match(/,\s*(\d)\s*runs?\b/i);
    if (runMatch) runs = parseInt(runMatch[1], 10);
  }

  const bbMatch = safe.match(BOWLER_BATTER_RE);
  const bowler = bbMatch ? bbMatch[1] : null;
  const batter = bbMatch ? bbMatch[2] : null;

  let headline = safe;
  if (ballNumber) headline = safe.slice(ballMatch![0].length);
  headline = headline.replace(/\s+/g, " ").trim();

  return { ballNumber, outcome, runs, wicket, bowler, batter, headline };
}

export function outcomeLabel(o: BallOutcome): string {
  switch (o) {
    case "six":    return "SIX";
    case "four":   return "FOUR";
    case "wicket": return "WICKET";
    case "dot":    return "DOT";
    case "run":    return "RUNS";
  }
}

export function outcomeAccentClass(o: BallOutcome): string {
  switch (o) {
    case "six":    return "text-out-six";
    case "four":   return "text-out-four";
    case "wicket": return "text-out-wicket";
    case "dot":    return "text-out-dot";
    case "run":    return "text-neutral-300";
  }
}
