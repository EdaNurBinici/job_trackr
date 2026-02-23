import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
export function isQueueConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
function createRedisConnection(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }
  try {
    const connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    connection.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    return connection;
  } catch (error) {
    console.error('Failed to create Redis connection:', error);
    return null;
  }
}
const connection = createRedisConnection();
const defaultJobOptions: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 50,
    age: 7 * 24 * 3600, // 7 days
  },
};
export const cvAnalysisQueue = connection
  ? new Queue('cv-analysis', {
      connection: connection as any,
      defaultJobOptions,
    })
  : null;
export const emailQueue = connection
  ? new Queue('email', {
      connection: connection as any,
      defaultJobOptions,
    })
  : null;
export async function closeQueues(): Promise<void> {
  if (cvAnalysisQueue) {
    await cvAnalysisQueue.close();
  }
  if (emailQueue) {
    await emailQueue.close();
  }
  if (connection) {
    await connection.quit();
  }
  console.log('✅ Queues closed');
}
