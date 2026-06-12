import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { FileStorage } from './file-storage';
import { ContentItem } from '../types';

describe('FileStorage', () => {
  const testDataDir = path.resolve('./data-test');
  const testReportsDir = path.resolve('./reports-test');
  let storage: FileStorage;

  beforeEach(async () => {
    storage = new FileStorage(testDataDir, testReportsDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up test directories
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.rm(testReportsDir, { recursive: true, force: true });
  });

  test('should initialize and create directories', async () => {
    expect(await fs.stat(testDataDir)).toBeDefined();
    expect(await fs.stat(testReportsDir)).toBeDefined();
  });

  test('should save and get items', async () => {
    const mockItem: ContentItem = {
      id: 'test-1',
      source: 'github',
      title: 'Test Title',
      url: 'https://test.com',
      score: 100,
      metadata: { description: 'test description' },
      createdAt: new Date().toISOString(),
    };

    await storage.saveItems('test-source', [mockItem]);
    const items = await storage.getItems('test-source');
    
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('test-1');
    expect(items[0].title).toBe('Test Title');
  });

  test('should handle missing files by returning empty array', async () => {
    const items = await storage.getItems('non-existent');
    expect(items).toEqual([]);
  });

  test('should save and retrieve weekly reports', async () => {
    const reportContent = '# Week Report\nThis is a test report.';
    await storage.saveReport('week-2026-99.md', reportContent);

    const latest = await storage.getLatestReport();
    expect(latest).not.toBeNull();
    expect(latest?.filename).toBe('week-2026-99.md');
    expect(latest?.content).toBe(reportContent);
  });
});
