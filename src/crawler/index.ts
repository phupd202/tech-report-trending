import { ContentItem } from '../types';

export interface Crawler {
  crawl(): Promise<ContentItem[]>;
}

export { GitHubCrawler } from './github';
export { HackerNewsCrawler } from './hackernews';
export { RedditCrawler } from './reddit';
