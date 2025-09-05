import { categoryRepository } from "../repositories/categoryRepository";
import { s3Service } from "./s3Service";
import { 
  TCategoryCreate, 
  TCategoryUpdate, 
  TCategoryTranslationCreate,
  TCategoryWithTranslationsCreate,
  TCategoryWithTranslationsUpdate
} from "../types/categoryTypes";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { db } from "../../db";
import { shops } from "../../db/shops.schema";
import { languages } from "../../db/buyback_catalogue.schema";
import { eq } from "drizzle-orm";

export class CategoryService {
  // Main category methods
  async getAllCategories(
    page = 1, 
    limit = 20, 
    orderBy = "order_no", 
    order: "asc" | "desc" = "asc",
    tenantId?: number
  ) {
    return categoryRepository.findAll(page, limit, orderBy, order, tenantId);
  }

  async getCategoryById(id: number) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return category;
  }

  async getCategoryBySlug(slug: string, tenantId: number) {
    const category = await categoryRepository.findBySlug(slug, tenantId);
    if (!category) {
      throw new Error(`Category with slug '${slug}' not found`);
    }
    return category;
  }

  async createCategory(data: TCategoryCreate) {
    // Check for duplicate sef_url within the same tenant
    if(data.sef_url){
      const existingCategory = await categoryRepository.findBySlug(data.sef_url, data.tenant_id);
      if (existingCategory) {
        throw new Error(`Category with URL '${data.sef_url}' already exists for this tenant`);
      }
    }

    return categoryRepository.create(data);
  }

  async updateCategory(id: number, data: TCategoryUpdate) {
    // Check if category exists
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // If updating the sef_url, check for duplicates
    if (data.sef_url && data.sef_url !== category.sef_url && data.tenant_id) {
      const existingCategory = await categoryRepository.findBySlug(data.sef_url, data.tenant_id);
      if (existingCategory && existingCategory.id !== id) {
        throw new Error(`Category with URL '${data.sef_url}' already exists for this tenant`);
      }
    }

    return categoryRepository.update(id, data);
  }

  async deleteCategory(id: number) {
    // Check if category exists
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // Delete the category icon from S3 if it exists
    if (category.icon) {
      try {
        await s3Service.deleteFile(category.icon);
      } catch (error) {
        console.error(`Failed to delete icon for category ${id}:`, error);
        // Continue with deletion even if icon deletion fails
      }
    }

    return categoryRepository.delete(id);
  }

  // Category with translations methods
  async createCategoryWithTranslations(data: TCategoryWithTranslationsCreate) {
    // Create the base category first
    const category = await this.createCategory(data.category);

    // Create translations if provided
    if (category && data.translations && data.translations.length > 0) {
      for (const translation of data.translations) {
        await categoryRepository.createTranslation({
          ...translation,
          category_id: category.id
        });
      }
    }

    // Return the complete category with translations
    if(category){
      return categoryRepository.findById(category.id);
    }
    return null;
  }

  async updateCategoryWithTranslations(id: number, data: TCategoryWithTranslationsUpdate) {
    // Update the base category
    await this.updateCategory(id, data.category);

    // Update or create translations if provided
    if (data.translations && data.translations.length > 0) {
      for (const translation of data.translations) {
        const { language_id, ...translationData } = translation;
        
        // Check if this translation already exists
        const existingTranslation = await categoryRepository.findTranslation(id, language_id);
        
        if (existingTranslation) {
          // Update existing translation
          // We assume partial updates are allowed here, potentially without title
          await categoryRepository.updateTranslation(existingTranslation.id, translationData);
        } else {
          // Create new translation - Title is REQUIRED here by the DB schema
          if (typeof translationData.title !== 'string' || translationData.title.trim() === '') {
            throw new Error(`Title is required when creating a new translation for category ID ${id} and language ID ${language_id}`);
          }
          await categoryRepository.createTranslation({
            category_id: id,
            language_id,
            // Now we know title exists and is a non-empty string
            ...translationData,
            title: translationData.title // Explicitly pass validated title for type safety
          });
        }
      }
    }

    // Return the updated category with translations
    return categoryRepository.findById(id);
  }

  // Icon upload methods
  async uploadCategoryIcon(id: number, file: File | Blob) {
    // Check if category exists
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // Delete old icon if it exists
    if (category.icon) {
      try {
        await s3Service.deleteFile(category.icon);
      } catch (error) {
        console.error(`Failed to delete old icon for category ${id}:`, error);
        // Continue with upload even if old icon deletion fails
      }
    }

    // Generate a unique filename for the icon
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'png';
    const key = `categories/${id}/icon-${timestamp}.${fileExtension}`;

    // Upload the file to S3
    const iconUrl = await s3Service.uploadFile(file, key, file.type);

    // Update the category with the new icon URL
    await categoryRepository.update(id, { icon: iconUrl });

    return { iconUrl };
  }

  // Translation methods
  async getTranslationsByCategory(categoryId: number) {
    const category = await categoryRepository.findById(categoryId, false);
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    return categoryRepository.findTranslationsForCategory(categoryId);
  }

  async createTranslation(categoryId: number, data: Omit<TCategoryTranslationCreate, 'category_id'>) {
    // Check if category exists
    const category = await categoryRepository.findById(categoryId, false);
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await categoryRepository.findTranslation(categoryId, data.language_id);
    if (existingTranslation) {
      throw new Error(`Translation for this language already exists for category ${categoryId}`);
    }

    return categoryRepository.createTranslation({
      ...data,
      category_id: categoryId
    });
  }

  async updateTranslation(categoryId: number, languageId: number, data: Partial<Omit<TCategoryTranslationCreate, 'category_id' | 'language_id'>>) {
    // Check if translation exists
    const translation = await categoryRepository.findTranslation(categoryId, languageId);
    if (!translation) {
      throw new Error(`Translation not found for category ${categoryId} and language ${languageId}`);
    }

    return categoryRepository.updateTranslation(translation.id, data);
  }

  async deleteTranslation(categoryId: number, languageId: number) {
    // Check if translation exists
    const translation = await categoryRepository.findTranslation(categoryId, languageId);
    if (!translation) {
      throw new Error(`Translation not found for category ${categoryId} and language ${languageId}`);
    }

    return categoryRepository.deleteTranslation(translation.id);
  }

  async upsertTranslation(categoryId: number, languageId: number, data: Partial<Omit<TCategoryTranslationCreate, 'category_id' | 'language_id'>>) {
    // Check if category exists
    const category = await categoryRepository.findById(categoryId, false);
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    // Check if translation already exists
    const existingTranslation = await categoryRepository.findTranslation(categoryId, languageId);
    
    if (existingTranslation) {
      // Update existing translation
      return categoryRepository.updateTranslation(existingTranslation.id, data);
    } else {
      // Create new translation - Title is required for new translations
      if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
        throw new Error(`Title is required when creating a new translation for category ID ${categoryId} and language ID ${languageId}`);
      }
      
      return categoryRepository.createTranslation({
        category_id: categoryId,
        language_id: languageId,
        ...data,
        title: data.title // Explicitly pass validated title
      });
    }
  }

  async bulkUpsertTranslations(categoryId: number, translations: Array<{
    language_id: number;
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  }>) {
    // Check if category exists
    const category = await categoryRepository.findById(categoryId, false);
    if (!category) {
      throw new NotFoundError(`Category with ID ${categoryId} not found.`);
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ language_id: number; error: string }>
    };

    // Process translations in parallel with some concurrency control
    const chunkSize = 5; // Process 5 at a time to avoid overwhelming the database
    for (let i = 0; i < translations.length; i += chunkSize) {
      const chunk = translations.slice(i, i + chunkSize);
      
      await Promise.all(
        chunk.map(async (translation) => {
          try {
            // Check if language exists
            const language = await db.select().from(languages).where(eq(languages.id, translation.language_id)).limit(1);
            if (!language[0]) {
              results.errors.push({
                language_id: translation.language_id,
                error: 'Language not found'
              });
              return;
            }

            // Check if translation exists
            const existingTranslation = await categoryRepository.findTranslation(
              categoryId, 
              translation.language_id
            );

            if (existingTranslation) {
              // Update existing translation
              await categoryRepository.updateTranslation(existingTranslation.id, translation);
              results.updated++;
            } else {
              // Create new translation
              const translationData = {
                ...translation,
                category_id: categoryId
              };
              await categoryRepository.createTranslation(translationData);
              results.created++;
            }
          } catch (error) {
            console.error(`Error processing translation for language ${translation.language_id}:`, error);
            results.errors.push({
              language_id: translation.language_id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
    }

    return results;
  }

  /**
   * Get categories published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @returns Paginated list of categories published in the shop
   */
  async getPublishedInShop(shopId: number, options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    tenantId?: number;
  }) {
    // Check if shop exists
    const shop  = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    if (!shop[0]) {
      throw new NotFoundError(`Shop with ID ${shopId} not found.`);
    }

    return categoryRepository.findPublishedInShop(
      shopId,
      options.page || 1,
      options.limit || 20,
      options.orderBy || 'title',
      options.order || 'asc',
      options.search,
      options.tenantId
    );
  }
}

export const categoryService = new CategoryService();
