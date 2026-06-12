import { ContentItem, Crawler } from '../types';
import { config } from '../config/config';

export class HackerNewsCrawler implements Crawler {
  async crawl(): Promise<ContentItem[]> {
    try {
      // Fetch top stories
      const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if (!topStoriesRes.ok) {
        throw new Error(`Failed to fetch HN top stories: ${topStoriesRes.statusText}`);
      }

      const topIds = (await topStoriesRes.json()) as number[];
      // Limit to configured amount
      const targetIds = topIds.slice(0, config.hnTopStoriesCount);
      const items: ContentItem[] = [];

      // Fetch details in parallel
      const fetchPromises = targetIds.map(async (id) => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) return null;
          const item = (await itemRes.json()) as any;
          if (!item || item.type !== 'story') return null;

          return {
            id: `hackernews-${id}`,
            source: 'hackernews' as const,
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${id}`,
            score: item.score || 0,
            metadata: {
              author: item.by,
              commentsCount: item.descendants || 0,
              hnUrl: `https://news.ycombinator.com/item?id=${id}`,
            },
            createdAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
          };
        } catch (err) {
          console.error(`Error fetching HN item ${id}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      for (const res of results) {
        if (res) items.push(res);
      }

      return items;
    } catch (error) {
      console.error('Error crawling Hacker News:', error);
      return [];
    }
  }
}
export default HackerNewsCrawler;
