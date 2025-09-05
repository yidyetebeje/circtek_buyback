import { faqService } from "../services/faqService";
import { 
  TFAQCreate, 
  TFAQUpdate, 
  TFAQWithTranslationsCreate,
  TFAQWithTranslationsUpdate,
  TFAQTranslationCreate,
  TFAQTranslationUpdate
} from "../types/faqTypes";
import { Context } from "elysia";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { JwtUser } from "@/middleware/auth";
import { getClientId } from "../utils/getId";

export class FAQController {
  /**
   * Get all FAQs with pagination and filtering
   */
  async getAllFAQs(
    page: number = 1,
    limit: number = 20,
    orderBy: string = "order_no",
    order: "asc" | "desc" = "asc",
    shopId?: number,
    clientId?: number,
    isPublished?: boolean,
    search?: string
  ) {
    try {
      const filters: any = {};
      if (shopId) filters.shop_id = shopId;
      if (clientId) filters.client_id = clientId;
      if (isPublished !== undefined) filters.is_published = isPublished;
      if (search) filters.search = search;
      return await faqService.getAllFAQs(page, limit, orderBy, order, filters);
    } catch (error) {
      console.error("Error in getAllFAQs:", error);
      throw error;
    }
  }

  /**
   * Get FAQ by ID
   */
  async getFAQById(id: number) {
    try {
      const faq = await faqService.getFAQById(id);
      return {
        success: true,
        data: faq
      };
    } catch (error) {
      console.error(`Error in getFAQById(${id}):`, error);
      throw error;
    }
  }

  /**
   * Get FAQs by shop ID
   */
  async getFAQsByShopId(shopId: number, isPublished?: boolean) {
    try {
      const faqs = await faqService.getFAQsByShopId(shopId, isPublished);
      return {
        success: true,
        data: faqs
      };
    } catch (error) {
      console.error(`Error in getFAQsByShopId(${shopId}):`, error);
      throw error;
    }
  }

  /**
   * Create FAQ
   */
  async createFAQ(data: Omit<TFAQCreate, 'client_id'>, user: JwtUser, ctx: Context) {
    try {
      const clientId = getClientId(user);
      if (!clientId) {
        ctx.set.status = 400;
        return { error: "Client ID could not be determined for the user." };
      }

      const faq = await faqService.createFAQ({ ...data, client_id: clientId });
      ctx.set.status = 201;
      return {
        success: true,
        data: faq,
        message: "FAQ created successfully"
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in createFAQ:", error);
      ctx.set.status = 500;
      return { error: "Failed to create FAQ" };
    }
  }

  /**
   * Update FAQ
   */
  async updateFAQ(id: number, data: TFAQUpdate, ctx: Context) {
    try {
      const faq = await faqService.updateFAQ(id, data);
      return {
        success: true,
        data: faq,
        message: "FAQ updated successfully"
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in updateFAQ:", error);
      ctx.set.status = 500;
      return { error: "Failed to update FAQ" };
    }
  }

  /**
   * Delete FAQ
   */
  async deleteFAQ(id: number, ctx: Context) {
    try {
      await faqService.deleteFAQ(id);
      ctx.set.status = 204;
      return;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in deleteFAQ:", error);
      ctx.set.status = 500;
      return { error: "Failed to delete FAQ" };
    }
  }

  /**
   * Create FAQ with translations
   */
  async createFAQWithTranslations(data: Omit<TFAQWithTranslationsCreate, 'client_id'>, user: JwtUser, ctx: Context) {
    try {
      const clientId = getClientId(user);
      if (!clientId) {
        ctx.set.status = 400;
        return { error: "Client ID could not be determined for the user." };
      }
      const faq = await faqService.createFAQWithTranslations({ ...data, client_id: clientId });
      ctx.set.status = 201;
      return {
        success: true,
        data: faq,
        message: "FAQ created with translations successfully"
      };
    } catch (error) {
      console.error("Error in createFAQWithTranslations:", error);
      throw error;
    }
  }

  /**
   * Update FAQ with translations
   */
  async updateFAQWithTranslations(id: number, data: TFAQWithTranslationsUpdate) {
    try {
      const faq = await faqService.updateFAQWithTranslations(id, data);
      return {
        success: true,
        data: faq,
        message: "FAQ updated with translations successfully"
      };
    } catch (error) {
      console.error("Error in updateFAQWithTranslations:", error);
      throw error;
    }
  }

  /**
   * Get FAQ translations
   */
  async getFAQTranslations(faqId: number) {
    try {
      const translations = await faqService.getFAQTranslations(faqId);
      return {
        success: true,
        data: translations
      };
    } catch (error) {
      console.error(`Error in getFAQTranslations(${faqId}):`, error);
      throw error;
    }
  }

  /**
   * Create FAQ translation
   */
  async createFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    try {
      const translations = await faqService.createFAQTranslation(faqId, languageId, data);
      return {
        success: true,
        data: translations,
        message: "FAQ translation created successfully"
      };
    } catch (error) {
      console.error("Error in createFAQTranslation:", error);
      throw error;
    }
  }

  /**
   * Update FAQ translation
   */
  async updateFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationUpdate) {
    try {
      const translations = await faqService.updateFAQTranslation(faqId, languageId, data);
      return {
        success: true,
        data: translations,
        message: "FAQ translation updated successfully"
      };
    } catch (error) {
      console.error("Error in updateFAQTranslation:", error);
      throw error;
    }
  }

  /**
   * Delete FAQ translation
   */
  async deleteFAQTranslation(faqId: number, languageId: number) {
    try {
      await faqService.deleteFAQTranslation(faqId, languageId);
      return { success: true, message: "FAQ translation deleted successfully" };
    } catch (error) {
      console.error("Error in deleteFAQTranslation:", error);
      throw error;
    }
  }

  /**
   * Upsert FAQ translation (create or update)
   */
  async upsertFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    try {
      const translation = await faqService.upsertFAQTranslation(faqId, languageId, data);
      return {
        success: true,
        data: translation,
        message: "FAQ translation saved successfully"
      };
    } catch (error) {
      console.error("Error in upsertFAQTranslation:", error);
      throw error;
    }
  }

  /**
   * Update FAQ order
   */
  async updateFAQOrder(id: number, newOrder: number, ctx: Context) {
    try {
      const faq = await faqService.updateFAQOrder(id, newOrder);
      return {
        success: true,
        data: faq,
        message: "FAQ order updated successfully"
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in updateFAQOrder:", error);
      ctx.set.status = 500;
      return { error: "Failed to update FAQ order" };
    }
  }
}

export const faqController = new FAQController(); 