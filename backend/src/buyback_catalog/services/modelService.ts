import { modelRepository } from "../repositories/modelRepository";
import { TModelCreate, TModelUpdate, TModelTranslationInsert, ModelTranslationCreateSingleSchema, ModelTranslationUpdateSingleSchema } from "../types/modelTypes";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors"; 
import { db } from "../../db";
import { model_translations } from "../../db/shops.schema";
import { model_test_price_drops, languages } from "../../db/buyback_catalogue.schema";
import { shops } from "../../db/shops.schema";
import { and, eq, inArray } from 'drizzle-orm';
import { s3Service } from "./s3Service";
import { device_categories } from "../../db/buyback_catalogue.schema";
import { shop_device_categories } from "../../db/shops.schema";
import { TModelTestPriceDrop } from "../types/modelTypes";

export class ModelService {
  async getAllModels(
    page = 1,
    limit = 20,
    orderBy = "title",
    order: "asc" | "desc" = "asc",
    search?: string,
    categoryIds?: number[],
    brandIds?: number[],
    seriesIds?: number[],
    clientId?: number
  ) {
    return modelRepository.findAll(page, limit, orderBy, order, categoryIds, brandIds, seriesIds, clientId, true, true, search);
  }

  async getModelById(id: number) {
    const model = await modelRepository.findById(id);
    if (!model) {
      throw new NotFoundError(`Model with ID ${id} not found.`);
    }
    return model;
  }

  async getModelBySlug(slug: string, clientId: number) {
    const model = await modelRepository.findBySlug(slug, clientId);
    if (!model) {
      throw new NotFoundError(`Model with slug ${slug} not found for client ${clientId}.`);
    }
    return model;
  }

  /**
   * Create a new model with optional base_price
   * @param data Model data including title, base_price, and other required properties
   * @returns The newly created model with translations
   */
  async createModel(data: TModelCreate) {
    const { translations, ...modelData } = data;

    // Extract price drops if provided
    const priceDrops = (data as any).price_drops as TModelTestPriceDrop[] | undefined;

    // Validate relationships
    // Note: In a real application, you'd want to check if category_id and brand_id exist

    // Validate base_price if provided (additional validation at service level)
    if (modelData.base_price !== undefined && modelData.base_price !== null) {
      const priceNum = Number(modelData.base_price);
      if (isNaN(priceNum)) {
        throw new BadRequestError('Invalid base_price format. Price must be a valid number.');
      }
      if (priceNum < 0) {
        throw new BadRequestError('Base price cannot be negative.');
      }
    }

    // Create the main model entry
    const newModel = await modelRepository.create(modelData);
    if (!newModel) {
      throw new InternalServerError('Failed to create model.');
    }

    // Insert price drops if provided
    if (priceDrops && priceDrops.length > 0) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.insert(model_test_price_drops).values(priceDrops.map(pd => ({
        model_id: newModel.id,
        test_name: pd.test_name,
        price_drop: pd.price_drop,
        created_at: now,
        updated_at: now
      })) as any);
    }

    // Create translations if provided
    if (translations && translations.length > 0) {
      for (const transData of translations) {
        await modelRepository.createTranslation({
          ...transData,
          model_id: newModel.id
        });
      }
    }

    // Return the newly created model with its translations
    return modelRepository.findById(newModel.id);
  }

  /**
   * Update a model's properties including base_price
   * @param id Model ID to update
   * @param data Updated model data which may include base_price
   * @returns The updated model with translations
   */
  async updateModel(id: number, data: TModelUpdate) {
    const { translations, ...modelData } = data;

    const priceDrops = (data as any).price_drops as TModelTestPriceDrop[] | undefined;

    // Check if model exists
    const existingModel = await modelRepository.findById(id, false); 
    if (!existingModel) {
      throw new NotFoundError(`Model with ID ${id} not found.`);
    }

    // Validate base_price if provided (additional validation at service level)
    if (modelData.base_price !== undefined && modelData.base_price !== null) {
      const priceNum = Number(modelData.base_price);
      if (isNaN(priceNum)) {
        throw new BadRequestError('Invalid base_price format. Price must be a valid number.');
      }
      if (priceNum < 0) {
        throw new BadRequestError('Base price cannot be negative.');
      }
    }

    // Update the main model entry if data is provided
    if (Object.keys(modelData).length > 0) {
      await modelRepository.update(id, modelData);
    }

    // Replace price drops if provided
    if (priceDrops) {
      // Delete existing
      await db.delete(model_test_price_drops).where(eq(model_test_price_drops.model_id, id));
      if (priceDrops.length > 0) {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.insert(model_test_price_drops).values(priceDrops.map(pd => ({
          model_id: id,
          test_name: pd.test_name,
          price_drop: pd.price_drop,
          created_at: now,
          updated_at: now
        })) as any);
      }
    }

    // Handle translations
    if (translations) {
        const existingTranslationIds = (await modelRepository.findTranslationsForModel(id)).map(t => t.language_id);
        const updatedTranslationLangIds = translations.map(t => t.language_id);

        // 1. Delete translations that are not in the new list
        const translationsToDelete = existingTranslationIds.filter(langId => !updatedTranslationLangIds.includes(langId));
        if(translationsToDelete.length > 0){
           const transRecordsToDelete = await db.select({ id: model_translations.id })
             .from(model_translations)
             .where(and(
               eq(model_translations.model_id, id),
               inArray(model_translations.language_id, translationsToDelete)
             ));
           if (transRecordsToDelete.length > 0) {
                await db.delete(model_translations).where(inArray(model_translations.id, transRecordsToDelete.map(t => t.id)));
           }
        }

        // 2. Update existing or create new translations
        for (const transData of translations) {
            const existingTranslation = await modelRepository.findTranslation(id, transData.language_id);
            if (existingTranslation) {
                // Update existing
                await modelRepository.updateTranslation(existingTranslation.id, transData);
            } else {
                // Create new
                await modelRepository.createTranslation({ ...transData, model_id: id });
            }
        }
    }

    // Return the updated model with translations
    return modelRepository.findById(id);
  }

  async deleteModel(id: number) {
    // Check if model exists
    const model = await modelRepository.findById(id, false);
    if (!model) {
      throw new NotFoundError(`Model with ID ${id} not found.`);
    }

    // Delete the model image from S3 if it exists
    if (model.model_image) {
      try {
        await s3Service.deleteFile(model.model_image);
      } catch (error) {
        console.error(`Failed to delete image for model ${id}:`, error);
        // Continue with deletion even if image deletion fails
      }
    }
    
    // Repository handles deleting model and its translations
    const success = await modelRepository.delete(id);
    if (!success) {
      throw new InternalServerError(`Failed to delete model with ID ${id}.`);
    }
    return { success: true };
  }

  // --- Translation Service Methods ---

  async getAllModelTranslations(modelId: number) {
    // Check if model exists
    const modelExists = await modelRepository.findById(modelId, false);
    if (!modelExists) {
      throw new NotFoundError(`Model with ID ${modelId} not found.`);
    }
    return modelRepository.findTranslationsForModel(modelId);
  }

  async getModelTranslation(modelId: number, languageId: number) {
    const translation = await modelRepository.findTranslation(modelId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for model ID ${modelId} and language ID ${languageId}.`);
    }
    // Optionally enrich with language details if needed, repository already does it for findTranslationsForModel
    // const language = await db.query.languages.findFirst({ where: eq(languages.id, languageId)});
    // return { ...translation, language };
    return translation;
  }

  async createModelTranslation(modelId: number, data: typeof ModelTranslationCreateSingleSchema._type): Promise<TModelTranslationInsert> {
    // 1. Check if model exists
    const modelExists = await modelRepository.findById(modelId, false);
    if (!modelExists) {
      throw new NotFoundError(`Model with ID ${modelId} not found.`);
    }

    // 2. Check if language exists
    const languageExists = await db.select().from(languages).where(eq(languages.id, data.language_id)).limit(1);
    const language = languageExists[0];
    if (!language) {
        throw new NotFoundError(`Language with ID ${data.language_id} not found.`);
    }

    // 3. Check if translation already exists (optional, handled by DB constraint but cleaner here)
    const existing = await modelRepository.findTranslation(modelId, data.language_id);
    if (existing) {
        throw new BadRequestError(`Translation for model ID ${modelId} and language ID ${data.language_id} already exists.`);
    }

    // 4. Create translation
    const translationData: TModelTranslationInsert = {
        ...data,
        model_id: modelId
    };
    const newTranslation = await modelRepository.createTranslation(translationData);
    if (!newTranslation) {
        throw new InternalServerError('Failed to create model translation.');
    }
    return newTranslation;
  }

  async updateModelTranslation(modelId: number, languageId: number, data: typeof ModelTranslationUpdateSingleSchema._type) {
    // Check if translation exists before updating
    const existingTranslation = await modelRepository.findTranslation(modelId, languageId);
    if (!existingTranslation) {
      throw new NotFoundError(`Translation not found for model ID ${modelId} and language ID ${languageId} to update.`);
    }

    // Use the specific update method we added
    const updatedTranslation = await modelRepository.updateTranslationByModelAndLanguage(modelId, languageId, data);
    if (!updatedTranslation) {
        throw new InternalServerError('Failed to update model translation.');
    }
    return updatedTranslation;
  }

  async deleteModelTranslation(modelId: number, languageId: number) {
    // Check if translation exists before deleting
    const existingTranslation = await modelRepository.findTranslation(modelId, languageId);
    if (!existingTranslation) {
      throw new NotFoundError(`Translation not found for model ID ${modelId} and language ID ${languageId} to delete.`);
    }

    await modelRepository.deleteTranslation(modelId, languageId);
    return { success: true, message: 'Model translation deleted successfully' };
  }

  async upsertModelTranslation(modelId: number, languageId: number, data: typeof ModelTranslationCreateSingleSchema._type) {
    // 1. Check if model exists
    const modelExists = await modelRepository.findById(modelId, false);
    if (!modelExists) {
      throw new NotFoundError(`Model with ID ${modelId} not found.`);
    }

    // 2. Check if language exists
    const languageExists = await db.select().from(languages).where(eq(languages.id, languageId)).limit(1);
    const language = languageExists[0];
    if (!language) {
        throw new NotFoundError(`Language with ID ${languageId} not found.`);
    }

    // 3. Check if translation already exists
    const existingTranslation = await modelRepository.findTranslation(modelId, languageId);
    
    if (existingTranslation) {
      // Update existing translation
      const updatedTranslation = await modelRepository.updateTranslationByModelAndLanguage(modelId, languageId, data);
      if (!updatedTranslation) {
          throw new InternalServerError('Failed to update model translation.');
      }
      return updatedTranslation;
    } else {
      // Create new translation
      const translationData: TModelTranslationInsert = {
          ...data,
          model_id: modelId,
          language_id: languageId
      };
      const newTranslation = await modelRepository.createTranslation(translationData);
      if (!newTranslation) {
          throw new InternalServerError('Failed to create model translation.');
      }
      return newTranslation;
    }
  }

  async bulkUpsertTranslations(modelId: number, translations: Array<{
    language_id: number;
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    specifications?: string; // JSON string
  }>) {
    // Check if model exists
    const model = await modelRepository.findById(modelId, false);
    if (!model) {
      throw new NotFoundError(`Model with ID ${modelId} not found.`);
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
            const languageResult = await db.select().from(languages)
              .where(eq(languages.id, translation.language_id))
              .limit(1);
            const language = languageResult[0];
            if (!language) {
              results.errors.push({
                language_id: translation.language_id,
                error: 'Language not found'
              });
              return;
            }

            // Check if translation exists
            const existingTranslation = await modelRepository.findTranslation(
              modelId, 
              translation.language_id
            );

            // Prepare translation data with specifications handling
            const translationData = {
              ...translation,
              specifications: translation.specifications ? JSON.parse(translation.specifications) : null
            };

            if (existingTranslation) {
              // Update existing translation
              await modelRepository.updateTranslationByModelAndLanguage(modelId, translation.language_id, translationData);
              results.updated++;
            } else {
              // Create new translation
              const newTranslationData: TModelTranslationInsert = {
                ...translationData,
                model_id: modelId,
                language_id: translation.language_id
              };
              await modelRepository.createTranslation(newTranslationData);
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
   * Upload an image for a model
   * @param id Model ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded image
   */
  async uploadModelImage(id: number, file: File | Blob) {
    // Check if model exists
    const model = await modelRepository.findById(id, false);
    if (!model) {
      throw new NotFoundError(`Model with ID ${id} not found.`);
    }

    // Delete old image if it exists
    if (model.model_image) {
      try {
        await s3Service.deleteFile(model.model_image);
      } catch (error) {
        console.error(`Failed to delete old image for model ${id}:`, error);
        // Continue with upload even if old image deletion fails
      }
    }

    // Generate a unique filename for the image
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'png';
    const key = `models/${id}/image-${timestamp}.${fileExtension}`;

    // Upload the file to S3
    const imageUrl = await s3Service.uploadFile(file, key, file.type);

    // Update the model with the new image URL
    await modelRepository.update(id, { model_image: imageUrl });

    return { imageUrl };
  }

  /**
   * Get models published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @returns Paginated list of models published in the shop
   */
  async getPublishedInShop(shopId: number, options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    categoryId?: number;
    brandId?: number;
    modelSeriesId?: number;
    clientId?: number;
  }) {
    // Check if shop exists
    const shopResult = await db.select().from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);
    const shop = shopResult[0];

    if (!shop) {
      throw new NotFoundError(`Shop with ID ${shopId} not found.`);
    }

    return modelRepository.findPublishedInShop(
      shopId,
      options.page || 1,
      options.limit || 20,
      options.orderBy || 'title',
      options.order || 'asc',
      options.search,
      options.categoryId,
      options.brandId,
      options.modelSeriesId,
      options.clientId
    );
  }

  /**
   * Get models published in a specific shop that belong to a specific category identified by its slug
   * @param shopId Shop ID
   * @param categorySlug Category SEF URL (slug)
   * @param options Pagination and filtering options
   * @returns Paginated list of models published in the shop that belong to the specified category
   */
  async getPublishedInShopByCategory(shopId: number, categorySlug: string, options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    brandId?: number;
    modelSeriesId?: number;
    clientId?: number;
  }) {
    // Check if shop exists
    const shopResult = await db.select().from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);
    const shop = shopResult[0];

    if (!shop) {
      throw new NotFoundError(`Shop with ID ${shopId} not found.`);
    }

    // ==== UPDATED LOGIC: determine category by slug + shop publication ====
    // The `sef_url` (slug) alone is not unique across all clients/shops.
    // We therefore join with `shopDeviceCategories` to ensure we get the category
    // that is specifically published for the provided shop.
    const categoryRecord = await db
      .select({ id: device_categories.id })
      .from(device_categories)
      .innerJoin(shop_device_categories, eq(device_categories.id, shop_device_categories.category_id))
      .where(and(
        eq(device_categories.sef_url, categorySlug),
        eq(shop_device_categories.shop_id, shopId),
        eq(shop_device_categories.is_published, 1)
      ))
      .limit(1);

    const category = categoryRecord[0];

    if (!category) {
      throw new NotFoundError(`Category with slug '${categorySlug}' not found or not published for shop ${shopId}.`);
    }

    // Now use the category ID to filter models
    return modelRepository.findPublishedInShop(
      shopId,
      options.page || 1,
      options.limit || 20,
      options.orderBy || 'title',
      options.order || 'asc',
      options.search,
      category.id, // Use the found category ID here
      options.brandId,
      options.modelSeriesId,
      options.clientId
    );
  }

  /**
   * Get a model by its SEF URL that is published in a shop, with question set assignments
   */
  async getPublishedModelInShopBySlug(shopId: number, modelSefUrl: string) {
    if (!shopId) {
      throw new BadRequestError('Shop ID is required');
    }
    
    if (!modelSefUrl) {
      throw new BadRequestError('Model SEF URL is required');
    }
    
    // Get the model with question sets from the repository
    const model = await modelRepository.findPublishedModelBySlugInShop(shopId, modelSefUrl);
    
    if (!model) {
      throw new NotFoundError(`Model with SEF URL "${modelSefUrl}" not found in shop ${shopId} or is not published`);
    }
    
    return model;
  }
}

export const modelService = new ModelService();
