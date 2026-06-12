# architecture.md

# Architectural Style

Simple Modular Application

The application runs as a single process.

No database.

No message queue.

No distributed components.

---

# High Level Architecture

```
        +----------------+
        | Scheduler      |
        +-------+--------+
                |
                v

      +------------------+
      | Crawlers         |
      +--------+---------+
               |
               v

      +------------------+
      | File Storage     |
      | JSON Files       |
      +--------+---------+
               |
               v

      +------------------+
      | AI Service       |
      +--------+---------+
               |
               v

      +------------------+
      | Report Generator |
      +--------+---------+
               |
               v

      +------------------+
      | Hono API         |
      +------------------+
```

---

# Folder Structure

src/

```
api/

crawler/

storage/

ai/

report/

scheduler/

types/

config/
```

data/

reports/

---

# Module Responsibilities

## Crawler Module

Responsibilities:

* fetch external data
* normalize content
* return ContentItem[]

Files:

github.ts

reddit.ts

hackernews.ts

---

## Storage Module

Responsibilities:

* read JSON files
* write JSON files
* manage local persistence

Files:

file-storage.ts

---

## AI Module

Responsibilities:

* summarize content
* identify topics
* generate insights

Files:

gemini-provider.ts

summary-service.ts

---

## Report Module

Responsibilities:

* generate markdown reports
* create weekly summaries

Files:

weekly-report.ts

---

## Scheduler Module

Responsibilities:

* execute daily jobs

Files:

daily-job.ts

---

## API Module

Responsibilities:

* expose search endpoints
* expose health endpoint

Files:

routes.ts

---

# Core Data Model

interface ContentItem {

```
id: string

source: string

title: string

url: string

score: number

metadata: object

createdAt: string
```

}

---

# Storage Layout

data/

github.json

reddit.json

hackernews.json

combined.json

---

# Report Layout

reports/

week-2026-24.md

week-2026-25.md

week-2026-26.md

---

# Scheduler Flow

Daily

1. Crawl GitHub

2. Crawl Hacker News

3. Crawl Reddit

4. Merge content

5. Save JSON

6. Generate summary

7. Generate report

---

# Search Flow

Client

↓

Hono API

↓

Load JSON

↓

Filter

↓

Return Results

---

# Future Evolution

Step 1

JSON

↓

Step 2

SQLite

↓

Step 3

SQLite + Embeddings

↓

Step 4

Personal Research Assistant

The architecture should evolve incrementally.

Never introduce complexity before it becomes necessary.
