# Personal Technology Intelligence System (MVP)

A modular, single-process, lightweight technology trend aggregator, intelligence engine, and searchable knowledge base. It periodically crawls GitHub Trending repositories, Hacker News top stories, and hot posts from tech subreddits. It leverages the Gemini API to synthesize trending themes and generate markdown-based weekly intelligence reports.

---

## Key Features

- **Ingestion (Crawling)**:
  - Scrapes **GitHub Trending** repositories (ranking, descriptions, languages, star growth).
  - Fetches **Hacker News** top posts (via official Firebase REST API).
  - Gathers **Reddit** discussions (from `/r/programming`, `/r/devops`, and `/r/selfhosted`).
- **Data Persistence**: No database or ORM overhead. Persists raw content items in structured JSON files (`data/`).
- **AI Trend Synthesizer**: Connects with the **Gemini 1.5 Flash** API to generate trend summaries and topic classification. Runs in a graceful Mock Mode if no API key is supplied.
- **Weekly Reports**: Automatically aggregates content from the last 7 days and compiles formatted markdown summaries saved to `reports/`.
- **Search & API**: Exposes Hono-based endpoints to filter posts, search keywords, and serve generated intelligence reports.
- **Background Scheduler**: A lightweight daily interval-based scheduler executing crawls and generating reports.

---

## Folder Structure

```text
src/
├── api/
│   └── routes.ts           # Hono routes (GET /health, GET /posts, GET /search, GET /reports/latest, POST /jobs/run)
├── crawler/
│   ├── github.ts           # GitHub scraper using cheerio
│   ├── hackernews.ts       # HN API consumer
│   ├── reddit.ts           # Reddit JSON feed aggregator
│   └── index.ts            # Common Crawler Interface
├── storage/
│   └── file-storage.ts     # JSON & Markdown local file persistence
├── ai/
│   ├── gemini-provider.ts  # Gemini API provider & simulated fallback logic
│   └── summary-service.ts  # Prompt templates for summaries & topic tags
├── report/
│   └── weekly-report.ts    # Weekly report aggregation & markdown compilation
├── scheduler/
│   ├── daily-job.ts        # Ingestion, deduplication, and report workflow runner
│   └── index.ts            # Daily periodic scheduler
├── types/
│   └── index.ts            # Shared types (ContentItem)
├── config/
│   └── config.ts           # Dotenv environment variables mapping
└── index.ts                # Application Entry Point
```

---

## Getting Started

### Prerequisites

You need the [Bun Runtime](https://bun.sh/) installed on your machine.

### Installation

1. Clone or download the repository into your workspace.
2. Open terminal in the directory and install dependencies:
   ```bash
   bun install
   ```

### Configuration

Create your `.env` file from the example:
```bash
cp .env.example .env
```

Review and configure your environment variables in `.env`:

| Variable | Description | Default Value |
| :--- | :--- | :--- |
| `PORT` | The local port Hono API listens on. | `3000` |
| `DATA_DIR` | Relative/absolute path to store crawling JSON outputs. | `./data` |
| `REPORTS_DIR` | Directory to save weekly markdown reports. | `./reports` |
| `REDDIT_SUBREDDITS` | Comma-separated list of subreddits to ingest. | `programming,devops,selfhosted` |
| `HN_TOP_STORIES_COUNT`| Number of Hacker News stories to inspect. | `30` |
| `GEMINI_API_KEY` | Your Google AI Studio API key (leave empty for simulation mode).| *(Optional)* |
| `GEMINI_MODEL` | Gemini LLM model identifier. | `gemini-1.5-flash` |

---

## Run Commands

### Development Mode (with hot-reload)
```bash
bun dev
```

### Production Mode
```bash
bun start
```

### Run Automated Tests
```bash
bun test
```

---

## API Usage Examples

### 1. Health Status
Check system health, timestamp, and server uptime.
```bash
curl http://localhost:3000/health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-10T15:42:00.000Z",
  "uptime": 12.34
}
```

### 2. Retrieve Items
Get all crawled technology posts. Supports filtering by source (`github`, `hackernews`, `reddit`) and pagination parameters.
```bash
curl "http://localhost:3000/posts?source=github&limit=5"
```
**Response:**
```json
{
  "total": 65,
  "limit": 5,
  "offset": 0,
  "items": [
    {
      "id": "github-oven-sh-bun",
      "source": "github",
      "title": "oven-sh / bun",
      "url": "https://github.com/oven-sh/bun",
      "score": 72000,
      "metadata": {
        "description": "Incredibly fast JavaScript runtime, bundler, test runner, and package manager.",
        "language": "Zig",
        "starsToday": 240
      },
      "createdAt": "2026-06-10T15:42:01.000Z"
    }
  ]
}
```

### 3. Search Aggregated Data
Perform keyword searches against titles, descriptions, and languages.
```bash
curl "http://localhost:3000/search?q=rust"
```
**Response:**
```json
{
  "query": "rust",
  "total": 12,
  "items": [ ... ]
}
```

### 4. Fetch the Latest Weekly Report
Fetch the generated Markdown intelligence report.
```bash
curl http://localhost:3000/reports/latest
```
**Response:**
```json
{
  "filename": "week-2026-24.md",
  "content": "# Weekly Technology Intelligence Report (2026-24)\n\n..."
}
```

### 5. Trigger Crawl Manually
If you don't want to wait 24 hours for the scheduler to tick, you can trigger a crawl and report compilation immediately via HTTP POST.
```bash
curl -X POST http://localhost:3000/jobs/run
```

---

## GitHub Actions Deployment (Serverless)

The system can run fully inside **GitHub Actions** — no server, no database, no infrastructure required.  
A scheduled workflow crawls sources daily, generates the AI report, commits it to `reports/`, and sends a Discord notification.

### Architecture

```
GitHub Actions (cron 02:00 UTC)
        │
        ▼
  bun run pipeline          ← src/pipeline.ts
        │
   ┌────┴─────────────┐
   │   Crawlers        │  GitHub Trending / Hacker News / Reddit
   └────┬─────────────┘
        │ ContentItem[]
        ▼
  Deduplication (by id)     ← idempotent merge into data/combined.json
        │
        ▼
  Idempotency check         ← skip if reports/YYYY-MM-DD.md exists
        │
        ▼
  Gemini AI Summary         ← trend analysis in Vietnamese
        │
        ▼
  Markdown Report           ← saved to reports/YYYY-MM-DD.md
        │
        ▼
  git commit & push         ← [skip ci] tag avoids loop
        │
        ▼
  Discord Webhook           ← rich embed with topics + counts + link
```

### Setup

#### 1. Add GitHub Secrets

In your repository: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Description |
|:---|:---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `DISCORD_WEBHOOK_URL` | Discord channel webhook URL |

#### 2. Enable Workflow Permissions

**Settings → Actions → General → Workflow permissions** → select **"Read and write permissions"**

This allows the workflow to commit the generated reports back to the repository.

#### 3. Create a Discord Webhook

1. Open your Discord server → channel settings ⚙️
2. **Integrations → Webhooks → New Webhook**
3. Copy the webhook URL → add as `DISCORD_WEBHOOK_URL` secret

#### 4. Workflow File

The workflow is defined at [`.github/workflows/daily-report.yml`](.github/workflows/daily-report.yml).

**Triggers:**
- **Automatic**: every day at `02:00 UTC` (cron: `"0 2 * * *"`)
- **Manual**: via _Actions → Daily Tech Intelligence Report → Run workflow_  
  Optionally check **Force regenerate** to overwrite today's report.

### Run Locally (Pipeline Mode)

To test the serverless pipeline locally without starting the API server:

```bash
# Set env vars
export GEMINI_API_KEY=your_key
export DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Run one-shot pipeline
bun run pipeline
```

### Idempotency

The pipeline checks whether `reports/YYYY-MM-DD.md` already exists before running:

- **Report exists** → skip generation, send a "skipped" Discord notification, exit 0
- **Report missing** → crawl, summarize, generate, commit, notify

This means re-running the same workflow multiple times on the same day is safe.

### Report Storage

Reports are committed directly to the repository under `reports/`:

```
reports/
├── 2026-06-11.md
├── 2026-06-12.md
└── week-2026-24.md    ← legacy weekly format (local server mode)
```

Each daily report is accessible as a GitHub URL:
```
https://github.com/your-org/your-repo/blob/main/reports/2026-06-11.md
```

---

## Example Workflow Run

```
============================================================
  Tech Intelligence Pipeline — GitHub Actions Mode
  Wed, 11 Jun 2026 02:00:03 GMT
============================================================

[Pipeline] Starting crawlers…
  ✓ GitHub: 25 items
  ✓ HackerNews: 30 items
  ✓ Reddit: 45 items

[Pipeline] Combined: 100 unique items (0 existing + new).

[Pipeline] Generating AI trend summary…
[Pipeline] Extracting topics…

[Pipeline] Report saved → reports/2026-06-11.md

[Discord] Notification sent successfully.

[Pipeline] ✅ All done.
```

**Discord embed received:**

```
🔥 Daily Tech Intelligence Report
Week 2026-24 — AI-powered summary of today's top trends.

🏷️ Key Topics
`RUST`  `BUN`  `OPENTELEMETRY`  `AI AGENTS`  `EBPF`

📦 Items Collected
• GitHub: 25 repos
• Hacker News: 30 stories
• Reddit: 45 posts

📄 Full Report
[View on GitHub](https://github.com/your-org/your-repo/blob/main/reports/2026-06-11.md)
```

**Second run same day (idempotent):**

```
[Pipeline] Report "2026-06-11.md" already exists — skipping generation.
[Discord] Notification sent successfully.
[Pipeline] Done (skipped).
```

