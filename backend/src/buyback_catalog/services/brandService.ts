import { brandRepository } from "../repositories/brandRepository";
import { TBrandCreate, TBrandUpdate, TBrandTranslationCreate } from "../types/brandTypes";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors";
import { db } from "../../db";
import { brand_translations } from "../../db/shops.schema";
import { languages } from "../../db/buyback_catalogue.schema";
import { shops } from "../../db/shops.schema";
import { and, eq, inArray } from 'drizzle-orm';
import { s3Service } from "./s3Service";
// Service layer for brand business logic
// potentially trigger linter refresh

export class BrandService {
  async getAllBrands(
    page = 1,
    limit = 20,
    orderBy = "order_no",
    order: "asc" | "desc" = "asc",
    tenantId?: number
  ) {
    return brandRepository.findAll(page, limit, orderBy, order, tenantId);
  }

  async getBrandById(id: number) {
    const brand = await brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${id} not found.`);
    }
    return brand;
  }

  async getBrandBySlug(slug: string, tenantId: number) {
    const brand = await brandRepository.findBySlug(slug, tenantId);
    if (!brand) {
      throw new NotFoundError(`Brand with slug ${slug} not found for tenant ${tenantId}.`);
    }
    return brand;
  }

  async createBrand(data: TBrandCreate) {
    const { translations, ...brandData } = data;

    // Create the main brand entry
    const newBrand = await brandRepository.create(brandData);
    if (!newBrand) {
      throw new InternalServerError('Failed to create brand.');
    }

    // Create translations if provided
    if (translations && translations.length > 0) {
      for (const transData of translations) {
        await brandRepository.createTranslation({
          ...transData,
          brand_id: newBrand.id
        });
      }
    }

    // Return the newly created brand with its translations
    return brandRepository.findById(newBrand.id);
  }

  async updateBrand(id: number, data: TBrandUpdate) {
    const { translations, ...brandData } = data;

    // Check if brand exists
    const existingBrand = await brandRepository.findById(id, false); // Don't need translations here
    if (!existingBrand) {
      throw new NotFoundError(`Brand with ID ${id} not found.`);
    }

    // Update the main brand entry if data is provided
    if (Object.keys(brandData).length > 0) {
      await brandRepository.update(id, brandData);
    }

    // Handle translations
    if (translations) {
        const existingTranslationIds = (await brandRepository.findTranslationsForBrand(id)).map(t => t.language_id);
        const updatedTranslationLangIds = translations.map(t => t.language_id);

        // 1. Delete translations that are not in the new list
        const translationsToDelete = existingTranslationIds.filter(langId => !updatedTranslationLangIds.includes(langId));
        if(translationsToDelete.length > 0){
           // We need a method in repo to delete by brand_id and language_id array
           // For now, deleting one by one or getting ids first
           const transRecordsToDelete = await db
               .select({ id: brand_translations.id })
               .from(brand_translations)
               .where(and(
                   eq(brand_translations.brand_id, id),
                   inArray(brand_translations.language_id, translationsToDelete)
               ));
           if (transRecordsToDelete.length > 0) {
                await db.delete(brand_translations).where(inArray(brand_translations.id, transRecordsToDelete.map(t => t.id)));
           }
        }

        // 2. Update existing or create new translations
        for (const transData of translations) {
            const existingTranslation = await brandRepository.findTranslation(id, transData.language_id);
            if (existingTranslation) {
                // Update existing
                await brandRepository.updateTranslation(existingTranslation.id, transData);
            } else {
                // Create new
                await brandRepository.createTranslation({ ...transData, brand_id: id });
            }
        }
    }

    // Return the updated brand with translations
    return brandRepository.findById(id);
  }

  async deleteBrand(id: number) {
    // Check if brand exists
    const brand = await brandRepository.findById(id, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${id} not found.`);
    }

    // Delete the brand icon from S3 if it exists
    if (brand.icon) {
      try {
        await s3Service.deleteFile(brand.icon);
      } catch (error) {
        console.error(`Failed to delete icon for brand ${id}:`, error);
        // Continue with deletion even if icon deletion fails
      }
    }
    
    // Repository handles deleting brand and its translations
    const success = await brandRepository.delete(id);
    if (!success) {
      throw new InternalServerError(`Failed to delete brand with ID ${id}.`);
    }
    return { success: true };
  }

  /**
   * Upload an icon image for a brand
   * @param id Brand ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded icon
   */
  async uploadBrandIcon(id: number, file: File | Blob) {
    // Check if brand exists
    const brand = await brandRepository.findById(id, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${id} not found.`);
    }

    // Delete old icon if it exists
    if (brand.icon) {
      try {
        await s3Service.deleteFile(brand.icon);
      } catch (error) {
        console.error(`Failed to delete old icon for brand ${id}:`, error);
        // Continue with upload even if old icon deletion fails
      }
    }

    // Generate a unique filename for the icon
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'png';
    const key = `brands/${id}/icon-${timestamp}.${fileExtension}`;

    // Upload the file to S3
    const iconUrl = await s3Service.uploadFile(file, key, file.type);

    // Update the brand with the new icon URL
    await brandRepository.update(id, { icon: iconUrl });

    return { iconUrl };
  }

  // Translation methods
  async getTranslationsByBrand(brandId: number) {
    const brand = await brandRepository.findById(brandId, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${brandId} not found.`);
    }

    return brandRepository.findTranslationsForBrand(brandId);
  }

  async createTranslation(brandId: number, data: Omit<TBrandTranslationCreate, 'brand_id'>) {
    // Check if brand exists
    const brand = await brandRepository.findById(brandId, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${brandId} not found.`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await brandRepository.findTranslation(brandId, data.language_id);
    if (existingTranslation) {
      throw new BadRequestError(`Translation for this language already exists for brand ${brandId}.`);
    }

    return brandRepository.createTranslation({
      ...data,
      brand_id: brandId
    });
  }

  async updateTranslation(brandId: number, languageId: number, data: Partial<Omit<TBrandTranslationCreate, 'brand_id' | 'language_id'>>) {
    // Check if translation exists
    const translation = await brandRepository.findTranslation(brandId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for brand ${brandId} and language ${languageId}.`);
    }

    return brandRepository.updateTranslation(translation.id, data);
  }

  async deleteTranslation(brandId: number, languageId: number) {
    // Check if translation exists
    const translation = await brandRepository.findTranslation(brandId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for brand ${brandId} and language ${languageId}.`);
    }

    return brandRepository.deleteTranslation(translation.id);
  }

  async upsertTranslation(brandId: number, languageId: number, data: Partial<Omit<TBrandTranslationCreate, 'brand_id' | 'language_id'>>) {
    // 1. Check if brand exists
    const brand = await brandRepository.findById(brandId, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${brandId} not found.`);
    }

    // 2. Check if translation exists
    const existingTranslation = await brandRepository.findTranslation(brandId, languageId);
    
    if (existingTranslation) {
      // Update existing translation
      return brandRepository.updateTranslation(existingTranslation.id, data);
    } else {
      // Create new translation - Title is required for new translations
      if (!data.title || data.title.trim() === '') {
        throw new BadRequestError(`Title is required when creating a new translation for brand ID ${brandId} and language ID ${languageId}`);
      }
      
      return brandRepository.createTranslation({
        brand_id: brandId,
        language_id: languageId,
        ...data,
        title: data.title // Explicitly pass validated title
      });
    }
  }

  async bulkUpsertTranslations(brandId: number, translations: Array<{
    language_id: number;
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  }>) {
    // Check if brand exists
    const brand = await brandRepository.findById(brandId, false);
    if (!brand) {
      throw new NotFoundError(`Brand with ID ${brandId} not found.`);
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
            const language = await db
              .select()
              .from(languages)
              .where(eq(languages.id, translation.language_id))
              .limit(1);
            if (!language[0]) {
              results.errors.push({
                language_id: translation.language_id,
                error: 'Language not found'
              });
              return;
            }

            // Check if translation exists
            const existingTranslation = await brandRepository.findTranslation(
              brandId, 
              translation.language_id
            );

            if (existingTranslation) {
              // Update existing translation
              await brandRepository.updateTranslation(existingTranslation.id, translation);
              results.updated++;
            } else {
              // Create new translation
              const translationData = {
                ...translation,
                brand_id: brandId
              };
              await brandRepository.createTranslation(translationData);
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
   * Get brands published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @returns Paginated list of brands published in the shop
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
    const shop = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop[0]) {
      throw new NotFoundError(`Shop with ID ${shopId} not found.`);
    }

    return brandRepository.findPublishedInShop(
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

export const brandService = new BrandService();
