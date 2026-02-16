/**
 * Reminder Job
 * Scheduled job that checks and sends due reminders
 * Requirements: 15.2, 15.3, 15.4
 */

import { ReminderService } from '../services/reminder.service';

export class ReminderJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the reminder job
   * Runs every hour by default
   */
  start(intervalMinutes: number = 60): void {
    if (this.intervalId) {
      console.log('Reminder job is already running');
      return;
    }

    console.log(`Starting reminder job (checking every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runJob();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the reminder job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Reminder job stopped');
    }
  }

  /**
   * Run the job once
   */
  private async runJob(): Promise<void> {
    if (this.isRunning) {
      console.log('Reminder job is already running, skipping this iteration');
      return;
    }

    this.isRunning = true;

    try {
      console.log(`[${new Date().toISOString()}] Running reminder job...`);
      const count = await ReminderService.processDueReminders();
      console.log(`[${new Date().toISOString()}] Reminder job completed. Processed ${count} reminders.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Reminder job failed:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run the job manually (for testing)
   */
  async runManually(): Promise<number> {
    console.log('Running reminder job manually...');
    const count = await ReminderService.processDueReminders();
    console.log(`Manual run completed. Processed ${count} reminders.`);
    return count;
  }
}

// Export singleton instance
export const reminderJob = new ReminderJob();
