import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { FileStorage } from '../storage/file-storage';
import { WeeklyReportGenerator } from './weekly-report';
import { SummaryService } from '../ai/summary-service';
import { GeminiProvider } from '../ai/gemini-provider';
import { ContentItem } from '../types';

describe('Report Generator', () => {
  const testDataDir = path.resolve('./data-report-test');
  const testReportsDir = path.resolve('./reports-report-test');
  let storage: FileStorage;
  let summaryService: SummaryService;
  let reportGenerator: WeeklyReportGenerator;

  const mockItems: ContentItem[] = [
    {
      id: 'github-1',
      source: 'github',
      title: 'Bun Runtime',
      url: 'https://github.com/oven-sh/bun',
      score: 50000,
      metadata: { description: 'Incredibly fast JavaScript runtime', language: 'Zig' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'hn-1',
      source: 'hackernews',
      title: 'HN Story',
      url: 'https://news.ycombinator.com/item?id=1',
      score: 120,
      metadata: { author: 'dev', commentsCount: 45, hnUrl: 'https://news.ycombinator.com/item?id=1' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'reddit-1',
      source: 'reddit',
      title: 'Reddit Post',
      url: 'https://reddit.com/r/programming/1',
      score: 450,
      metadata: { subreddit: 'programming', author: 'coder', permalink: 'https://reddit.com/r/programming/1' },
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    storage = new FileStorage(testDataDir, testReportsDir);
    await storage.initialize();
    await storage.saveCombined(mockItems);

    // Use provider that returns mock texts without calling remote API
    const dummyProvider = new GeminiProvider();
    summaryService = new SummaryService(dummyProvider);
    reportGenerator = new WeeklyReportGenerator(storage, summaryService);
  });

  afterEach(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.rm(testReportsDir, { recursive: true, force: true });
  });

  test('should generate markdown report successfully', async () => {
    const reportMarkdown = await reportGenerator.generateWeeklyReport();
    
    expect(reportMarkdown).toContain('Weekly Technology Intelligence Report');
    expect(reportMarkdown).toContain('Top GitHub Trending Repositories');
    expect(reportMarkdown).toContain('Top Hacker News Stories');
    expect(reportMarkdown).toContain('Top Reddit Discussions');
    expect(reportMarkdown).toContain('Bun Runtime');
    expect(reportMarkdown).toContain('HN Story');
    expect(reportMarkdown).toContain('Reddit Post');

    // Check if file is written
    const reports = await storage.getReportsList();
    expect(reports.length).toBe(1);
    expect(reports[0]).toMatch(/^week-\d{4}-\d{2}\.md$/);
  });
});
