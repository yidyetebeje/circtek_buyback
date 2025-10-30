import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export type TranslatableEntity = 'category' | 'brand' | 'model_series' | 'model' | 'question_set' | 'component_config' | 'faq';

export interface TranslationRequestData {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: Record<string, unknown>;
  // For question sets - hierarchical structure
  questions?: Array<{
    id?: number;
    title: string;
    tooltip?: string;
    category?: string;
    options?: Array<{
      id?: number;
      title: string;
    }>;
  }>;
  // For component configurations
  componentType?: 'hero' | 'categories' | 'header' | 'footer';
  componentTexts?: Record<string, string>; // Key-value pairs of text fields
}

export interface TranslationRequest {
  entityType: TranslatableEntity;
  sourceLanguage: string;
  targetLanguage: string;
  data: TranslationRequestData;
}

export interface TranslationResponse {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: Record<string, unknown>;
  // For question sets - hierarchical structure
  questions?: Array<{
    id?: number;
    title: string;
    tooltip?: string;
    category?: string;
    options?: Array<{
      id?: number;
      title: string;
    }>;
  }>;
}

// Zod schema for translation response validation
const translationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  specifications: z.record(z.unknown()).optional(),
  // For question sets - hierarchical structure
  questions: z.array(z.object({
    id: z.number().optional(),
    title: z.string().min(1, "Question title is required"),
    tooltip: z.string().optional(),
    category: z.string().optional(),
    options: z.array(z.object({
      id: z.number().optional(),
      title: z.string().min(1, "Option title is required"),
    })).optional(),
  })).optional(),
});

export class AITranslationService {
  private model: any;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      console.warn('GEMINI_API_KEY not configured. AI translation features will be disabled.');
      this.model = null;
      this.isEnabled = false;
      return;
    }
    
    // Set the API key in the environment for Vercel AI SDK
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    
    this.model = google('gemini-2.0-flash');
    this.isEnabled = true;
  }

  /**
   * Generate translation using Vercel AI SDK with structured output
   */
  async generateTranslation(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.isEnabled || !this.model) {
      throw new Error('AI Translation service is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    try {
      const contextualPrompt = this.buildContextualPrompt(request);
     
      
      // Use smaller token limit for question sets to prevent runaway generation
      const maxTokens = request.entityType === 'question_set' ? 1000 : 1500;
      
      const { object } = await generateObject({
        model: this.model,
        temperature: 0.1,
        maxTokens: maxTokens,
        prompt: contextualPrompt,
        schema: translationSchema,
      });

     

      // Validate and sanitize the response
      const validatedTranslation = translationSchema.parse(object);
      
      // Ensure we have a valid translation response
      if (!validatedTranslation.title?.trim()) {
        throw new Error("AI translation failed: missing title");
      }

      return this.sanitizeTranslation(validatedTranslation as TranslationResponse);
    } catch (error) {
      console.error('AI Translation Error:', error);
      
      // Retry with a simpler prompt for question sets if it failed
      if (request.entityType === 'question_set' && (error instanceof Error && error.message.includes('could not parse'))) {
       
        return this.generateSimpleQuestionSetTranslation(request);
      }
      
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simplified translation for question sets when complex prompt fails
   */
  private async generateSimpleQuestionSetTranslation(request: TranslationRequest): Promise<TranslationResponse> {
    const { sourceLanguage, targetLanguage, data } = request;
    
    // Build a very simple, structured translation
    const response: TranslationResponse = {
      title: data.title,
      description: data.description || '',
      questions: data.questions?.map(q => ({
        id: q.id,
        title: q.title,
        tooltip: q.tooltip ? q.tooltip.substring(0, 100) : '', // Limit tooltip length
        category: q.category || '',
        options: q.options?.map(o => ({
          id: o.id,
          title: o.title,
        })) || [],
      })) || [],
    };

    // For now, do simple translation using basic title translation only
    // This prevents the runaway generation issue
    try {
      const titlePrompt = `Translate "${data.title}" from ${sourceLanguage} to ${targetLanguage}. Return only the translated text, nothing else.`;
      
      const { object: titleObj } = await generateObject({
        model: this.model,
        temperature: 0.1,
        maxTokens: 50,
        prompt: titlePrompt,
        schema: z.object({ 
          translated_title: z.string() 
        }),
      });

      response.title = titleObj.translated_title || data.title;
      
      if (data.description) {
        const descPrompt = `Translate "${data.description}" from ${sourceLanguage} to ${targetLanguage}. Keep it brief. Return only the translated text.`;
        
        const { object: descObj } = await generateObject({
          model: this.model,
          temperature: 0.1,
          maxTokens: 100,
          prompt: descPrompt,
          schema: z.object({ 
            translated_description: z.string() 
          }),
        });

        response.description = descObj.translated_description || data.description;
      }

      // Translate questions individually to prevent runaway generation
      if (data.questions && data.questions.length > 0) {
        const translatedQuestions = [];
        
        for (const question of data.questions) {
          const questionPrompt = `Translate this question from ${sourceLanguage} to ${targetLanguage}: "${question.title}". Return only the translated question.`;
          
          const { object: questionObj } = await generateObject({
            model: this.model,
            temperature: 0.1,
            maxTokens: 50,
            prompt: questionPrompt,
            schema: z.object({ 
              translated_question: z.string() 
            }),
          });

          const translatedOptions = [];
          if (question.options) {
            for (const option of question.options) {
              const optionPrompt = `Translate this option from ${sourceLanguage} to ${targetLanguage}: "${option.title}". Return only the translated option.`;
              
              const { object: optionObj } = await generateObject({
                model: this.model,
                temperature: 0.1,
                maxTokens: 30,
                prompt: optionPrompt,
                schema: z.object({ 
                  translated_option: z.string() 
                }),
              });

              translatedOptions.push({
                id: option.id,
                title: optionObj.translated_option || option.title,
              });
            }
          }

          translatedQuestions.push({
            id: question.id,
            title: questionObj.translated_question || question.title,
            tooltip: question.tooltip ? `${question.tooltip.substring(0, 50)}...` : undefined, // Simple tooltip handling
            category: question.category,
            options: translatedOptions,
          });
        }
        
        response.questions = translatedQuestions;
      }

      return response;
    } catch (error) {
      // If even the simple approach fails, return basic structure with original text
      console.warn('Even simplified translation failed, returning basic structure');
      return {
        title: data.title,
        description: data.description || '',
        questions: data.questions?.map(q => ({
          id: q.id,
          title: q.title,
          tooltip: q.tooltip ? q.tooltip.substring(0, 50) : undefined,
          category: q.category,
          options: q.options?.map(o => ({
            id: o.id,
            title: o.title,
          })) || [],
        })) || [],
      };
    }
  }

  /**
   * Build contextual prompt based on entity type and data
   */
  private buildContextualPrompt(request: TranslationRequest): string {
    const { entityType, sourceLanguage, targetLanguage, data } = request;
    
    let entityContext = '';
    switch (entityType) {
      case 'category':
        entityContext = 'device category (like smartphones, laptops, tablets)';
        break;
      case 'brand':
        entityContext = 'technology brand (like Apple, Samsung, Dell)';
        break;
      case 'model_series':
        entityContext = 'device model series (like iPhone 15 series, MacBook Pro series)';
        break;
      case 'model':
        entityContext = 'specific device model (like iPhone 15 Pro Max, MacBook Pro 16-inch)';
        break;
      case 'question_set':
        entityContext = 'device question set (like condition assessment, damage evaluation, or functional testing questions)';
        break;
      case 'component_config':
        entityContext = 'website component configuration (like hero section, category buttons, navigation)';
        break;
      case 'faq':
        entityContext = 'frequently asked question and answer (customer service, support, or policy information)';
        break;
    }

    let prompt = `
Translate the following ${entityContext} information from ${sourceLanguage} to ${targetLanguage}.

CRITICAL GUIDELINES:
1. Maintain technical accuracy and brand consistency
2. Keep the marketing tone and appeal
3. Preserve any technical specifications without translation if they are universally understood
4. Optimize SEO meta fields for the target language market
5. Ensure cultural appropriateness for the target language
6. KEEP ALL TEXT CONCISE - avoid repetition or excessive elaboration
7. For tooltips and descriptions, provide clear but brief explanations

SOURCE DATA:
- Title: "${data.title}"`;

    if (data.description) {
      prompt += `\n- Description: "${data.description}"`;
    }

    if (entityType !== 'faq') {
      if (data.meta_title) {
        prompt += `\n- SEO Title: "${data.meta_title}"`;
      }

      if (data.meta_description) {
        prompt += `\n- SEO Description: "${data.meta_description}"`;
      }

      if (data.meta_keywords) {
        prompt += `\n- SEO Keywords: "${data.meta_keywords}"`;
      }

      if (data.specifications && Object.keys(data.specifications).length > 0) {
        prompt += `\n- Technical Specifications: ${JSON.stringify(data.specifications, null, 2)}`;
      }
    }

    // Handle question set hierarchical structure
    if (entityType === 'question_set' && data.questions && data.questions.length > 0) {
      prompt += `\n- Questions and Options:`;
      data.questions.forEach((question, qIndex) => {
        prompt += `\n  Question ${qIndex + 1}: "${question.title}"`;
        if (question.tooltip) {
          prompt += `\n    Tooltip: "${question.tooltip}"`;
        }
        if (question.category) {
          prompt += `\n    Category: "${question.category}"`;
        }
        if (question.options && question.options.length > 0) {
          prompt += `\n    Options:`;
          question.options.forEach((option, oIndex) => {
            prompt += `\n      ${oIndex + 1}. "${option.title}"`;
          });
        }
      });
    }

    prompt += `

TRANSLATION REQUIREMENTS:
- Return a JSON object with the translated content
- Keep all translations CONCISE and PROFESSIONAL
- For tooltips, provide helpful but brief explanations (max 1-2 sentences)
- For question sets, translate all questions and options accurately but concisely

Required JSON structure:
{
  "title": "Translated title",
  "description": "Translated description"`;

    if (entityType !== 'faq') {
      prompt += `,
  "meta_title": "SEO-optimized translated meta title (50-60 chars)",
  "meta_description": "SEO-optimized translated meta description (150-160 chars)",
  "meta_keywords": "Translated SEO keywords, comma-separated",
  "specifications": "Translated technical specifications maintaining key-value structure"`;
    }

    if (entityType === 'question_set') {
      prompt += `,
  "questions": [
    {
      "id": "preserve original ID if provided",
      "title": "Translated question title",
      "tooltip": "Brief translated tooltip (optional)",
      "category": "Translated category (optional)",
      "options": [
        {
          "id": "preserve original ID if provided",
          "title": "Translated option title"
        }
      ]
    }
  ]`;
    }

    prompt += `
}

Ensure all translations are accurate, culturally appropriate, maintain the original intent, and are CONCISE.`;

    return prompt;
  }

  /**
   * Build contextual prompt for component configuration translations
   */
  private buildComponentTranslationPrompt(
    componentType: 'hero' | 'categories' | 'header' | 'footer',
    sourceLanguage: string,
    targetLanguage: string,
    texts: Record<string, string>
  ): string {
    let componentContext = '';
    switch (componentType) {
      case 'hero':
        componentContext = 'hero section with headlines, subheadings, and call-to-action buttons';
        break;
      case 'categories':
        componentContext = 'category section with navigation buttons, action labels, and descriptive text';
        break;
      case 'header':
        componentContext = 'website header with navigation links, menu items, and user interface labels';
        break;
      case 'footer':
        componentContext = 'website footer with links, contact information, and legal text';
        break;
    }

    let prompt = `
Translate the following ${componentContext} texts from ${sourceLanguage} to ${targetLanguage}.

CRITICAL GUIDELINES:
1. Maintain the marketing tone and user experience appeal
2. Keep button texts concise and action-oriented
3. Ensure cultural appropriateness for the target language
4. Preserve any placeholder variables (like {deviceName}) exactly as they are
5. Make translations feel natural and native to the target language
6. Keep the same level of formality/informality as the source
7. IMPORTANT: Return ONLY a JSON object, NOT an array

SOURCE TEXTS:`;

    Object.entries(texts).forEach(([key, value]) => {
      prompt += `\n- ${key}: "${value}"`;
    });

    prompt += `

TRANSLATION REQUIREMENTS:
- Return ONLY a JSON object with the same keys as the source
- DO NOT wrap the object in an array or any other structure
- Translate each text value appropriately for the context
- Keep button texts short and compelling
- Preserve any placeholder variables (like {deviceName}) unchanged
- Ensure translations are culturally appropriate and engaging

Required JSON structure (return this EXACT format):
{`;

    Object.keys(texts).forEach((key, index) => {
      prompt += `\n  "${key}": "Translated text for ${key}"`;
      if (index < Object.keys(texts).length - 1) {
        prompt += ',';
      }
    });

    prompt += `
}

CRITICAL: Do not return an array. Return only the JSON object shown above with the translated values. Ensure all translations maintain the original intent, are culturally appropriate, and feel natural in the target language.`;

    return prompt;
  }

  /**
   * Sanitize and validate translation response
   */
  private sanitizeTranslation(data: TranslationResponse): TranslationResponse {
    const sanitized: TranslationResponse = {
      title: data.title?.trim() || '',
    };

    if (data.description?.trim()) {
      sanitized.description = data.description.trim();
    }

    if (data.meta_title?.trim()) {
      sanitized.meta_title = data.meta_title.trim();
    }

    if (data.meta_description?.trim()) {
      sanitized.meta_description = data.meta_description.trim();
    }

    if (data.meta_keywords?.trim()) {
      sanitized.meta_keywords = data.meta_keywords.trim();
    }

    if (data.specifications && typeof data.specifications === 'object') {
      sanitized.specifications = data.specifications;
    }

    // Handle questions array for question sets
    if (data.questions && Array.isArray(data.questions)) {
      sanitized.questions = data.questions.map(question => ({
        id: question.id,
        title: question.title?.trim() || '',
        tooltip: question.tooltip?.trim() || undefined,
        category: question.category?.trim() || undefined,
        options: question.options?.map(option => ({
          id: option.id,
          title: option.title?.trim() || '',
        })) || [],
      })).filter(question => question.title); // Filter out questions without titles
    }

    return sanitized;
  }

  /**
   * Generate multiple translations for different languages at once
   */
  async generateBulkTranslations(
    entityType: TranslatableEntity,
    sourceLanguage: string,
    targetLanguages: string[],
    data: TranslationRequestData
  ): Promise<Record<string, TranslationResponse>> {
    const results: Record<string, TranslationResponse> = {};
    
    // Process translations concurrently but with a reasonable limit
    const promises = targetLanguages.map(async (targetLang) => {
      try {
        const translation = await this.generateTranslation({
          entityType,
          sourceLanguage,
          targetLanguage: targetLang,
          data
        });
        return { language: targetLang, translation };
      } catch (error) {
        console.error(`Failed to translate to ${targetLang}:`, error);
        return { language: targetLang, translation: null };
      }
    });

    const translations = await Promise.all(promises);
    
    translations.forEach(({ language, translation }) => {
      if (translation) {
        results[language] = translation;
      }
    });

    return results;
  }

  /**
   * Generate AI translation specifically for component configurations
   */
  async generateComponentTranslation(
    componentType: 'hero' | 'categories' | 'header' | 'footer',
    sourceLanguage: string,
    targetLanguage: string,
    texts: Record<string, string>
  ): Promise<Record<string, string>> {
    if (!this.isEnabled || !this.model) {
      throw new Error('AI Translation service is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        const contextualPrompt = this.buildComponentTranslationPrompt(
          componentType,
          sourceLanguage,
          targetLanguage,
          texts
        );

        // Create a more specific schema based on the input keys
        const textKeys = Object.keys(texts);
        const schemaProperties: Record<string, z.ZodString> = {};
        textKeys.forEach(key => {
          schemaProperties[key] = z.string().min(1, `${key} translation is required`);
        });
        
        const dynamicTextsSchema = z.object(schemaProperties);
        
        const { object } = await generateObject({
          model: this.model,
          temperature: 0.1,
          maxTokens: 800,
          prompt: contextualPrompt,
          schema: dynamicTextsSchema,
        });

       

        // Check if the result is unexpectedly an array and try to extract the object
        let translationObject = object;
        if (Array.isArray(object) && object.length > 0 && typeof object[0] === 'object') {
          console.warn('AI returned array instead of object, extracting first element');
          translationObject = object[0];
        }

        // Validate that we have translations for all required keys
        const requiredKeys = Object.keys(texts);
        const translatedTexts: Record<string, string> = {};
        
        let allKeysTranslated = true;
        requiredKeys.forEach(key => {
          if (translationObject[key] && typeof translationObject[key] === 'string') {
            translatedTexts[key] = translationObject[key].trim();
          } else {
            allKeysTranslated = false;
            // Fallback to original text if translation failed
            translatedTexts[key] = texts[key];
          }
        });

        // If all keys were successfully translated, return the result
        if (allKeysTranslated || attempts >= maxAttempts) {
          return translatedTexts;
        }

        // If not all keys were translated and we have attempts left, retry
        console.warn(`Attempt ${attempts} failed to translate all keys, retrying...`);
        
      } catch (error) {
        console.error(`Component Translation Error (attempt ${attempts}):`, error);
        
        // If this is the last attempt, throw the error
        if (attempts >= maxAttempts) {
          throw new Error(`Component translation failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Fallback - return original texts if all attempts failed
    console.warn('All translation attempts failed, returning original texts');
    return texts;
  }
}

// Export singleton instance
export const aiTranslationService = new AITranslationService(); 