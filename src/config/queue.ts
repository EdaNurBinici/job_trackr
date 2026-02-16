/**
 * Queue Configuration
 * BullMQ + Redis setup for background job processing
 * Requirements: 10.1-10.4
 */

import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

/**
 * Check if queue system is configured
 */
export function isQueueConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

/**
 * Create Redis connection
 */
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

// Create Redis connection
const connection = createRedisConnection();

/**
 * Default job options
 */
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

/**
 * CV Analysis Queue
 * Handles background CV analysis jobs
 */
export const cvAnalysisQueue = connection
  ? new Queue('cv-analysis', {
      connection: connection as any,
      defaultJobOptions,
    })
  : null;

/**
 * Email Queue
 * Handles background email sending jobs
 */
export const emailQueue = connection
  ? new Queue('email', {
      connection: connection as any,
      defaultJobOptions,
    })
  : null;

/**
 * Graceful shutdown
 */
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
