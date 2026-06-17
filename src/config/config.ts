import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dataDir: process.env.DATA_DIR || './data',
  reportsDir: process.env.REPORTS_DIR || './reports',
  redditSubreddits: (process.env.REDDIT_SUBREDDITS || 'programming,devops,selfhosted')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  hnTopStoriesCount: parseInt(process.env.HN_TOP_STORIES_COUNT || '30', 10),
  githubTrendingUrl: process.env.GITHUB_TRENDING_URL || 'https://github.com/trending',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  // Discord integration (used by GitHub Actions pipeline)
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
};
