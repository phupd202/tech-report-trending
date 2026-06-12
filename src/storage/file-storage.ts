import fs from 'fs/promises';
import path from 'path';
import { ContentItem } from '../types';
import { config } from '../config/config';

export class FileStorage {
  private dataDir: string;
  private reportsDir: string;

  constructor(dataDir?: string, reportsDir?: string) {
    this.dataDir = dataDir ? path.resolve(dataDir) : path.resolve(config.dataDir);
    this.reportsDir = reportsDir ? path.resolve(reportsDir) : path.resolve(config.reportsDir);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  private getFilePath(source: string): string {
    return path.join(this.dataDir, `${source}.json`);
  }

  async saveItems(source: string, items: ContentItem[]): Promise<void> {
    await this.initialize();
    const filePath = this.getFilePath(source);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  async getItems(source: string): Promise<ContentItem[]> {
    await this.initialize();
    const filePath = this.getFilePath(source);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as ContentItem[];
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async saveCombined(items: ContentItem[]): Promise<void> {
    await this.saveItems('combined', items);
  }

  async getCombined(): Promise<ContentItem[]> {
    return this.getItems('combined');
  }

  async saveReport(filename: string, content: string): Promise<void> {
    await this.initialize();
    const filePath = path.join(this.reportsDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async getLatestReport(): Promise<{ filename: string; content: string } | null> {
    await this.initialize();
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files
        .filter(f => f.startsWith('week-') && f.endsWith('.md'))
        .sort()
        .reverse(); // Newest first

      if (reportFiles.length === 0) {
        return null;
      }

      const latestFile = reportFiles[0];
      const filePath = path.join(this.reportsDir, latestFile);
      const content = await fs.readFile(filePath, 'utf-8');
      return { filename: latestFile, content };
    } catch (error) {
      return null;
    }
  }

  async getReportsList(): Promise<string[]> {
    await this.initialize();
    try {
      const files = await fs.readdir(this.reportsDir);
      return files.filter(f => f.startsWith('week-') && f.endsWith('.md')).sort().reverse();
    } catch (error) {
      return [];
    }
  }

  async getReport(filename: string): Promise<string | null> {
    await this.initialize();
    try {
      const filePath = path.join(this.reportsDir, filename);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }
}
export default FileStorage;
