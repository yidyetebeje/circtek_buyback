import { Context } from 'elysia';
import { aiTranslationService } from '../services/aiTranslationService';
import { 
  AITranslationRequest, 
  AIBulkTranslationRequest,
  AITranslationResponse 
} from '../types/aiTranslationTypes';

// Interface for component translation request
interface ComponentTranslationRequest {
  componentType: 'hero' | 'categories' | 'header' | 'footer';
  sourceLanguageCode: string;
  targetLanguageCode: string;
  texts: Record<string, string>;
}

export class AITranslationController {
  /**
   * Generate AI translation for a single language
   */
  async generateTranslation(body: AITranslationRequest, ctx: Context): Promise<{ success: boolean; data?: AITranslationResponse; error?: string }> {
    try {
      const { entityType, sourceLanguageCode, targetLanguageCode, data } = body;

      // Validate that source and target languages are different
      if (sourceLanguageCode === targetLanguageCode) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Source and target languages must be different'
        };
      }

      // Generate translation using AI service
      const translation = await aiTranslationService.generateTranslation({
        entityType,
        sourceLanguage: sourceLanguageCode,
        targetLanguage: targetLanguageCode,
        data
      });

      ctx.set.status = 200;
      return {
        success: true,
        data: translation
      };
    } catch (error) {
      console.error('AI Translation Controller Error:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation generation failed'
      };
    }
  }

  /**
   * Generate AI translations for multiple languages
   */
  async generateBulkTranslations(body: AIBulkTranslationRequest, ctx: Context): Promise<{ 
    success: boolean; 
    data?: Record<string, AITranslationResponse>; 
    errors?: Record<string, string>;
    error?: string;
  }> {
    try {
      const { entityType, sourceLanguageCode, targetLanguageCodes, data } = body;

      // Validate that source language is not in target languages
      if (targetLanguageCodes.includes(sourceLanguageCode)) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Source language cannot be included in target languages'
        };
      }

      // Validate maximum number of target languages (to prevent abuse)
      if (targetLanguageCodes.length > 10) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Maximum 10 target languages allowed per request'
        };
      }

      // Remove duplicates from target languages
      const uniqueTargetLanguages = [...new Set(targetLanguageCodes)];

      // Generate bulk translations
      const translations = await aiTranslationService.generateBulkTranslations(
        entityType,
        sourceLanguageCode,
        uniqueTargetLanguages,
        data
      );

      // Check if any translations failed
      const successfulTranslations: Record<string, AITranslationResponse> = {};
      const failedTranslations: Record<string, string> = {};

      uniqueTargetLanguages.forEach(langCode => {
        if (translations[langCode]) {
          successfulTranslations[langCode] = translations[langCode];
        } else {
          failedTranslations[langCode] = 'Translation failed';
        }
      });

      ctx.set.status = 200;
      return {
        success: true,
        data: successfulTranslations,
        ...(Object.keys(failedTranslations).length > 0 && { errors: failedTranslations })
      };
    } catch (error) {
      console.error('AI Bulk Translation Controller Error:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk translation generation failed'
      };
    }
  }

  /**
   * Health check for AI translation service
   */
  async healthCheck(ctx: Context): Promise<{ success: boolean; status: string; timestamp: string }> {
    try {
      const timestamp = new Date().toISOString();
      
      // Check if the service is properly configured
      try {
        // Try to access the service to see if it's configured
        const testRequest = {
          entityType: 'model' as const,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          data: { title: 'test' }
        };
        
        // This will throw an error if not configured, which we'll catch
        await aiTranslationService.generateTranslation(testRequest);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not configured')) {
          ctx.set.status = 503;
          return {
            success: false,
            status: 'AI Translation service is not configured. Please set GEMINI_API_KEY environment variable.',
            timestamp
          };
        }
        // For other errors (like network issues), we still consider the service configured
      }
      
      ctx.set.status = 200;
      return {
        success: true,
        status: 'AI Translation service is operational',
        timestamp
      };
    } catch (error) {
      console.error('AI Translation Health Check Error:', error);
      ctx.set.status = 503;
      return {
        success: false,
        status: 'AI Translation service is unavailable',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate AI translation for component configurations
   */
  async generateComponentTranslation(body: ComponentTranslationRequest, ctx: Context): Promise<{ 
    success: boolean; 
    data?: { translatedTexts: Record<string, string> }; 
    error?: string 
  }> {
    try {
      const { componentType, sourceLanguageCode, targetLanguageCode, texts } = body;

      // Validate that source and target languages are different
      if (sourceLanguageCode === targetLanguageCode) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Source and target languages must be different'
        };
      }

      // Validate that texts object is not empty
      if (!texts || Object.keys(texts).length === 0) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'At least one text field is required for translation'
        };
      }

      // Generate component translation using AI service
      const translatedTexts = await aiTranslationService.generateComponentTranslation(
        componentType,
        sourceLanguageCode,
        targetLanguageCode,
        texts
      );

      ctx.set.status = 200;
      return {
        success: true,
        data: { translatedTexts }
      };
    } catch (error) {
      console.error('Component Translation Controller Error:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Component translation generation failed'
      };
    }
  }
}

// Export singleton instance
export const aiTranslationController = new AITranslationController(); 