import { ContentItem, Crawler } from '../types';
import { config } from '../config/config';

export class RedditCrawler implements Crawler {
  async crawl(): Promise<ContentItem[]> {
    const subreddits = config.redditSubreddits;
    const items: ContentItem[] = [];

    for (const subreddit of subreddits) {
      try {
        // Fetch hot posts from subreddit
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`;
        const response = await fetch(url, {
          headers: {
            // Use a real browser User-Agent to avoid getting blocked by Reddit's anti-bot systems
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch Reddit r/${subreddit}: ${response.statusText}`);
          continue;
        }

        const data = (await response.json()) as any;
        const children = data?.data?.children || [];

        for (const child of children) {
          const post = child.data;
          // Ignore stickied posts
          if (post.stickied) continue;

          items.push({
            id: `reddit-${subreddit}-${post.id}`,
            source: 'reddit',
            title: post.title,
            url: post.url.startsWith('/') ? `https://www.reddit.com${post.url}` : post.url,
            score: post.score || 0,
            metadata: {
              subreddit: post.subreddit,
              author: post.author,
              commentsCount: post.num_comments || 0,
              permalink: `https://www.reddit.com${post.permalink}`,
            },
            createdAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error crawling Reddit r/${subreddit}:`, error);
      }
    }

    return items;
  }
}
export default RedditCrawler;
