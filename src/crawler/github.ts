import * as cheerio from 'cheerio';
import { ContentItem, Crawler } from '../types';
import { config } from '../config/config';

export class GitHubCrawler implements Crawler {
  async crawl(): Promise<ContentItem[]> {
    try {
      const response = await fetch(config.githubTrendingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch GitHub trending: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const items: ContentItem[] = [];

      $('article.Box-row').each((_, element) => {
        const titleAnchor = $(element).find('h2.h3 a');
        const href = titleAnchor.attr('href') || '';
        const repoPath = href.startsWith('/') ? href.substring(1) : href;
        const url = `https://github.com/${repoPath}`;

        // Clean title (removes newlines, extra spaces and formats as owner / repo)
        const titleText = titleAnchor.text().replace(/\s+/g, '').replace('/', ' / ');

        const description = $(element).find('p.col-9').text().trim();

        const language = $(element).find('[itemprop="programmingLanguage"]').text().trim();

        // Find stars
        let stars = 0;
        const starsAnchor = $(element).find(`a[href="${href}/stargazers"]`);
        if (starsAnchor.length) {
          const starsText = starsAnchor.text().trim().replace(/,/g, '');
          stars = parseInt(starsText, 10) || 0;
        }

        // Find stars today
        let starsToday = 0;
        const starsTodayText = $(element).find('span.d-inline-block.float-sm-right').text().trim();
        const starsTodayMatch = starsTodayText.replace(/,/g, '').match(/(\d+)\s+stars/);
        if (starsTodayMatch) {
          starsToday = parseInt(starsTodayMatch[1], 10);
        }

        const id = `github-${repoPath.replace('/', '-')}`;

        items.push({
          id,
          source: 'github',
          title: titleText,
          url,
          score: stars,
          metadata: {
            description,
            language,
            starsToday,
          },
          createdAt: new Date().toISOString(),
        });
      });

      return items;
    } catch (error) {
      console.error('Error crawling GitHub trending:', error);
      return [];
    }
  }
}
export default GitHubCrawler;
