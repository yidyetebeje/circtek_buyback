# Back Market Integration - Implementation Plan (TDD)

This document outlines the step-by-step implementation plan for the `bm-traffic-control` package and its integration into the Circtek backend. We will follow a Test-Driven Development (TDD) approach using `bun test`.

## Phase 0: Setup

- [x] Create directory structure: `backend/src/lib/bm-traffic-control`
- [x] Create placeholder files: `index.ts`, `types.ts`

## Phase 1: TokenBucket (The Core Logic)

The `TokenBucket` is responsible for tracking available tokens and handling reservations.

### Task 1.1: TokenBucket Basic Operations
- [x] **Write Test**: Create `tests/lib/bm-traffic-control/TokenBucket.test.ts`.
    - Test `canSpend()` returns true when full.
    - Test `spend()` decreases tokens.
    - Test `spend()` returns false when empty.
    - Test `refill()` restores tokens after interval.
- [x] **Implement**: Create `src/lib/bm-traffic-control/TokenBucket.ts`.
    - Implement `constructor`, `spend`, `refill`.
- [x] **Refactor**: Ensure code is clean and types are correct.

### Task 1.2: TokenBucket Reservation System
- [x] **Write Test**: Update `TokenBucket.test.ts`.
    - Test `canReserve()` checks against `tokens - reserved`.
    - Test `reserve()` increases `reservedTokens`.
    - Test `spendReserved()` consumes reserved tokens.
    - Test `releaseReservation()` frees reserved tokens.
- [x] **Implement**: Update `TokenBucket.ts` with reservation logic.
- [x] **Refactor**: Optimize refill logic if needed.

## Phase 2: RequestQueue (Priority Handling)

The `RequestQueue` manages pending requests based on priority.

### Task 2.1: Priority Queue Implementation
- [x] **Write Test**: Create `tests/lib/bm-traffic-control/RequestQueue.test.ts`.
    - Test enqueuing items with different priorities.
    - Test dequeuing returns items in priority order (CRITICAL -> HIGH -> NORMAL -> LOW).
    - Test FIFO behavior within the same priority.
- [x] **Implement**: Create `src/lib/bm-traffic-control/RequestQueue.ts`.
    - Define `QueueItem` interface.
    - Implement `enqueue` and `dequeue` methods.
- [x] **Refactor**: Ensure efficient queue operations.

## Phase 3: Configuration & Definitions

Define the rules for the traffic controller.

### Task 3.1: Route Definitions & Config
- [x] **Write Test**: Create `tests/lib/bm-traffic-control/config.test.ts`.
    - Test `loadRateLimitConfig` loads defaults or env vars.
    - Test regex patterns in `definitions.ts` match correct URLs (Catalog vs Competitor vs Global).
- [x] **Implement**: Create `src/lib/bm-traffic-control/definitions.ts` and `src/lib/bm-traffic-control/config.ts`.
    - Define `BucketType` enum.
    - Define `ROUTE_MAP`.
    - Implement `loadRateLimitConfig`.

## Phase 4: TrafficController (The Orchestrator)

The `TrafficController` ties everything together.

### Task 4.1: Controller Initialization & Bucket Management
- [x] **Write Test**: Create `tests/lib/bm-traffic-control/TrafficController.test.ts`.
    - Test controller initializes buckets based on config.
    - Test `getBucketForUrl` returns correct bucket.
- [x] **Implement**: Create `src/lib/bm-traffic-control/TrafficController.ts`.
    - Implement constructor and bucket initialization.

### Task 4.2: Request Scheduling & Execution
- [x] **Write Test**: Update `TrafficController.test.ts`.
    - Test `scheduleRequest` adds to queue.
    - Test `processQueue` executes request when tokens available.
    - Test `processQueue` waits when tokens unavailable (mock timers).
- [x] **Implement**: Update `TrafficController.ts`.
    - Implement `scheduleRequest`, `processQueue`, `executeRequest`.

### Task 4.3: Rate Limit Handling (429s)
- [x] **Write Test**: Update `TrafficController.test.ts`.
    - Test handling of 429 response (should pause bucket and retry).
- [x] **Implement**: Add 429 handling logic to `TrafficController.ts`.

## Phase 5: Database Logging

### Task 5.1: Schema & Logger
- [x] **Write Test**: Create `tests/lib/bm-traffic-control/logger.test.ts` (Integration test).
    - Test inserting a log entry into `rate_limit_logs`.
- [x] **Implement**:
    - Update `src/db/circtek.schema.ts` with `rate_limit_logs`.
    - Create migration.
    - Implement logging callback in `TrafficController`.

## Phase 6: Service Integration

### Task 6.1: BackMarketService
- [x] **Write Test**: Create `tests/buyback/services/BackMarketService.test.ts`.
    - Mock `TrafficController`.
    - Test `runPriceProbe` flow (Dip -> Peek -> Peak).
- [x] **Implement**: Create `src/buyback/services/backMarketService.ts`.
    - Implement `runPriceProbe`, `updatePrice`, `getCompetitors`.

## Phase 7: API Endpoints

### Task 7.1: Controller & Routes
- [x] **Write Test**: Create `tests/buyback/controllers/backMarketController.test.ts`.
    - Test API endpoints call service methods.
- [x] **Implement**:
    - Create `src/buyback/controllers/backMarketController.ts`.
    - Register routes in `src/buyback/routes/orderRoutes.ts` (or similar).

## Execution Strategy

1.  Pick a task.
2.  Create/Update the test file.
3.  Run test (expect failure).
4.  Implement the code.
5.  Run test (expect pass).
6.  Commit & Check off task.
