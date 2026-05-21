import PQueue from 'p-queue';

const CONCURRENCY = parseInt(process.env.CONCURRENCY_LIMIT || '3', 10);

export class JobQueue {
  private queue: PQueue;

  constructor() {
    this.queue = new PQueue({
      concurrency: CONCURRENCY,
      autoStart: true,
    });
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return await this.queue.add(fn) as T;
  }

  get size(): number {
    return this.queue.size;
  }

  get pending(): number {
    return this.queue.pending;
  }

  pause(): void {
    this.queue.pause();
  }

  start(): void {
    this.queue.start();
  }

  clear(): void {
    this.queue.clear();
  }
}

export const jobQueue = new JobQueue();
