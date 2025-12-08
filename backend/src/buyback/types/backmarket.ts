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

export const CreateListingSchema = {
  body: t.Object({
    sku: t.String(),
    title: t.String(),
    price: t.String(),
    quantity: t.Number(),
    state: t.Number(),
    grade: t.Number()
  })
};

export const UpdateBasePriceSchema = {
  params: t.Object({
    listingId: t.String()
  }),
  body: t.Object({
    price: t.Number()
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

export const RepriceSchema = {
  params: t.Object({
    listingId: t.String({ description: 'The ID of the listing to reprice' })
  })
};

export const ParametersSchema = {
  params: t.Object({
    sku: t.String({ description: 'The SKU to get parameters for' })
  }),
  query: t.Object({
    grade: t.Numeric({ description: 'The grade of the device' }),
    country: t.String({ description: 'The country code (e.g. fr-fr)' })
  }),
  body: t.Object({
    sku: t.String(),
    grade: t.Number(),
    country_code: t.String(),
    c_refurb: t.Optional(t.String()),
    c_op: t.Optional(t.String()),
    c_risk: t.Optional(t.String()),
    m_target: t.Optional(t.String()),
    f_bm: t.Optional(t.String()),
    price_step: t.Optional(t.String()),
    min_price: t.Optional(t.String()),
    max_price: t.Optional(t.String()),
    triggerReprice: t.Optional(t.Boolean())
  })
};

export const WebhookSchema = {
  body: t.Object({
    type: t.String({ description: 'Event type (e.g. order.created)' }),
    payload: t.Any({ description: 'Event payload' })
  }, { additionalProperties: true })
};
