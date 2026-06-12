import { createApi } from './api/routes';
import { FileStorage } from './storage/file-storage';
import { GitHubCrawler } from './crawler/github';
import { HackerNewsCrawler } from './crawler/hackernews';
import { RedditCrawler } from './crawler/reddit';
import { GeminiProvider } from './ai/gemini-provider';
import { SummaryService } from './ai/summary-service';
import { WeeklyReportGenerator } from './report/weekly-report';
import { DailyJob } from './scheduler/daily-job';
import { JobScheduler } from './scheduler';
import { config } from './config/config';

async function main() {
  console.log('Initializing Personal Technology Intelligence System...');

  // 1. Initialize storage and services
  const storage = new FileStorage();
  await storage.initialize();

  const githubCrawler = new GitHubCrawler();
  const hnCrawler = new HackerNewsCrawler();
  const redditCrawler = new RedditCrawler();

  const geminiProvider = new GeminiProvider();
  const summaryService = new SummaryService(geminiProvider);
  const reportGenerator = new WeeklyReportGenerator(storage, summaryService);

  const dailyJob = new DailyJob(
    storage,
    githubCrawler,
    hnCrawler,
    redditCrawler,
    reportGenerator
  );

  const scheduler = new JobScheduler(dailyJob);

  // 2. Start Hono server
  const api = createApi(storage, dailyJob);

  // Use Bun.serve to host the Hono app
  const server = Bun.serve({
    port: config.port,
    fetch: api.fetch,
  });

  console.log(`Server is running at http://localhost:${server.port}`);

  // 3. Start background scheduler
  scheduler.start();

  // 4. Initial Run Check
  // If storage combined.json does not exist or is empty, run initial crawl in the background
  try {
    const existingItems = await storage.getCombined();
    if (existingItems.length === 0) {
      console.log('No existing items found. Performing initial crawl in the background...');
      dailyJob.run().catch(error => {
        console.error('Error during initial background run:', error);
      });
    }
  } catch (error) {
    console.error('Error during initial run check:', error);
  }
}

main().catch(error => {
  console.error('Fatal initialization error:', error);
  process.exit(1);
});
