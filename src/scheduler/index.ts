import { DailyJob } from './daily-job';

export class JobScheduler {
  private timer: NodeJS.Timeout | null = null;

  constructor(private dailyJob: DailyJob) { }

  start(): void {
    if (this.timer) {
      console.warn('Scheduler is already running.');
      return;
    }

    console.log('Scheduler started.');
    console.log('Running first job immediately...');

    // Run immediately
    this.dailyJob.run().catch((error) => {
      console.error('Error in initial daily job:', error);
    });

    // Then run every 24 hours
    const intervalMs = 24 * 60 * 60 * 1000;

    this.timer = setInterval(async () => {
      try {
        console.log('Running scheduled daily job...');
        await this.dailyJob.run();
      } catch (error) {
        console.error('Error in scheduled daily job:', error);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('Scheduler stopped.');
    }
  }
}
export default JobScheduler;
