export interface ContentItem {
  id: string;
  source: 'github' | 'hackernews' | 'reddit';
  title: string;
  url: string;
  score: number;
  metadata: Record<string, any>;
  createdAt: string; // ISO timestamp string
}

export interface Crawler {
  crawl(): Promise<ContentItem[]>;
}
