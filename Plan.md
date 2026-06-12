# plan.md

# Phase 1 - MVP

Goal:

Generate weekly technology reports automatically.

---

## Task 1

Initialize Bun project.

Requirements:

* TypeScript
* ESLint
* Prettier

---

## Task 2

Create project structure.

src/

crawler/

storage/

ai/

report/

scheduler/

api/

types/

config/

data/

reports/

---

## Task 3

Implement GitHub crawler.

Requirements:

Fetch:

* repository name
* url
* stars
* language
* description

Save to JSON.

File:

data/github.json

---

## Task 4

Implement Hacker News crawler.

Requirements:

Fetch:

* title
* url
* score

Save to JSON.

File:

data/hackernews.json

---

## Task 5

Implement Reddit crawler.

Requirements:

Subreddits:

* programming
* devops
* selfhosted

Store:

* title
* url
* score

Save to JSON.

File:

data/reddit.json

---

## Task 6

Create common content model.

Interface:

ContentItem

Fields:

* source
* title
* url
* score
* metadata
* createdAt

All crawlers must produce this format.

---

## Task 7

Create FileStorage service.

Responsibilities:

* save JSON
* load JSON
* append records

---

## Task 8

Implement AI Summary Service.

Provider:

Gemini

Functions:

* summarizePosts()
* extractTopics()
* generateInsights()

---

## Task 9

Generate Weekly Report.

Output:

Markdown file.

Location:

reports/

Example:

reports/week-2026-24.md

---

## Task 10

Implement Scheduler.

Run daily.

Workflow:

crawl

↓

save

↓

summarize

↓

generate report

---

## Task 11

Implement Search API.

Endpoints:

GET /health

GET /posts

GET /search

Query:

keyword

source

---

# Phase 2

Trend Analysis

Requirements:

* keyword frequency
* technology ranking
* topic growth

---

# Phase 3

Knowledge Base

Requirements:

* embeddings
* semantic search

Storage can migrate to SQLite if necessary.

---

# Phase 4

Research Assistant

RAG-based assistant using collected content.

Questions:

"What was trending last month?"

"Show cloud-related projects."

"What topics are growing fastest?"
