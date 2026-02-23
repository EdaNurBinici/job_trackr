import { startCVAnalysisWorker, stopCVAnalysisWorker } from './cvAnalysis.worker';
import { startEmailWorker, stopEmailWorker } from './email.worker';
import { isQueueConfigured } from '../config/queue';
export async function startWorkers(): Promise<void> {
  if (!isQueueConfigured()) {
    console.log('⚠️  Workers not started - Queue system not configured');
    console.log('   Set REDIS_URL in .env to enable background processing');
    return;
  }
  console.log('🚀 Starting background workers...');
  startCVAnalysisWorker();
  startEmailWorker();
  console.log('✅ All workers started successfully');
}
export async function stopWorkers(): Promise<void> {
  console.log('🛑 Stopping background workers...');
  await Promise.all([stopCVAnalysisWorker(), stopEmailWorker()]);
  console.log('✅ All workers stopped');
}
process.on('SIGTERM', async () => {
  console.log('SIGTERM received - stopping workers');
  await stopWorkers();
});
process.on('SIGINT', async () => {
  console.log('SIGINT received - stopping workers');
  await stopWorkers();
});
