import { BuybackPricingService } from "../buyback/services/BuybackPricingService";

async function main() {
  console.log("Running Buyback Pricing Sync...");
  const service = new BuybackPricingService();
  await service.calculateAndSyncPrices();
  console.log("Done.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
