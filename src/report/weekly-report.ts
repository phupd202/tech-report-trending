import { FileStorage } from '../storage/file-storage';
import { SummaryService } from '../ai/summary-service';
import { ContentItem } from '../types';

export class WeeklyReportGenerator {
  constructor(
    private storage: FileStorage,
    private summaryService: SummaryService
  ) {}

  private getISOWeekString(date: Date): string {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = target.getFullYear();
    const paddedWeek = String(weekNumber).padStart(2, '0');
    return `week-${year}-${paddedWeek}`;
  }

  async generateWeeklyReport(): Promise<string> {
    // Load combined items
    const items = await this.storage.getCombined();
    if (items.length === 0) {
      throw new Error('No items in storage. Please run crawlers first.');
    }

    // Filter items from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyItems = items.filter(item => new Date(item.createdAt) >= sevenDaysAgo);

    if (weeklyItems.length === 0) {
      console.warn('No items found in the last 7 days. Using all items.');
    }

    const itemsToProcess = weeklyItems.length > 0 ? weeklyItems : items;

    // Filter by source and sort by score
    const githubItems = itemsToProcess
      .filter(item => item.source === 'github')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const hnItems = itemsToProcess
      .filter(item => item.source === 'hackernews')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const redditItems = itemsToProcess
      .filter(item => item.source === 'reddit')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Call Gemini to generate AI summary and extract topics
    console.log('Generating AI trend summary for the weekly report...');
    const aiSummary = await this.summaryService.summarizeDailyContent(itemsToProcess);
    
    console.log('Extracting topics...');
    const topics = await this.summaryService.extractTopics(itemsToProcess);

    const weekStr = this.getISOWeekString(new Date());
    const reportTitle = `Weekly Technology Intelligence Report (${weekStr.replace('week-', '')})`;

    let reportMarkdown = `# ${reportTitle}\n\n`;
    reportMarkdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    // 1. Key Topics
    reportMarkdown += `## 🏷️ Key Topics & Tags This Week\n\n`;
    if (topics.length > 0) {
      reportMarkdown += topics.map(t => `\`${t}\``).join('  ') + `\n\n`;
    } else {
      reportMarkdown += `No tags identified.\n\n`;
    }

    // 2. AI Trend Summary
    reportMarkdown += `## 🤖 AI Trend Analysis\n\n`;
    reportMarkdown += `${aiSummary}\n\n`;

    // 3. Top GitHub Repositories
    reportMarkdown += `## 🌟 Top GitHub Trending Repositories\n\n`;
    if (githubItems.length > 0) {
      githubItems.forEach((item, index) => {
        const desc = item.metadata.description || 'No description';
        const lang = item.metadata.language ? ` [${item.metadata.language}]` : '';
        reportMarkdown += `${index + 1}. **[${item.title}](${item.url})** - ${desc}${lang} (${item.score} stars)\n`;
      });
      reportMarkdown += `\n`;
    } else {
      reportMarkdown += `No GitHub items found.\n\n`;
    }

    // 4. Top Discussions (Hacker News)
    reportMarkdown += `## 📰 Top Hacker News Stories\n\n`;
    if (hnItems.length > 0) {
      hnItems.forEach((item, index) => {
        reportMarkdown += `${index + 1}. **[${item.title}](${item.url})** (${item.score} points) - [HN Link](${item.metadata.hnUrl || item.url})\n`;
      });
      reportMarkdown += `\n`;
    } else {
      reportMarkdown += `No Hacker News items found.\n\n`;
    }

    // 5. Top Discussions (Reddit)
    reportMarkdown += `## 💬 Top Reddit Discussions\n\n`;
    if (redditItems.length > 0) {
      redditItems.forEach((item, index) => {
        reportMarkdown += `${index + 1}. **[${item.title}](${item.url})** (r/${item.metadata.subreddit}) (${item.score} upvotes) - [Comments](${item.metadata.permalink || item.url})\n`;
      });
      reportMarkdown += `\n`;
    } else {
      reportMarkdown += `No Reddit items found.\n\n`;
    }

    // Save report to disk
    const filename = `${weekStr}.md`;
    await this.storage.saveReport(filename, reportMarkdown);
    console.log(`Weekly report saved as ${filename}`);

    return reportMarkdown;
  }
}
export default WeeklyReportGenerator;
