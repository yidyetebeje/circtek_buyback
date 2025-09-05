import { faqRepository } from "../repositories/faqRepository";
import { 
  TFAQCreate, 
  TFAQUpdate, 
  TFAQWithTranslationsCreate,
  TFAQWithTranslationsUpdate,
  TFAQTranslationCreate,
  TFAQTranslationUpdate
} from "../types/faqTypes";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class FAQService {
  /**
   * Get all FAQs with pagination and filtering
   */
  async getAllFAQs(
    page: number = 1,
    limit: number = 20,
    orderBy: string = "order_no",
    order: "asc" | "desc" = "asc",
    filters: {
      shop_id?: number;
      tenant_id?: number;
      is_published?: boolean;
      search?: string;
    } = {}
  ) {
    if (page < 1) {
      throw new BadRequestError("Page must be greater than 0");
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestError("Limit must be between 1 and 100");
    }

    return await faqRepository.findAll(page, limit, orderBy, order, filters);
  }

  /**
   * Get FAQ by ID
   */
  async getFAQById(id: number) {
    if (!id || id < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }

    const faq = await faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundError(`FAQ with ID ${id} not found`);
    }

    return faq;
  }

  /**
   * Get FAQs by shop ID
   */
  async getFAQsByShopId(shopId: number, isPublished?: boolean) {
    if (!shopId || shopId < 1) {
      throw new BadRequestError("Invalid shop ID");
    }

    return await faqRepository.findByShopId(shopId, isPublished);
  }

  /**
   * Create a new FAQ
   */
  async createFAQ(data: TFAQCreate) {
    // Validate required fields
    if (!data.question || !data.answer) {
      throw new BadRequestError("Question and answer are required");
    }
    if (!data.shop_id || !data.tenant_id) {
      throw new BadRequestError("Shop ID and Tenant ID are required");
    }

    // Set default order if not provided
    if (data.order_no === undefined) {
      data.order_no = 0;
    }

    // Set default published status if not provided
    if (data.is_published === undefined) {
      data.is_published = true;
    }

    const faqId = await faqRepository.create(data);
    return await this.getFAQById(faqId);
  }

  /**
   * Update FAQ
   */
  async updateFAQ(id: number, data: TFAQUpdate) {
    if (!id || id < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }

    // Check if FAQ exists
    await this.getFAQById(id);

    return await faqRepository.update(id, data);
  }

  /**
   * Delete FAQ
   */
  async deleteFAQ(id: number) {
    if (!id || id < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }

    // Check if FAQ exists
    await this.getFAQById(id);

    await faqRepository.delete(id);
  }

  /**
   * Create FAQ with translations
   */
  async createFAQWithTranslations(data: TFAQWithTranslationsCreate) {
    // Validate main FAQ data
    if (!data.question || !data.answer) {
      throw new BadRequestError("Question and answer are required");
    }
    if (!data.shop_id || !data.tenant_id) {
      throw new BadRequestError("Shop ID and Tenant ID are required");
    }

    // Validate translations
    if (!data.translations || data.translations.length === 0) {
      throw new BadRequestError("At least one translation is required");
    }

    for (const translation of data.translations) {
      if (!translation.question || !translation.answer) {
        throw new BadRequestError("Translation question and answer are required");
      }
      if (!translation.language_id) {
        throw new BadRequestError("Language ID is required for translations");
      }
    }

    // Set defaults
    if (data.order_no === undefined) {
      data.order_no = 0;
    }
    if (data.is_published === undefined) {
      data.is_published = true;
    }

    // Create the main FAQ
    const faqId = await faqRepository.create({
      question: data.question,
      answer: data.answer,
      order_no: data.order_no,
      is_published: data.is_published,
      shop_id: data.shop_id,
      tenant_id: data.tenant_id
    });

    // Create translations
    for (const translation of data.translations) {
      await faqRepository.createTranslation(faqId, translation.language_id, {
        question: translation.question,
        answer: translation.answer
      });
    }

    return await this.getFAQById(faqId);
  }

  /**
   * Update FAQ with translations
   */
  async updateFAQWithTranslations(id: number, data: TFAQWithTranslationsUpdate) {
    if (!id || id < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }

    // Check if FAQ exists
    await this.getFAQById(id);

    // Update main FAQ data if provided
    if (data.question || data.answer || data.order_no !== undefined || data.is_published !== undefined) {
      await faqRepository.update(id, {
        question: data.question,
        answer: data.answer,
        order_no: data.order_no,
        is_published: data.is_published
      });
    }

    // Update translations if provided
    if (data.translations) {
      for (const translation of data.translations) {
        if (!translation.question || !translation.answer) {
          throw new BadRequestError("Translation question and answer are required");
        }
        if (!translation.language_id) {
          throw new BadRequestError("Language ID is required for translations");
        }

        await faqRepository.updateTranslation(id, translation.language_id, {
          question: translation.question,
          answer: translation.answer
        });
      }
    }

    return await this.getFAQById(id);
  }

  /**
   * Get translations for a FAQ
   */
  async getFAQTranslations(faqId: number) {
    if (!faqId || faqId < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }

    // Check if FAQ exists
    await this.getFAQById(faqId);

    return await faqRepository.getTranslationsByFAQId(faqId);
  }

  /**
   * Create translation for FAQ
   */
  async createFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    if (!faqId || faqId < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }
    if (!languageId || languageId < 1) {
      throw new BadRequestError("Invalid language ID");
    }
    if (!data.question || !data.answer) {
      throw new BadRequestError("Translation question and answer are required");
    }

    // Check if FAQ exists
    await this.getFAQById(faqId);

    await faqRepository.createTranslation(faqId, languageId, data);
    return await this.getFAQTranslations(faqId);
  }

  /**
   * Update FAQ translation
   */
  async updateFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationUpdate) {
    if (!faqId || faqId < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }
    if (!languageId || languageId < 1) {
      throw new BadRequestError("Invalid language ID");
    }

    // Check if FAQ exists
    await this.getFAQById(faqId);

    return await faqRepository.updateTranslation(faqId, languageId, data);
  }

  /**
   * Delete FAQ translation
   */
  async deleteFAQTranslation(faqId: number, languageId: number) {
    if (!faqId || faqId < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }
    if (!languageId || languageId < 1) {
      throw new BadRequestError("Invalid language ID");
    }

    // Check if FAQ exists
    await this.getFAQById(faqId);

    await faqRepository.deleteTranslation(faqId, languageId);
  }

  /**
   * Upsert FAQ translation (create or update)
   */
  async upsertFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    if (!faqId || faqId < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }
    if (!languageId || languageId < 1) {
      throw new BadRequestError("Invalid language ID");
    }
    if (!data.question || !data.answer) {
      throw new BadRequestError("Translation question and answer are required");
    }

    // Check if FAQ exists
    await this.getFAQById(faqId);

    await faqRepository.upsertFAQTranslation(faqId, languageId, data);

    return await this.getFAQTranslations(faqId);
  }

  /**
   * Update FAQ order
   */
  async updateFAQOrder(id: number, newOrder: number) {
    if (!id || id < 1) {
      throw new BadRequestError("Invalid FAQ ID");
    }
    if (newOrder < 0) {
      throw new BadRequestError("Order must be non-negative");
    }

    // Check if FAQ exists
    await this.getFAQById(id);

    await faqRepository.updateOrder(id, newOrder);
    return await this.getFAQById(id);
  }
}

export const faqService = new FAQService(); 