import { modelSeriesRepository } from "../repositories/modelSeriesRepository";
import { TModelSeriesCreate, TModelSeriesUpdate, TModelSeriesTranslationInsert, ModelSeriesTranslationCreateSingleSchema, ModelSeriesTranslationUpdateSingleSchema } from "../types/modelSeriesTypes";
import { NotFoundError, InternalServerError, BadRequestError, ConflictError } from "../utils/errors"; 
import { db } from "../../db";
import { modelSeriesTranslations, languages } from "../../db/schema/catalog"; 
import { shops } from "../../db/schema/user";
import { and, eq, inArray } from 'drizzle-orm';
import { s3Service } from "./s3Service";
import { toSafeUrl } from "../utils/urlUtils";

export class ModelSeriesService {
  async getAllModelSeries(
    page = 1,
    limit = 20,
    orderBy = "order_no",
    order: "asc" | "desc" = "asc",
    clientId?: number,
    search?: string
  ) {
    return modelSeriesRepository.findAll(page, limit, orderBy, order, clientId, search);
  }

  async getModelSeriesById(id: number) {
    const modelSeries = await modelSeriesRepository.findById(id);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with ID ${id} not found.`);
    }
    return modelSeries;
  }

  async getModelSeriesBySlug(slug: string, clientId: number) {
    const modelSeries = await modelSeriesRepository.findBySlug(slug, clientId);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with slug ${slug} not found for client ${clientId}.`);
    }
    return modelSeries;
  }

  async createModelSeries(data: TModelSeriesCreate) {
    const { translations, ...modelSeriesData } = data;

    // Duplicate check based on SEF URL (slug) + client
    const slug = modelSeriesData.sef_url ?? toSafeUrl(modelSeriesData.title);
    const existing = await modelSeriesRepository.findBySlug(slug, modelSeriesData.client_id);
    if (existing) {
      throw new ConflictError(`A model series with the slug "${slug}" already exists for this client.`);
    }

    // Create the main model series entry
    const newModelSeries = await modelSeriesRepository.create(modelSeriesData);
    if (!newModelSeries) {
      throw new InternalServerError('Failed to create model series.');
    }

    // Create translations if provided
    if (translations && translations.length > 0) {
      for (const transData of translations) {
        await modelSeriesRepository.createTranslation({
          ...transData,
          series_id: newModelSeries.id
        });
      }
    }

    // Return the newly created model series with its translations
    return modelSeriesRepository.findById(newModelSeries.id);
  }

  async updateModelSeries(id: number, data: TModelSeriesUpdate) {
    const { translations, ...modelSeriesData } = data;

    // Check if model series exists
    const existingModelSeries = await modelSeriesRepository.findById(id, false); 
    if (!existingModelSeries) {
      throw new NotFoundError(`Model Series with ID ${id} not found.`);
    }

    // Duplicate slug check if title or sef_url are being changed
    const { title, sef_url } = data;
    if (title !== undefined || sef_url !== undefined) {
      const newSlug = sef_url ?? (title ? toSafeUrl(title) : existingModelSeries.sef_url);
      if (newSlug) {
        const duplicate = await modelSeriesRepository.findBySlug(newSlug, existingModelSeries.client_id);
        if (duplicate && duplicate.id !== id) {
          throw new ConflictError(`Another model series already uses the slug "${newSlug}".`);
        }
      }
    }

    // Update the main model series entry if data is provided
    if (Object.keys(modelSeriesData).length > 0) {
      await modelSeriesRepository.update(id, modelSeriesData);
    }

    // Handle translations
    if (translations) {
        const existingTranslationIds = (await modelSeriesRepository.findTranslationsForSeries(id)).map(t => t.language_id);
        const updatedTranslationLangIds = translations.map(t => t.language_id);

        // 1. Delete translations that are not in the new list
        const translationsToDelete = existingTranslationIds.filter(langId => !updatedTranslationLangIds.includes(langId));
        if(translationsToDelete.length > 0){
           const transRecordsToDelete = await db.query.modelSeriesTranslations.findMany({
               where: and(
                   eq(modelSeriesTranslations.series_id, id),
                   inArray(modelSeriesTranslations.language_id, translationsToDelete)
               ),
               columns: { id: true }
           });
           if (transRecordsToDelete.length > 0) {
                await db.delete(modelSeriesTranslations).where(inArray(modelSeriesTranslations.id, transRecordsToDelete.map(t => t.id)));
           }
        }

        // 2. Update existing or create new translations
        for (const transData of translations) {
            const existingTranslation = await modelSeriesRepository.findTranslation(id, transData.language_id);
            if (existingTranslation) {
                // Update existing
                await modelSeriesRepository.updateTranslation(existingTranslation.id, transData);
            } else {
                // Create new
                await modelSeriesRepository.createTranslation({ ...transData, series_id: id });
            }
        }
    }

    // Return the updated model series with translations
    return modelSeriesRepository.findById(id);
  }

  async deleteModelSeries(id: number) {
    // Check if model series exists
    const modelSeries = await modelSeriesRepository.findById(id, false);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with ID ${id} not found.`);
    }

    // Delete the model series images from S3 if they exist
    if (modelSeries.icon_image) {
      try {
        await s3Service.deleteFile(modelSeries.icon_image);
      } catch (error) {
        console.error(`Failed to delete icon image for model series ${id}:`, error);
        // Continue with deletion even if icon deletion fails
      }
    }

    if (modelSeries.image) {
      try {
        await s3Service.deleteFile(modelSeries.image);
      } catch (error) {
        console.error(`Failed to delete main image for model series ${id}:`, error);
        // Continue with deletion even if image deletion fails
      }
    }
    
    // Repository handles deleting model series and its translations
    const success = await modelSeriesRepository.delete(id);
    if (!success) {
      throw new InternalServerError(`Failed to delete model series with ID ${id}.`);
    }
    return { success: true };
  }

  /**
   * Upload an icon image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded icon
   */
  async uploadModelSeriesIcon(id: number, file: File | Blob) {
    // Check if model series exists
    const modelSeries = await modelSeriesRepository.findById(id, false);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with ID ${id} not found.`);
    }

    // Delete old icon if it exists
    if (modelSeries.icon_image) {
      try {
        await s3Service.deleteFile(modelSeries.icon_image);
      } catch (error) {
        console.error(`Failed to delete old icon for model series ${id}:`, error);
        // Continue with upload even if old icon deletion fails
      }
    }

    // Generate a unique filename for the icon
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'png';
    const key = `model-series/${id}/icon-${timestamp}.${fileExtension}`;

    // Upload the file to S3
    const iconUrl = await s3Service.uploadFile(file, key, file.type);

    // Update the model series with the new icon URL
    await modelSeriesRepository.update(id, { icon_image: iconUrl });

    return { iconUrl };
  }

  /**
   * Upload a main image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded image
   */
  async uploadModelSeriesImage(id: number, file: File | Blob) {
    // Check if model series exists
    const modelSeries = await modelSeriesRepository.findById(id, false);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with ID ${id} not found.`);
    }

    // Delete old image if it exists
    if (modelSeries.image) {
      try {
        await s3Service.deleteFile(modelSeries.image);
      } catch (error) {
        console.error(`Failed to delete old image for model series ${id}:`, error);
        // Continue with upload even if old image deletion fails
      }
    }

    // Generate a unique filename for the image
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'png';
    const key = `model-series/${id}/image-${timestamp}.${fileExtension}`;

    // Upload the file to S3
    const imageUrl = await s3Service.uploadFile(file, key, file.type);

    // Update the model series with the new image URL
    await modelSeriesRepository.update(id, { image: imageUrl });

    return { imageUrl };
  }

  // --- Translation Service Methods ---

  async getAllModelSeriesTranslations(seriesId: number) {
    // Check if model series exists
    const seriesExists = await modelSeriesRepository.findById(seriesId, false);
    if (!seriesExists) {
      throw new NotFoundError(`Model Series with ID ${seriesId} not found.`);
    }
    return modelSeriesRepository.findTranslationsForSeries(seriesId);
  }

  async getModelSeriesTranslation(seriesId: number, languageId: number) {
    const translation = await modelSeriesRepository.findTranslation(seriesId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for model series ID ${seriesId} and language ID ${languageId}.`);
    }
    return translation;
  }

  async createModelSeriesTranslation(seriesId: number, data: typeof ModelSeriesTranslationCreateSingleSchema._type): Promise<TModelSeriesTranslationInsert> {
    // 1. Check if model series exists
    const seriesExists = await modelSeriesRepository.findById(seriesId, false);
    if (!seriesExists) {
      throw new NotFoundError(`Model Series with ID ${seriesId} not found.`);
    }

    // 2. Check if language exists
    const languageExists = await db.query.languages.findFirst({ where: eq(languages.id, data.language_id) });
    if (!languageExists) {
        throw new NotFoundError(`Language with ID ${data.language_id} not found.`);
    }

    // 3. Check if translation already exists
    const existing = await modelSeriesRepository.findTranslation(seriesId, data.language_id);
    if (existing) {
        throw new BadRequestError(`Translation for model series ID ${seriesId} and language ID ${data.language_id} already exists.`);
    }

    // 4. Create translation
    const translationData: TModelSeriesTranslationInsert = {
        ...data,
        series_id: seriesId
    };
    const newTranslation = await modelSeriesRepository.createTranslation(translationData);
    if (!newTranslation) {
        throw new InternalServerError('Failed to create model series translation.');
    }
    return newTranslation;
  }

  async updateModelSeriesTranslation(seriesId: number, languageId: number, data: typeof ModelSeriesTranslationUpdateSingleSchema._type) {
    // Check if translation exists before updating
    const existingTranslation = await modelSeriesRepository.findTranslation(seriesId, languageId);
    if (!existingTranslation) {
      throw new NotFoundError(`Translation not found for model series ID ${seriesId} and language ID ${languageId} to update.`);
    }

    // Use the specific update method from the repository
    const updatedTranslation = await modelSeriesRepository.updateTranslationBySeriesAndLanguage(seriesId, languageId, data);
    if (!updatedTranslation) {
        throw new InternalServerError('Failed to update model series translation.');
    }
    return updatedTranslation;
  }

  async deleteModelSeriesTranslation(seriesId: number, languageId: number): Promise<boolean> {
    // Use the specific delete method from the repository
    const success = await modelSeriesRepository.deleteTranslation(seriesId, languageId);
    if (!success) {
        // This could mean the translation didn't exist
        throw new NotFoundError(`Translation not found for model series ID ${seriesId} and language ID ${languageId} to delete.`);
    }
    return true;
  }

  async upsertModelSeriesTranslation(seriesId: number, languageId: number, data: typeof ModelSeriesTranslationCreateSingleSchema._type) {
    // 1. Check if model series exists
    const seriesExists = await modelSeriesRepository.findById(seriesId, false);
    if (!seriesExists) {
      throw new NotFoundError(`Model Series with ID ${seriesId} not found.`);
    }

    // 2. Check if language exists
    const languageExists = await db.query.languages.findFirst({ where: eq(languages.id, languageId) });
    if (!languageExists) {
        throw new NotFoundError(`Language with ID ${languageId} not found.`);
    }

    // 3. Check if translation already exists
    const existingTranslation = await modelSeriesRepository.findTranslation(seriesId, languageId);
    
    if (existingTranslation) {
      // Update existing translation
      const updatedTranslation = await modelSeriesRepository.updateTranslationBySeriesAndLanguage(seriesId, languageId, data);
      if (!updatedTranslation) {
          throw new InternalServerError('Failed to update model series translation.');
      }
      return updatedTranslation;
    } else {
      // Create new translation
      const translationData: TModelSeriesTranslationInsert = {
          ...data,
          series_id: seriesId,
          language_id: languageId
      };
      const newTranslation = await modelSeriesRepository.createTranslation(translationData);
      if (!newTranslation) {
          throw new InternalServerError('Failed to create model series translation.');
      }
      return newTranslation;
    }
  }

  async bulkUpsertTranslations(seriesId: number, translations: Array<{
    language_id: number;
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  }>) {
    // Check if model series exists
    const modelSeries = await modelSeriesRepository.findById(seriesId, false);
    if (!modelSeries) {
      throw new NotFoundError(`Model Series with ID ${seriesId} not found.`);
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
            const language = await db.query.languages.findFirst({ 
              where: eq(languages.id, translation.language_id) 
            });
            if (!language) {
              results.errors.push({
                language_id: translation.language_id,
                error: 'Language not found'
              });
              return;
            }

            // Check if translation exists
            const existingTranslation = await modelSeriesRepository.findTranslation(
              seriesId, 
              translation.language_id
            );

            if (existingTranslation) {
              // Update existing translation
              await modelSeriesRepository.updateTranslationBySeriesAndLanguage(seriesId, translation.language_id, translation);
              results.updated++;
            } else {
              // Create new translation
              const translationData: TModelSeriesTranslationInsert = {
                ...translation,
                series_id: seriesId,
                language_id: translation.language_id
              };
              await modelSeriesRepository.createTranslation(translationData);
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
   * Get model series published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @returns Paginated list of model series published in the shop
   */
  async getPublishedInShop(shopId: number, options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    clientId?: number;
  }) {
    // Check if shop exists
    const shop = await db.query.shops.findFirst({
      where: eq(shops.id, shopId)
    });

    if (!shop) {
      throw new NotFoundError(`Shop with ID ${shopId} not found.`);
    }

    return modelSeriesRepository.findPublishedInShop(
      shopId,
      options.page || 1,
      options.limit || 20,
      options.orderBy || 'title',
      options.order || 'asc',
      options.search,
      options.clientId
    );
  }
}

export const modelSeriesService = new ModelSeriesService();
