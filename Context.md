# context.md

# Project: Personal Technology Intelligence System

## Purpose

Build a personal technology trend tracking tool.

The system automatically collects information from technology communities, summarizes the content using AI, and generates weekly reports.

This project is intended for personal use only.

The primary objective is speed of development and usefulness.

The system should be simple, lightweight, and easy to evolve.

---

# Core Problem

Every day valuable information appears on:

* GitHub Trending
* Hacker News
* Reddit

Most of the time this information is forgotten.

The goal is to continuously collect and summarize useful information into a searchable personal knowledge base.

---

# Target User

Single user.

No authentication.

No multi-user support.

No SaaS features.

---

# Data Sources

Phase 1:

* GitHub Trending
* Hacker News
* Reddit

Subreddits:

* programming
* devops
* selfhosted

Future:

* Arxiv
* Product Hunt
* Engineering Blogs
* YouTube

---

# Core Features

1. Collect trending content.
2. Store collected content locally.
3. Generate AI summaries.
4. Generate weekly reports.
5. Search historical content.
6. Track technology trends.

---

# Design Philosophy

Prioritize:

* Simplicity
* Speed
* Maintainability

Avoid:

* Kubernetes
* Kafka
* PostgreSQL
* Microservices
* Distributed systems

for the MVP.

---

# Storage Strategy

Use local JSON files.

No database is required in phase 1.

Data should remain portable and human-readable.

---

# Tech Stack

Runtime:

Bun

Language:

TypeScript

API:

Hono

Storage:

JSON files

Scheduler:

node-cron

AI:

Gemini API

Deployment:

Docker (optional)

---

# Success Criteria

The project is successful if:

* A daily crawl can run automatically.
* Weekly reports can be generated.
* Historical content can be searched.
* The user can discover useful technology trends.
