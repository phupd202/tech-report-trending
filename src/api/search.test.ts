import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { FileStorage } from '../storage/file-storage';
import { createApi } from './routes';
import { ContentItem } from '../types';

describe('Search Service via Hono API', () => {
  const testDataDir = path.resolve('./data-search-test');
  const testReportsDir = path.resolve('./reports-search-test');
  let storage: FileStorage;
  let api: any;

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
      title: 'Why I like Zig programming language',
      url: 'https://news.ycombinator.com/item?id=1',
      score: 120,
      metadata: { author: 'dev', commentsCount: 45 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'reddit-1',
      source: 'reddit',
      title: 'Rust vs Zig in 2026',
      url: 'https://reddit.com/r/programming/1',
      score: 450,
      metadata: { subreddit: 'programming', author: 'coder' },
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    storage = new FileStorage(testDataDir, testReportsDir);
    await storage.initialize();
    await storage.saveCombined(mockItems);

    // Dummy daily job not needed for search endpoint testing
    api = createApi(storage, {} as any);
  });

  afterEach(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.rm(testReportsDir, { recursive: true, force: true });
  });

  test('should search by title keyword', async () => {
    const res = await api.request('/search?q=Bun');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.items[0].title).toBe('Bun Runtime');
  });

  test('should search by language metadata', async () => {
    const res = await api.request('/search?q=Zig');
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should match Bun Runtime (Zig language) and Why I like Zig and Rust vs Zig
    expect(data.total).toBe(3);
  });

  test('should filter by source in search', async () => {
    const res = await api.request('/search?q=Zig&source=reddit');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.items[0].id).toBe('reddit-1');
  });
});
