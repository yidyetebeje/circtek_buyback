export enum BucketType {
  GLOBAL = 'GLOBAL',
  CATALOG = 'CATALOG', // Listings, Updates
  COMPETITOR = 'COMPETITOR', // Backbox, Competitors
  CARE = 'CARE', // SAV
}

export const ROUTE_MAP: { pattern: RegExp; type: BucketType }[] = [
  { pattern: /\/ws\/backbox\/v1\/competitors/, type: BucketType.COMPETITOR },
  { pattern: /\/ws\/listings/, type: BucketType.CATALOG },
  { pattern: /\/ws\/sav/, type: BucketType.CARE },
];

export function getBucketTypeForUrl(url: string): BucketType {
  for (const route of ROUTE_MAP) {
    if (route.pattern.test(url)) {
      return route.type;
    }
  }
  return BucketType.GLOBAL;
}
