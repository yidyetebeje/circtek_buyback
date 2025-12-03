import { Priority } from './types';

export interface QueueItem<T> {
  item: T;
  priority: Priority;
  timestamp: number;
}

export class RequestQueue<T> {
  private queues: Map<Priority, QueueItem<T>[]>;

  constructor() {
    this.queues = new Map();
    this.queues.set(Priority.CRITICAL, []);
    this.queues.set(Priority.HIGH, []);
    this.queues.set(Priority.NORMAL, []);
    this.queues.set(Priority.LOW, []);
  }

  public enqueue(item: T, priority: Priority): void {
    const queueItem: QueueItem<T> = {
      item,
      priority,
      timestamp: Date.now(),
    };
    
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(queueItem);
    } else {
        // Fallback for unknown priority, treat as NORMAL
        this.queues.get(Priority.NORMAL)?.push(queueItem);
    }
  }

  public dequeue(): QueueItem<T> | undefined {
    // Check queues in order of priority
    if (this.queues.get(Priority.CRITICAL)?.length) return this.queues.get(Priority.CRITICAL)?.shift();
    if (this.queues.get(Priority.HIGH)?.length) return this.queues.get(Priority.HIGH)?.shift();
    if (this.queues.get(Priority.NORMAL)?.length) return this.queues.get(Priority.NORMAL)?.shift();
    if (this.queues.get(Priority.LOW)?.length) return this.queues.get(Priority.LOW)?.shift();
    
    return undefined;
  }

  public peek(): QueueItem<T> | undefined {
    if (this.queues.get(Priority.CRITICAL)?.length) return this.queues.get(Priority.CRITICAL)?.[0];
    if (this.queues.get(Priority.HIGH)?.length) return this.queues.get(Priority.HIGH)?.[0];
    if (this.queues.get(Priority.NORMAL)?.length) return this.queues.get(Priority.NORMAL)?.[0];
    if (this.queues.get(Priority.LOW)?.length) return this.queues.get(Priority.LOW)?.[0];
    
    return undefined;
  }

  public size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }
}
