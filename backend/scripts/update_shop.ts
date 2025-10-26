import { defaultShopConfig } from "../src/buyback_catalog/controllers/default_config";
import { ShopController } from "../src/buyback_catalog/controllers/shopController";


console.log("updating shop")
const shopController = new ShopController();
const shopConfig = defaultShopConfig;

const result = await shopController.update(2, {config: shopConfig}, {} as any);
console.log("Update result:", result);
console.log("finsih updating")