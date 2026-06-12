# Phase 3 Deployment Plan - GitHub Actions + Discord

## 🎯 Goal

Deploy Personal Technology Intelligence System using GitHub Actions as the runtime environment.

System will:

1. Run scheduled jobs (daily or weekly)
2. Crawl technology sources
3. Generate AI-powered report
4. Save markdown report to repository
5. Send notification to Discord via webhook

---

# 🧠 Architecture Overview

```text id="a1"
GitHub Actions (cron)
        ↓
Node/Bun runtime
        ↓
Crawler (GitHub / HN / Reddit)
        ↓
AI Summarizer (Gemini)
        ↓
Report Generator (Markdown)
        ↓
File Storage (repo)
        ↓
Discord Notifier (Webhook)
```

---

# ⚙️ Tech Constraints

* No server required
* No database required
* Must run fully inside GitHub Actions
* Use Bun or Node.js runtime
* Use Discord Webhook only (no bot framework)
* Must be stateless execution

---

# 📦 Required Environment Variables

Set in GitHub Secrets:

```text id="e1"
GEMINI_API_KEY
DISCORD_WEBHOOK_URL
```

Optional:

```text id="e2"
ENABLE_DISCORD=true
```

---

# 📁 Output Structure

After each run:

```text id="f1"
reports/
  2026-06-11.md
  2026-06-12.md
```

Optional JSON cache:

```text id="f2"
data/
  github.json
  reddit.json
  hn.json
```

---

# 🧩 GitHub Actions Workflow

## File:

```text id="w1"
.github/workflows/daily-report.yml
```

---

## Trigger:

```yaml id="w2"
on:
  schedule:
    - cron: "0 2 * * *"  # every day 2 AM UTC
  workflow_dispatch:
```

---

## Steps:

1. Checkout repo
2. Setup Bun
3. Install dependencies
4. Run crawler + report generator
5. Commit markdown report
6. Send Discord notification

---

## Example Workflow:

```yaml id="w3"
name: Daily Tech Intelligence Report

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run intelligence pipeline
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: bun run src/index.ts

      - name: Commit reports
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add reports/
          git commit -m "chore: daily tech report" || echo "No changes"
          git push
```

---

# 📡 Discord Notification Module

## Responsibilities:

Create module:

```text id="m1"
src/notifier/discord.ts
```

---

## Functionality:

* sendWebhook()
* sendReport()
* formatMessage()

---

## Message Format:

### Simple version:

```text id="m2"
🔥 Daily Tech Intelligence Report

Top Trends:
- OpenTelemetry adoption rising
- AI coding agents trending
- Edge computing growth

Full report: https://github.com/your-repo/reports/2026-06-11.md
```

---

## OR Rich Embed:

```json id="m3"
{
  "embeds": [
    {
      "title": "🔥 Daily Tech Intelligence Report",
      "description": "Top tech trends today",
      "color": 5814783,
      "fields": [
        {
          "name": "Top Trend",
          "value": "OpenTelemetry + AI Agents"
        }
      ]
    }
  ]
}
```

---

# 🧱 Integration Flow

Modify main entry:

```text id="i1"
src/index.ts
```

Flow:

```text id="i2"
runCrawler()
↓
generateSummary()
↓
generateMarkdownReport()
↓
saveReport()
↓
sendDiscordNotification()
```

---

# 🛡️ Reliability Rules

## Must handle:

* missing API keys
* Discord webhook failure
* Gemini timeout
* empty data set

---

## Failure policy:

```text id="r1"
DO NOT crash pipeline
LOG error
CONTINUE execution
```

---

## Retry strategy:

* Discord: retry 2 times
* AI: retry 1 time

---

# 🚫 Constraints

Do NOT:

* introduce database
* introduce server hosting
* introduce queue system
* introduce microservices

Keep system stateless.

---

# 📊 Success Criteria

Deployment is successful if:

* GitHub Actions runs daily automatically
* Report is generated in `/reports`
* Commit is pushed successfully
* Discord receives notification message
* System runs without manual intervention

---

# 🔮 Future Extensions (NOT IMPLEMENT YET)

* Telegram notifications
* Email digest
* Multi-channel notification system
* Web dashboard (GitHub Pages or VPS)
* AI chat assistant over reports
