import { GitHubCrawler } from '../crawler/github';
import { HackerNewsCrawler } from '../crawler/hackernews';
import { RedditCrawler } from '../crawler/reddit';
import { FileStorage } from '../storage/file-storage';
import { WeeklyReportGenerator } from '../report/weekly-report';
import { ContentItem } from '../types';

export class DailyJob {
  constructor(
    private storage: FileStorage,
    private githubCrawler: GitHubCrawler,
    private hnCrawler: HackerNewsCrawler,
    private redditCrawler: RedditCrawler,
    private reportGenerator: WeeklyReportGenerator
  ) {}

  async run(): Promise<{
    githubCount: number;
    hnCount: number;
    redditCount: number;
    combinedCount: number;
  }> {
    console.log(`[${new Date().toISOString()}] Starting Daily Crawl Job...`);

    // 1. Crawl all sources
    console.log('Crawling GitHub Trending...');
    const githubItems = await this.githubCrawler.crawl();

    console.log('Crawling Hacker News...');
    const hnItems = await this.hnCrawler.crawl();

    console.log('Crawling Reddit...');
    const redditItems = await this.redditCrawler.crawl();

    // 2. Save individual files
    await this.storage.saveItems('github', githubItems);
    await this.storage.saveItems('hackernews', hnItems);
    await this.storage.saveItems('reddit', redditItems);

    // 3. Load existing combined list and merge with new content
    // To prevent duplicate posts, we merge by unique id.
    const existingCombined = await this.storage.getCombined();
    
    // Create map of existing items
    const itemMap = new Map<string, ContentItem>();
    
    // Add existing ones first (to maintain older items)
    existingCombined.forEach(item => itemMap.set(item.id, item));
    
    // Overwrite/update with new ones
    githubItems.forEach(item => itemMap.set(item.id, item));
    hnItems.forEach(item => itemMap.set(item.id, item));
    redditItems.forEach(item => itemMap.set(item.id, item));

    const combinedItems = Array.from(itemMap.values());
    
    // Sort combined items by createdAt descending
    combinedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Save combined
    await this.storage.saveCombined(combinedItems);

    console.log(`Saved items. Counts: GitHub=${githubItems.length}, HN=${hnItems.length}, Reddit=${redditItems.length}`);
    console.log(`Total combined items: ${combinedItems.length}`);

    // 5. Generate report
    console.log('Generating latest weekly report...');
    try {
      await this.reportGenerator.generateWeeklyReport();
    } catch (error) {
      console.error('Error generating weekly report during daily job:', error);
    }

    console.log('Daily Crawl Job finished successfully!');
    return {
      githubCount: githubItems.length,
      hnCount: hnItems.length,
      redditCount: redditItems.length,
      combinedCount: combinedItems.length,
    };
  }
}
export default DailyJob;
