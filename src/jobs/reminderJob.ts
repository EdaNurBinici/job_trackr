import { ReminderService } from '../services/reminder.service';
export class ReminderJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  start(intervalMinutes: number = 60): void {
    if (this.intervalId) {
      console.log('Reminder job is already running');
      return;
    }
    console.log(`Starting reminder job (checking every ${intervalMinutes} minutes)`);
    this.runJob();
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMinutes * 60 * 1000);
  }
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Reminder job stopped');
    }
  }
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
  async runManually(): Promise<number> {
    console.log('Running reminder job manually...');
    const count = await ReminderService.processDueReminders();
    console.log(`Manual run completed. Processed ${count} reminders.`);
    return count;
  }
}
export const reminderJob = new ReminderJob();
