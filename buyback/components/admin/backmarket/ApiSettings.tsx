"use client";

import { MarketplaceConfiguration } from "./MarketplaceConfiguration";
import { RateLimitConfiguration } from "./RateLimitConfiguration";

export function ApiSettings() {
  return (
    <div className="space-y-6">
      <MarketplaceConfiguration />
      <RateLimitConfiguration />
    </div>
  );
}
