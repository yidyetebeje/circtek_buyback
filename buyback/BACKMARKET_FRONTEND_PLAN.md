# Back Market Frontend Integration Plan

This document tracks the implementation of the Back Market integration in the Admin UI, including the Dual-Channel Pricing Architecture and Rate Limit handling.

## 1. Listings Manager (Priority: High)
The core interface for managing Back Market listings and triggering pricing actions.

- [x] **Listings Table Component**
    - [x] Fetch and display listings from `GET /backmarket/listings`.
    - [x] Columns: Image, Title, SKU, Price, Quantity, Status, Last Synced.
    - [x] Pagination and Filtering.
- [x] **Action Buttons**
    - [x] **Reprice Now**: Trigger `POST /backmarket/reprice/:id`.
    - [x] **Run Probe**: Open modal to input `currentPrice` -> `POST /backmarket/probe/:id`.
    - [x] **Emergency Recover**: Open modal to input `targetPrice` -> `POST /backmarket/recover/:id`.
- [x] **Sync Controls**
    - [x] Button to `POST /backmarket/sync/listings`.
    - [x] Button to `POST /backmarket/sync/orders`.

## 2. Pricing Configuration (Priority: High)
Interface to define the cost parameters that drive the Profitability Constraint Service (PFCS).

- [x] **Configuration Form**
    - [x] Inputs for:
        - `c_refurb` (Refurbishment Cost)
        - `c_op` (Operational Cost)
        - `c_risk` (Warranty/Risk Cost)
        - `m_target` (Target Margin %)
        - `f_bm` (Back Market Fee %)
    - [x] Scope selection: SKU + Grade + Country.
- [x] **Integration**
    - [x] Fetch existing params via `GET /backmarket/parameters/:sku`.
    - [x] Save params via `POST /backmarket/parameters`.

## 3. Scheduler & Monitoring (Priority: Medium)
Dashboard to monitor the automated background tasks and system health.

- [x] **Scheduler Status Widget**
    - [x] Poll `GET /backmarket/scheduler/status`.
    - [x] Display status (Running/Idle), Last Run Time, and Last Error for:
        - Order Sync
        - Listing Sync
        - Repricing Cycle
- [x] **Rate Limit Visibility**
    - [x] Display current API usage/token bucket status if exposed by backend.

## 4. Orders View (Priority: Medium)
View specific Back Market orders.

- [x] **Orders Table**
    - [x] Fetch from `GET /backmarket/orders`.
    - [x] Display Order ID, Status, Customer, Total, Date.
- [x] **Live Order Check**
    - [x] Button to fetch live data `GET /backmarket/orders/:id/live`.

## Technical Notes
- **API Client**: Use `lib/api/backMarketService.ts`.
- **Environment**: Ensure `.env.local` points to the local backend (`http://localhost:3020/api/v1`) during development.
- **Rate Limiting**: The frontend should gracefully handle `429` errors if the backend passes them through, though the backend `TrafficController` should mitigate this.
