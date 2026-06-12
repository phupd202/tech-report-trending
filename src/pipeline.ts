/**
 * GitHub Actions Pipeline Entry Point
 *
 * This script replaces src/index.ts for serverless CI execution.
 * It is a one-shot, stateless runner:
 *
 *   1. Crawl GitHub / HN / Reddit
 *   2. Merge & deduplicate items (idempotent)
 *   3. Check if today's report already exists → skip if so
 *   4. Generate AI summary + weekly report markdown
 *   5. Save report to /reports/<date>.md
 *   6. Send Discord webhook notification
 *
 * No HTTP server. No background scheduler. Exit 0 on success.
 */

import { FileStorage } from './storage/file-storage';
import { GitHubCrawler } from './crawler/github';
import { HackerNewsCrawler } from './crawler/hackernews';
import { RedditCrawler } from './crawler/reddit';
import { GeminiProvider } from './ai/gemini-provider';
import { SummaryService } from './ai/summary-service';
import { ContentItem } from './types';
import { config } from './config/config';
import { sendDiscordReport } from './notifier/discord';
import fs from 'fs/promises';
import path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns ISO date string YYYY-MM-DD in UTC. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns "week-YYYY-WW" for the ISO week that contains `date`. */
function isoWeekLabel(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
  const year = new Date(firstThursday).getFullYear();
  return `week-${year}-${String(week).padStart(2, '0')}`;
}

/** Build the public GitHub URL for a report file (used in Discord embed). */
function buildReportUrl(filename: string): string {
  const repo = process.env.GITHUB_REPOSITORY ?? 'your-org/your-repo';
  const branch = process.env.GITHUB_REF_NAME ?? 'main';
  return `https://github.com/${repo}/blob/${branch}/reports/${filename}`;
}

// ─── Idempotency guard ────────────────────────────────────────────────────────

/** Returns true if a report file for `reportFilename` already exists on disk. */
async function reportAlreadyExists(reportsDir: string, reportFilename: string): Promise<boolean> {
  try {
    await fs.access(path.join(reportsDir, reportFilename));
    return true;
  } catch {
    return false;
  }
}

// ─── Report generation ────────────────────────────────────────────────────────

async function buildReportMarkdown(
  items: ContentItem[],
  summaryService: SummaryService,
  weekLabel: string
): Promise<{ markdown: string; topics: string[] }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentItems = items.filter(i => new Date(i.createdAt) >= sevenDaysAgo);
  const itemsToProcess = recentItems.length > 0 ? recentItems : items;

  const top = (source: string) =>
    itemsToProcess
      .filter(i => i.source === source)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

  const githubItems = top('github');
  const hnItems = top('hackernews');
  const redditItems = top('reddit');

  console.log('[Pipeline] Generating AI trend summary…');
  const aiSummary = await summaryService.summarizeDailyContent(itemsToProcess);

  console.log('[Pipeline] Extracting topics…');
  let topics: string[] = [];
  try {
    topics = await summaryService.extractTopics(itemsToProcess);
  } catch (err) {
    console.warn('[Pipeline] Topic extraction failed, continuing without topics:', err);
  }

  const displayWeek = weekLabel.replace('week-', '');
  let md = `# Weekly Technology Intelligence Report (${displayWeek})\n\n`;
  md += `Generated: ${new Date().toUTCString()}\n\n`;

  md += `## 🏷️ Key Topics & Tags\n\n`;
  md += topics.length > 0 ? topics.map(t => `\`${t}\``).join('  ') + '\n\n' : '_No tags identified._\n\n';

  md += `## 🤖 AI Trend Analysis\n\n${aiSummary}\n\n`;

  md += `## 🌟 Top GitHub Trending Repositories\n\n`;
  if (githubItems.length > 0) {
    githubItems.forEach((item, i) => {
      const desc = item.metadata.description ?? 'No description';
      const lang = item.metadata.language ? ` [${item.metadata.language}]` : '';
      md += `${i + 1}. **[${item.title}](${item.url})** — ${desc}${lang} _(${item.score} stars)_\n`;
    });
    md += '\n';
  } else {
    md += '_No GitHub items found._\n\n';
  }

  md += `## 📰 Top Hacker News Stories\n\n`;
  if (hnItems.length > 0) {
    hnItems.forEach((item, i) => {
      const hnUrl = item.metadata.hnUrl ?? item.url;
      md += `${i + 1}. **[${item.title}](${item.url})** _(${item.score} pts)_ — [HN](${hnUrl})\n`;
    });
    md += '\n';
  } else {
    md += '_No Hacker News items found._\n\n';
  }

  md += `## 💬 Top Reddit Discussions\n\n`;
  if (redditItems.length > 0) {
    redditItems.forEach((item, i) => {
      const sub = item.metadata.subreddit ? `r/${item.metadata.subreddit}` : 'Reddit';
      const comments = item.metadata.permalink ?? item.url;
      md += `${i + 1}. **[${item.title}](${item.url})** (${sub}) _(${item.score} upvotes)_ — [Comments](${comments})\n`;
    });
    md += '\n';
  } else {
    md += '_No Reddit items found._\n\n';
  }

  return { markdown: md, topics };
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  Tech Intelligence Pipeline — GitHub Actions Mode');
  console.log(`  ${new Date().toUTCString()}`);
  console.log('='.repeat(60));

  const storage = new FileStorage();
  await storage.initialize();

  const today = todayUTC();
  const weekLabel = isoWeekLabel(new Date());

  // Use date-stamped daily report filename for daily runs:  2026-06-11.md
  const reportFilename = `${today}.md`;
  const reportsDir = path.resolve(config.reportsDir);

  // ── Idempotency check ──
  if (await reportAlreadyExists(reportsDir, reportFilename)) {
    console.log(`[Pipeline] Report "${reportFilename}" already exists — skipping generation.`);

    await sendDiscordReport(config.discordWebhookUrl, {
      weekLabel,
      topics: [],
      githubCount: 0,
      hnCount: 0,
      redditCount: 0,
      reportUrl: buildReportUrl(reportFilename),
      skipped: true,
    });

    console.log('[Pipeline] Done (skipped).');
    return;
  }

  // ── Crawl ──
  console.log('\n[Pipeline] Starting crawlers…');
  const githubCrawler = new GitHubCrawler();
  const hnCrawler = new HackerNewsCrawler();
  const redditCrawler = new RedditCrawler();

  const [githubItems, hnItems, redditItems] = await Promise.allSettled([
    githubCrawler.crawl(),
    hnCrawler.crawl(),
    redditCrawler.crawl(),
  ]).then(results =>
    results.map((r, i) => {
      const labels = ['GitHub', 'HackerNews', 'Reddit'];
      if (r.status === 'fulfilled') {
        console.log(`  ✓ ${labels[i]}: ${r.value.length} items`);
        return r.value;
      } else {
        console.error(`  ✗ ${labels[i]} crawler failed:`, r.reason);
        return [] as ContentItem[];
      }
    })
  );

  // ── Save individual source files ──
  await storage.saveItems('github', githubItems);
  await storage.saveItems('hackernews', hnItems);
  await storage.saveItems('reddit', redditItems);

  // ── Merge & deduplicate (by id) ──
  const existing = await storage.getCombined();
  const itemMap = new Map<string, ContentItem>();
  existing.forEach(i => itemMap.set(i.id, i));
  [...githubItems, ...hnItems, ...redditItems].forEach(i => itemMap.set(i.id, i));
  const combined = Array.from(itemMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  await storage.saveCombined(combined);
  console.log(`\n[Pipeline] Combined: ${combined.length} unique items (${existing.length} existing + new).`);

  if (combined.length === 0) {
    console.warn('[Pipeline] No items collected. Aborting report generation.');
    process.exit(1);
  }

  // ── Generate report ──
  const geminiProvider = new GeminiProvider();
  const summaryService = new SummaryService(geminiProvider);

  let markdown: string;
  let topics: string[];

  try {
    ({ markdown, topics } = await buildReportMarkdown(combined, summaryService, weekLabel));
  } catch (err) {
    console.error('[Pipeline] Report generation failed:', err);
    process.exit(1);
  }

  // ── Save report ──
  await storage.saveReport(reportFilename, markdown);
  console.log(`\n[Pipeline] Report saved → reports/${reportFilename}`);

  // ── Discord notification ──
  await sendDiscordReport(config.discordWebhookUrl, {
    weekLabel,
    topics,
    githubCount: githubItems.length,
    hnCount: hnItems.length,
    redditCount: redditItems.length,
    reportUrl: buildReportUrl(reportFilename),
    skipped: false,
  });

  console.log('\n[Pipeline] ✅ All done.\n');
}

main().catch(err => {
  console.error('[Pipeline] Fatal error:', err);
  process.exit(1);
});
