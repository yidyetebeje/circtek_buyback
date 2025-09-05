# Email Notification System

This module provides email notification capabilities for the buyback system, specifically handling order status change notifications.

## Overview

The email system consists of:

1. A generic `EmailService` that can work with different email providers
2. A `ResendEmailProvider` implementation (easily replaceable with other providers)
3. An `OrderNotificationService` for sending status-specific notifications

## How It Works

When an order's status changes, the system:

1. Retrieves the appropriate email template for that status
2. Populates the template with order-specific data
3. Sends the email to the customer

## Configuration

Add the following environment variables to your `.env` file:

```
# Email (Resend)
RESEND_API_KEY=your_resend_api_key_here
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Buyback System
```

## Email Templates

For each order status, a specific template type is used:

- `PENDING_SHIPMENT` → `ORDER_CONFIRMATION`
- `RECEIVED_BY_ADMIN` → `SHIPMENT_RECEIVED`
- `INSPECTION_COMPLETED` → `INSPECTION_COMPLETED`
- `OFFER_ACCEPTED` → `OFFER_ACCEPTED`
- `OFFER_REJECTED` → `OFFER_REJECTED`
- `COMPLETED` → `ORDER_COMPLETED`
- `CANCELLED` → `ORDER_CANCELLED`

Templates are stored per shop, allowing customization.

## Creating Default Templates

Run the included script to create default templates for all shops:

```bash
bun run src/email-templates/scripts/create-default-templates.ts
```

## Switching Email Providers

To change the email provider:

1. Create a new class implementing the `EmailProvider` interface
2. Update the `getEmailService` function in `email-service.ts` or use `setProvider` method

Example:

```typescript
// Create a new provider
const newProvider = new SomeOtherEmailProvider(apiKey);

// Get the email service instance
const emailService = getEmailService();

// Switch to the new provider
emailService.setProvider(newProvider);
```

## Technical Details

- Emails are sent asynchronously (non-blocking)
- Failed email attempts are logged but don't block API responses
- Templates support dynamic variables (e.g., `{{order.orderNumber}}`, `{{customer.name}}`)
