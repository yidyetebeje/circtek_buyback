export enum Priority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface RateLimitConfig {
  global: BucketConfig;
  catalog: BucketConfig;
  competitor: BucketConfig;
  care: BucketConfig;
}

export interface BucketConfig {
  intervalMs: number;
  maxRequests: number;
}

export interface RateLimitLog {
  endpoint: string;
  priority: number;
  status: 'QUEUED' | 'EXECUTED' | '429_HIT' | 'ERROR';
  responseStatus?: number;
  timestamp: Date;
  duration?: number;
}
