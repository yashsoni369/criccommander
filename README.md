# 🏏 CricketCommander

> **Three AI agents. One ball. Live.**

CricketCommander is a real-time IPL companion that turns raw ball-by-ball
commentary into an electric, broadcast-grade experience. Every delivery is fed
to **three Gemini-powered agents working in parallel** — a statistician, a
Hinglish hype-man, and a predictor — and their takes stream onto a live HUD the
instant the ball is bowled.

<p align="center">
  <em>Built on Antigravity · APL Mumbai 2026</em>
</p>

---

## ✨ What it does

CricketCommander watches a live match and, for **every new ball**, fires three
specialized AI agents at once:

| Agent | Role | Output |
| --- | --- | --- |
| 📊 **Stats Agent** | Cricket statistician | One surprising, insightful stat nugget (≤ 25 words). Returns nothing rather than hallucinate a number. |
| 💬 **Banter Agent** | Mumbai super-fan | One punchy Hinglish hot-take / meme caption (≤ 20 words). |
| 🔮 **Predictor Agent** | Match analyst | Structured JSON: win probability, next-over runs, wicket likelihood, and a one-line rationale. |

On top of the agent lanes, the app delivers:

- **Live Match HUD** — score, overs, run rate, latest ball, and a win-probability
  sparkline that updates ball by ball.
- **Self-grading predictor** — every over the predictor's next-over runs call is
  scored against reality, and a running **accuracy %** is shown in the HUD. No
  smoke and mirrors.
- **Outcome-aware pulses** — the HUD flashes on sixes, fours, and wickets so big
  moments hit different.
- **Live viewer count** — a presence counter backed by a Redis sorted set.
- **Antigravity Peek** — a collapsible terminal-style log of the raw agent
  invocations, so you can watch the agents think.
- **Mobile-first lanes** — swipeable, snap-scrolling agent columns on phones;
  a three-column grid on desktop.

## 🧠 How it works

```
                         ┌──────────────────────────────┐
   Vercel Cron (1/min)──▶│        GET /api/poll          │
   Browser (every 15s)──▶│  • fetch live commentary      │
                         │  • diff against last-seen ball │
                         │  • for each NEW ball, run:     │
                         │      Stats ∥ Banter ∥ Predict  │──┐
                         │  • score previous prediction   │  │
                         └──────────────────────────────┘  │
                                                            ▼
                                                  ┌───────────────────┐
                                                  │   Upstash Redis    │
                                                  │  events · header   │
                                                  │  accuracy · viewers│
                                                  └───────────────────┘
                                                            ▲
   Browser (every 10s)──▶┌──────────────────────────────┐  │
                         │        GET /api/feed          │──┘
                         │  • return events + header +    │
                         │    accuracy for the UI         │
                         └──────────────────────────────┘
```

1. **Ingest** — `src/lib/cricbuzz.ts` scrapes Cricbuzz's mobile site for live
   commentary and the mini-scoreboard, with a short Redis cache. If the live
   feed is unavailable, it **simulates a match from fixtures** (`fixtures/`) so
   the app always has something to show — great for demos and local dev.
2. **Process** — `GET /api/poll` parses each new ball (`src/lib/ball.ts`), runs
   the three agents concurrently (`src/lib/agents/*`), and writes the results,
   match header, and predictor accuracy into Redis (`src/lib/redis.ts`).
3. **Serve** — `GET /api/feed` returns the latest events, header, and accuracy.
   `GET /api/stats` maintains the live viewer count.
4. **Render** — the client hook `src/lib/useLiveFeed.ts` polls `/api/feed`,
   nudges `/api/poll`, and drives the HUD and agent lanes in real time.

The poll/feed split keeps the UI snappy and read-cheap while the heavier
scraping + LLM work happens out of band (and is also driven by a Vercel cron in
`vercel.json`).

## 🛠 Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **[Tailwind CSS v4](https://tailwindcss.com)** with **shadcn / Base UI** components
- **[Google Generative AI](https://ai.google.dev/) (Gemini)** for the three agents
- **[Upstash Redis](https://upstash.com/)** for event storage, presence, and accuracy tracking
- **[lucide-react](https://lucide.dev/)** icons, **Anton** + **Geist** typography
- Deployed on **[Vercel](https://vercel.com)** (with a cron-driven poller)

## 🚀 Getting started

### Prerequisites

- **Node.js 20+**
- **[pnpm](https://pnpm.io/)** (the repo ships a `pnpm-lock.yaml`)
- A **Google Gemini API key** — <https://aistudio.google.com/app/apikey>
- An **Upstash Redis** database (free tier works) — <https://upstash.com/>

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key used by all three agents. |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST token. |
| `MATCH_ID` | optional | Cricbuzz match id to follow. Defaults to a demo id; unknown ids automatically fall back to the bundled fixture simulation. |

> **No live match?** Leave things as-is. With no recognized `MATCH_ID`, the app
> replays `fixtures/sample-commentary.json` as a simulated live innings, so you
> get the full experience without a real game in progress.

### 3. Run

```bash
pnpm dev
```

Open <http://localhost:3000> — the agents will start reacting within a few balls.

## 📜 Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Run the production build. |
| `pnpm lint` | Lint with ESLint. |

## 📁 Project structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ poll/route.ts     # Ingest + run agents + score predictions
│  │  ├─ feed/route.ts     # Read events/header/accuracy for the UI
│  │  └─ stats/route.ts    # Live viewer presence count
│  ├─ layout.tsx           # Fonts, metadata, dark theme shell
│  ├─ page.tsx             # Home: HUD + agent lanes + Antigravity peek
│  └─ globals.css          # Theme tokens, pulses, scanlines
├─ components/
│  ├─ MatchHUD.tsx         # Score / overs / run rate / win-prob sparkline
│  ├─ AgentLanes.tsx       # Three swipeable agent columns
│  ├─ BallCard.tsx         # A single agent reaction card
│  ├─ WinProbSparkline.tsx # Win-probability mini chart
│  ├─ LiveBadge.tsx        # "LIVE · N watching" badge
│  ├─ AntigravityPeek.tsx  # Raw agent-invocation log
│  └─ ui/                  # shadcn primitives (button, badge, card)
└─ lib/
   ├─ agents/              # stats · banter · predictor (Gemini prompts)
   ├─ cricbuzz.ts          # Live scrape + fixture simulation
   ├─ ball.ts              # Ball-text parser (outcome, runs, players)
   ├─ redis.ts             # Upstash helpers (events, accuracy, presence)
   └─ useLiveFeed.ts       # Client polling hook driving the UI
fixtures/                  # Sample commentary for offline / demo mode
```

## ☁️ Deployment

The app is built for **Vercel**. `vercel.json` registers a cron that hits
`/api/poll` every minute so balls are processed even when no one has the tab
open:

```json
{ "crons": [{ "path": "/api/poll", "schedule": "* * * * *" }] }
```

Set `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and
(optionally) `MATCH_ID` in your Vercel project's environment variables, then
deploy as usual.

## 🤝 Contributing

This repo uses a customized Next.js setup — **read `AGENTS.md`** before making
changes, and consult the bundled Next.js docs under
`node_modules/next/dist/docs/` rather than relying on memory.

## ⚖️ Disclaimer

CricketCommander is an independent fan/demo project. It is not affiliated with,
endorsed by, or connected to the IPL, BCCI, Cricbuzz, or any team. Live data is
sourced from publicly available pages for educational and demonstration
purposes; respect Cricbuzz's terms of use and rate limits.
