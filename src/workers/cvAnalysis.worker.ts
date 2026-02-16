/**
 * CV Analysis Worker
 * Processes CV analysis jobs in the background
 * Requirements: 10.2, 11.1-11.4
 */

import { Worker, Job } from 'bullmq';
import { cvAnalysisQueue } from '../config/queue';
import { CVAnalysisService } from '../services/cvAnalysis.service';

interface CVAnalysisJobData {
  cvFileId: string;
  jobDescription: string;
  userId: string;
  jobUrl?: string;
}

let worker: Worker | null = null;

/**
 * Create and start CV Analysis worker
 */
export function startCVAnalysisWorker(): Worker | null {
  if (!cvAnalysisQueue) {
    console.log('⚠️  CV Analysis worker not started - Queue not configured');
    return null;
  }

  worker = new Worker(
    'cv-analysis',
    async (job: Job<CVAnalysisJobData>) => {
      console.log(`[Worker] Processing CV analysis job ${job.id}`);

      const { cvFileId, jobDescription, userId, jobUrl } = job.data;

      try {
        // Update progress: Starting
        await job.updateProgress(10);

        // Perform analysis
        const result = await CVAnalysisService.analyzeCV(
          cvFileId,
          jobDescription,
          userId,
          jobUrl
        );

        // Update progress: Complete
        await job.updateProgress(100);

        console.log(`[Worker] Job ${job.id} completed successfully`);

        return result;
      } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: cvAnalysisQueue.opts.connection!,
      concurrency: 2, // Process 2 jobs at a time
    }
  );

  // Event listeners
  worker.on('completed', (job) => {
    console.log(`✅ [Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log('✅ CV Analysis worker started (concurrency: 2)');

  return worker;
}

/**
 * Stop CV Analysis worker
 */
export async function stopCVAnalysisWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    console.log('✅ CV Analysis worker stopped');
  }
}

export default { start: startCVAnalysisWorker, stop: stopCVAnalysisWorker };
