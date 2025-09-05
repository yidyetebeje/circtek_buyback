import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { languageRoutes } from "./routes/languageRoutes";
import { categoryRoutes } from "./routes/categoryRoutes";
import { brandRoutes } from "./routes/brandRoutes";
import { modelSeriesRoutes } from "./routes/modelSeriesRoutes";
import { modelRoutes } from "./routes/modelRoutes";
import { shopRoutes } from "./routes/shopRoutes";
import { shopCatalogRoutes } from "./routes/shopCatalogRoutes";
import { questionSetRoutes } from './routes/questionSetRoutes';
import { userShopAccessRoutes } from './routes/userShopAccessRoutes';
import { aiTranslationRoutes } from './routes/aiTranslationRoutes';
import { faqRoutes, shopFAQRoutes } from './routes/faqRoutes';
import { featuredDeviceRoutes } from './routes/featuredDeviceRoutes';
  
// Create a catalog API instance with Swagger documentation
export const catalogApi = new Elysia({ prefix: "/catalog" })
  .use(swagger({
    documentation: {
      info: {
        title: "Catalog API",
        version: "1.0.0",
        description: "API for managing product catalog including categories, brands, models, FAQs, AI translations, and more"
      },
      tags: [
        { name: "Languages", description: "Language management endpoints" },
        { name: "Categories", description: "Device category management endpoints" },
        { name: "Brands", description: "Brand management endpoints" },
        { name: "Model Series", description: "Model series management endpoints" },
        { name: "Models", description: "Device models management endpoints" },
        { name: "FAQs", description: "Frequently Asked Questions management endpoints" },
        { name: "FAQ Translations", description: "FAQ translation management endpoints" },
        { name: "Shop FAQs", description: "Shop-specific FAQ endpoints" },
        { name: "Shops", description: "Shop management endpoints" },
        { name: "Shop Access", description: "Shop access management endpoints" },
        { name: "AI Translation", description: "AI-powered translation generation using Google Gemini" },
        { name: "Health Check", description: "Service health and status endpoints" }
      ]
    }
  }))
  .use(languageRoutes)
  .use(categoryRoutes)
  .use(brandRoutes)
  .use(modelSeriesRoutes)
  .use(modelRoutes)
  .use(faqRoutes)
  .use(shopRoutes)
  .use(shopFAQRoutes)
  .use(shopCatalogRoutes)
  .use(questionSetRoutes)
  .use(userShopAccessRoutes)
  .use(aiTranslationRoutes)
  .use(featuredDeviceRoutes);

export default catalogApi;
