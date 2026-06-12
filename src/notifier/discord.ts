/**
 * Discord Webhook Notifier
 *
 * Sends pipeline results to a Discord channel via webhook.
 * - Uses rich embeds for structured output
 * - Retries up to 2 times on transient failures
 * - Never throws — failures are logged and swallowed so the pipeline continues
 */

export interface DiscordReportPayload {
  weekLabel: string;       // e.g. "2026-24"
  topics: string[];        // top extracted topics
  githubCount: number;
  hnCount: number;
  redditCount: number;
  reportUrl: string;       // GitHub raw/blob URL to the saved .md file
  skipped: boolean;        // true when report already existed (idempotency)
}

const DISCORD_COLOR_SUCCESS = 0x58b9ff;  // blue
const DISCORD_COLOR_SKIPPED = 0x8e9297;  // grey

async function sendWithRetry(
  webhookUrl: string,
  body: object,
  retries = 2
): Promise<void> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) return;

      const text = await res.text().catch(() => res.statusText);
      console.warn(`[Discord] Attempt ${attempt} failed: HTTP ${res.status} — ${text}`);

      if (res.status === 429) {
        // Rate limited: back off before retrying
        const retryAfter = Number(res.headers.get('retry-after') ?? 5) * 1000;
        await new Promise(r => setTimeout(r, retryAfter));
      }
    } catch (err) {
      console.warn(`[Discord] Attempt ${attempt} network error:`, err);
    }

    if (attempt <= retries) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  console.error('[Discord] All retry attempts exhausted. Notification was not delivered.');
}

export async function sendDiscordReport(
  webhookUrl: string,
  payload: DiscordReportPayload
): Promise<void> {
  if (!webhookUrl) {
    console.log('[Discord] DISCORD_WEBHOOK_URL not set — skipping notification.');
    return;
  }

  const { weekLabel, topics, githubCount, hnCount, redditCount, reportUrl, skipped } = payload;

  const topicsText = topics.length > 0
    ? topics.map(t => `\`${t}\``).join('  ')
    : '_No topics extracted_';

  const embed = skipped
    ? {
        title: '⏭️ Daily Tech Report — Already Up to Date',
        description: `Report for week **${weekLabel}** already exists. No new report generated.`,
        color: DISCORD_COLOR_SKIPPED,
        timestamp: new Date().toISOString(),
        footer: { text: 'Tech Intelligence Bot' },
      }
    : {
        title: '🔥 Daily Tech Intelligence Report',
        description: `Week **${weekLabel}** — AI-powered summary of today's top trends.`,
        color: DISCORD_COLOR_SUCCESS,
        fields: [
          {
            name: '🏷️ Key Topics',
            value: topicsText,
            inline: false,
          },
          {
            name: '📦 Items Collected',
            value: [
              `• GitHub: **${githubCount}** repos`,
              `• Hacker News: **${hnCount}** stories`,
              `• Reddit: **${redditCount}** posts`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '📄 Full Report',
            value: `[View on GitHub](${reportUrl})`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Tech Intelligence Bot • github-actions[bot]' },
      };

  const body = { embeds: [embed] };

  try {
    await sendWithRetry(webhookUrl, body);
    console.log('[Discord] Notification sent successfully.');
  } catch (err) {
    // Should never reach here due to internal retry logic, but guard anyway
    console.error('[Discord] Unexpected error sending notification:', err);
  }
}
