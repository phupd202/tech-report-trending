import { Hono } from 'hono';
import { FileStorage } from '../storage/file-storage';
import { DailyJob } from '../scheduler/daily-job';

export function createApi(storage: FileStorage, dailyJob: DailyJob) {
  const app = new Hono();

  // GET /health
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // GET /posts
  app.get('/posts', async (c) => {
    try {
      const source = c.req.query('source');
      const limitStr = c.req.query('limit');
      const offsetStr = c.req.query('offset');

      let items = await storage.getCombined();

      if (source) {
        items = items.filter(item => item.source === source);
      }

      const limit = limitStr ? parseInt(limitStr, 10) : 50;
      const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

      const paginatedItems = items.slice(offset, offset + limit);

      return c.json({
        total: items.length,
        limit,
        offset,
        items: paginatedItems,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /search (and GET /posts/search as alias)
  const searchHandler = async (c: any) => {
    try {
      const q = c.req.query('q');
      const source = c.req.query('source');

      if (!q) {
        return c.json({ error: 'Query parameter "q" is required' }, 400);
      }

      const query = q.toLowerCase();
      let items = await storage.getCombined();

      if (source) {
        items = items.filter(item => item.source === source);
      }

      const filteredItems = items.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const descMatch = (item.metadata.description || '').toLowerCase().includes(query);
        const langMatch = (item.metadata.language || '').toLowerCase().includes(query);
        return titleMatch || descMatch || langMatch;
      });

      return c.json({
        query: q,
        total: filteredItems.length,
        items: filteredItems,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  };

  app.get('/search', searchHandler);
  app.get('/posts/search', searchHandler);

  // GET /reports/latest
  app.get('/reports/latest', async (c) => {
    try {
      const latestReport = await storage.getLatestReport();
      if (!latestReport) {
        return c.json({ error: 'No reports found. Run the scheduler/crawlers first.' }, 404);
      }
      return c.json({
        filename: latestReport.filename,
        content: latestReport.content,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /reports (List all reports)
  app.get('/reports', async (c) => {
    try {
      const reports = await storage.getReportsList();
      return c.json({ reports });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /reports/:filename (Fetch specific report)
  app.get('/reports/:filename', async (c) => {
    const filename = c.req.param('filename');
    try {
      const content = await storage.getReport(filename);
      if (!content) {
        return c.json({ error: `Report ${filename} not found` }, 404);
      }
      return c.json({ filename, content });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /jobs/run (Manually trigger crawling and report generation)
  app.post('/jobs/run', async (c) => {
    try {
      const result = await dailyJob.run();
      return c.json({
        status: 'success',
        message: 'Crawl job executed successfully',
        result,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  return app;
}
