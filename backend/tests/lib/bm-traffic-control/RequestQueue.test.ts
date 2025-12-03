import { describe, it, expect, beforeEach } from 'bun:test';
import { RequestQueue } from '../../../src/lib/bm-traffic-control/RequestQueue';
import { Priority } from '../../../src/lib/bm-traffic-control/types';

describe('RequestQueue', () => {
  let queue: RequestQueue<string>;

  beforeEach(() => {
    queue = new RequestQueue<string>();
  });

  it('should enqueue and dequeue items', () => {
    queue.enqueue('item1', Priority.NORMAL);
    expect(queue.dequeue()?.item).toBe('item1');
  });

  it('should return undefined when empty', () => {
    expect(queue.dequeue()).toBeUndefined();
  });

  it('should respect priority order', () => {
    queue.enqueue('normal', Priority.NORMAL);
    queue.enqueue('low', Priority.LOW);
    queue.enqueue('critical', Priority.CRITICAL);
    queue.enqueue('high', Priority.HIGH);

    expect(queue.dequeue()?.item).toBe('critical');
    expect(queue.dequeue()?.item).toBe('high');
    expect(queue.dequeue()?.item).toBe('normal');
    expect(queue.dequeue()?.item).toBe('low');
  });

  it('should maintain FIFO order within same priority', () => {
    queue.enqueue('high1', Priority.HIGH);
    queue.enqueue('high2', Priority.HIGH);
    queue.enqueue('high3', Priority.HIGH);

    expect(queue.dequeue()?.item).toBe('high1');
    expect(queue.dequeue()?.item).toBe('high2');
    expect(queue.dequeue()?.item).toBe('high3');
  });

  it('should report size correctly', () => {
    expect(queue.size()).toBe(0);
    queue.enqueue('1', Priority.NORMAL);
    expect(queue.size()).toBe(1);
    queue.enqueue('2', Priority.NORMAL);
    expect(queue.size()).toBe(2);
    queue.dequeue();
    expect(queue.size()).toBe(1);
  });
  
  it('should peek at the next item without removing it', () => {
      queue.enqueue('item1', Priority.NORMAL);
      expect(queue.peek()?.item).toBe('item1');
      expect(queue.size()).toBe(1);
  });
});
