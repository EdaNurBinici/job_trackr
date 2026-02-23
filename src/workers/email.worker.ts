import { Worker, Job } from 'bullmq';
import { emailQueue } from '../config/queue';
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  type: 'reminder' | 'notification' | 'welcome';
}
let worker: Worker | null = null;
export function startEmailWorker(): Worker | null {
  if (!emailQueue) {
    console.log('⚠️  Email worker not started - Queue not configured');
    return null;
  }
  worker = new Worker(
    'email',
    async (job: Job<EmailJobData>) => {
      console.log(`[Email Worker] Sending email to ${job.data.to}`);
      const { to, subject, body, type } = job.data;
      try {
        await job.updateProgress(50);
        await simulateEmailSending(to, subject, body);
        await job.updateProgress(100);
        console.log(`[Email Worker] Email sent: ${subject} to ${to}`);
        return {
          sent: true,
          to,
          subject,
          type,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`[Email Worker] Failed to send email:`, error);
        throw error;
      }
    },
    {
      connection: emailQueue.opts.connection!,
      concurrency: 5, // Process 5 emails at a time
    }
  );
  worker.on('completed', (job) => {
    console.log(`✅ [Email Worker] Email job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ [Email Worker] Job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err) => {
    console.error('[Email Worker] Worker error:', err);
  });
  console.log('✅ Email worker started (concurrency: 5)');
  return worker;
}
export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    console.log('✅ Email worker stopped');
  }
}
async function simulateEmailSending(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('📧 Email Details:');
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${body.substring(0, 50)}...`);
}
export default { start: startEmailWorker, stop: stopEmailWorker };
