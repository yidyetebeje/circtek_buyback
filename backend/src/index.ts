import { buildApp } from './app'
import { schedulerService } from './buyback/services/SchedulerService';

const app = buildApp().listen(3020);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Start Scheduler
schedulerService.start();

