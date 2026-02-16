/**
 * Worker Manager
 * Manages all background workers
 * Requirements: 10.4
 */

import { startCVAnalysisWorker, stopCVAnalysisWorker } from './cvAnalysis.worker';
import { startEmailWorker, stopEmailWorker } from './email.worker';
import { isQueueConfigured } from '../config/queue';

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  if (!isQueueConfigured()) {
    console.log('⚠️  Workers not started - Queue system not configured');
    console.log('   Set REDIS_URL in .env to enable background processing');
    return;
  }

  console.log('🚀 Starting background workers...');

  // Start CV Analysis worker
  startCVAnalysisWorker();

  // Start Email worker
  startEmailWorker();

  console.log('✅ All workers started successfully');
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  console.log('🛑 Stopping background workers...');

  await Promise.all([stopCVAnalysisWorker(), stopEmailWorker()]);

  console.log('✅ All workers stopped');
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received - stopping workers');
  await stopWorkers();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received - stopping workers');
  await stopWorkers();
});
