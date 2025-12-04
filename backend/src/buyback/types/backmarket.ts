import { t } from 'elysia';

export const ProbeSchema = {
  params: t.Object({
    listingId: t.String({ description: 'The ID of the listing to probe' })
  }),
  body: t.Object({
    currentPrice: t.Number({ description: 'The current price of the listing' })
  })
};

export const RecoverSchema = {
  params: t.Object({
    listingId: t.String({ description: 'The ID of the listing to recover' })
  }),
  body: t.Object({
    targetPrice: t.Number({ description: 'The target price to recover to' })
  })
};

export const SyncOrdersSchema = {
  body: t.Object({
    fullSync: t.Optional(t.Boolean({ description: 'Whether to perform a full sync (fetch all pages)', default: false }))
  })
};

export const PaginationSchema = {
  query: t.Object({
    page: t.Optional(t.Numeric({ description: 'Page number', default: 1 })),
    limit: t.Optional(t.Numeric({ description: 'Items per page', default: 50 }))
  })
};

export const OrderParamsSchema = {
  params: t.Object({
    orderId: t.String({ description: 'The Back Market Order ID' })
  })
};

export const ListingParamsSchema = {
  params: t.Object({
    listingId: t.String({ description: 'The Back Market Listing ID' })
  })
};

export const UpdateListingSchema = {
  params: t.Object({
    listingId: t.String({ description: 'The Back Market Listing ID' })
  }),
  body: t.Object({
    price: t.Optional(t.Number({ description: 'New price for the listing' })),
    quantity: t.Optional(t.Number({ description: 'New quantity for the listing' })),
    state: t.Optional(t.Number({ description: 'New state (condition) for the listing' })),
    // Allow other fields as needed, but document common ones
  }, { additionalProperties: true })
};
