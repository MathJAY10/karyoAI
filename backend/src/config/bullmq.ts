import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const INGESTION_QUEUE_NAME = 'document-ingestion';

export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
