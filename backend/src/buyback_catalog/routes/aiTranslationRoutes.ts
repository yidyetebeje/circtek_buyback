import Elysia from 'elysia';
import { aiTranslationController } from '../controllers/aiTranslationController';
import { 
  AITranslationRequestSchema, 
  AIBulkTranslationRequestSchema 
} from '../types/aiTranslationTypes';
import { z } from 'zod';
import { authMiddleware, type JwtUser } from '@/middleware/auth';

// Schema for component translation requests
const ComponentTranslationRequestSchema = z.object({
  componentType: z.enum(['hero', 'categories', 'header', 'footer']),
  sourceLanguageCode: z.string().min(2, 'Source language code must be at least 2 characters'),
  targetLanguageCode: z.string().min(2, 'Target language code must be at least 2 characters'),
  texts: z.record(z.string().min(1, 'Text cannot be empty')),
});

export const aiTranslationRoutes = new Elysia({ prefix: '/ai-translation' })
  .use(authMiddleware.isAuthenticated) // Add centralized authentication middleware
  // POST /ai-translation/generate - Generate AI translation for a single language
  .post('/generate', 
    (ctx) => aiTranslationController.generateTranslation(ctx.body, ctx), 
    {
      body: AITranslationRequestSchema,
      detail: {
        summary: 'Generate AI Translation',
        description: 'Generate AI-powered translation for catalog entities using Google Gemini. Translates title, description, SEO meta fields, and specifications while maintaining context and marketing tone.',
        tags: ['AI Translation'],
        requestBody: {
          description: 'Translation request data including entity type, source/target languages, and content to translate',
          content: {
            'application/json': {
              example: {
                entityType: 'model',
                sourceLanguageCode: 'en',
                targetLanguageCode: 'es',
                data: {
                  title: 'iPhone 15 Pro Max',
                  description: 'The most advanced iPhone with titanium design and powerful A17 Pro chip',
                  meta_title: 'iPhone 15 Pro Max - Premium Smartphone | Buy Now',
                  meta_description: 'Discover the iPhone 15 Pro Max with titanium build, 48MP camera, and A17 Pro chip. Available in Natural Titanium, Blue Titanium, White Titanium, and Black Titanium.',
                  meta_keywords: 'iPhone 15 Pro Max, Apple smartphone, titanium phone, A17 Pro chip',
                  specifications: {
                    'display_size': '6.7 inches',
                    'storage_options': ['128GB', '256GB', '512GB', '1TB'],
                    'camera_main': '48MP',
                    'camera_ultra_wide': '12MP',
                    'camera_telephoto': '12MP',
                    'chip': 'A17 Pro',
                    'materials': 'Titanium'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Translation generated successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    title: 'iPhone 15 Pro Max',
                    description: 'El iPhone más avanzado con diseño de titanio y el potente chip A17 Pro',
                    meta_title: 'iPhone 15 Pro Max - Smartphone Premium | Comprar Ahora',
                    meta_description: 'Descubre el iPhone 15 Pro Max con construcción de titanio, cámara de 48MP y chip A17 Pro. Disponible en Titanio Natural, Titanio Azul, Titanio Blanco y Titanio Negro.',
                    meta_keywords: 'iPhone 15 Pro Max, smartphone Apple, teléfono titanio, chip A17 Pro',
                    specifications: {
                      'display_size': '6.7 pulgadas',
                      'storage_options': ['128GB', '256GB', '512GB', '1TB'],
                      'camera_main': '48MP',
                      'camera_ultra_wide': '12MP',
                      'camera_telephoto': '12MP',
                      'chip': 'A17 Pro',
                      'materials': 'Titanio'
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - validation errors',
            content: {
              'application/json': {
                example: {
                  success: false,
                  error: 'Source and target languages must be different'
                }
              }
            }
          },
          500: {
            description: 'Internal server error - translation failed',
            content: {
              'application/json': {
                example: {
                  success: false,
                  error: 'Translation generation failed'
                }
              }
            }
          }
        }
      }
    }
  )

  // POST /ai-translation/bulk-generate - Generate AI translations for multiple languages
  .post('/bulk-generate', 
    (ctx) => aiTranslationController.generateBulkTranslations(ctx.body, ctx), 
    {
      body: AIBulkTranslationRequestSchema,
      detail: {
        summary: 'Generate Bulk AI Translations',
        description: 'Generate AI-powered translations for multiple target languages simultaneously. Supports up to 10 target languages per request for efficient batch processing.',
        tags: ['AI Translation'],
        requestBody: {
          description: 'Bulk translation request data with multiple target languages',
          content: {
            'application/json': {
              example: {
                entityType: 'brand',
                sourceLanguageCode: 'en',
                targetLanguageCodes: ['es', 'fr', 'de', 'nl'],
                data: {
                  title: 'Apple',
                  description: 'Innovative technology company creating premium consumer electronics, software, and services',
                  meta_title: 'Apple - Premium Technology & Innovation | Official Store',
                  meta_description: 'Discover Apple\'s revolutionary products including iPhone, iPad, Mac, and Apple Watch. Experience cutting-edge technology and seamless integration.',
                  meta_keywords: 'Apple, iPhone, iPad, Mac, Apple Watch, technology, innovation'
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Bulk translations generated successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    'es': {
                      title: 'Apple',
                      description: 'Empresa tecnológica innovadora que crea electrónicos de consumo premium, software y servicios',
                      meta_title: 'Apple - Tecnología Premium e Innovación | Tienda Oficial',
                      meta_description: 'Descubre los productos revolucionarios de Apple incluyendo iPhone, iPad, Mac y Apple Watch. Experimenta tecnología de vanguardia e integración perfecta.',
                      meta_keywords: 'Apple, iPhone, iPad, Mac, Apple Watch, tecnología, innovación'
                    },
                    'fr': {
                      title: 'Apple',
                      description: 'Entreprise technologique innovante créant des appareils électroniques grand public haut de gamme, des logiciels et des services',
                      meta_title: 'Apple - Technologie Premium et Innovation | Boutique Officielle',
                      meta_description: 'Découvrez les produits révolutionnaires d\'Apple incluant iPhone, iPad, Mac et Apple Watch. Vivez une technologie de pointe et une intégration transparente.',
                      meta_keywords: 'Apple, iPhone, iPad, Mac, Apple Watch, technologie, innovation'
                    }
                  },
                  errors: {
                    'de': 'Translation failed'
                  }
                }
              }
            }
          }
        }
      }
    }
  )

  // GET /ai-translation/health - Health check for AI translation service
  .get('/health', 
    (ctx) => aiTranslationController.healthCheck(ctx), 
    {
      detail: {
        summary: 'AI Translation Service Health Check',
        description: 'Check if the AI translation service is operational and can connect to Google Gemini API',
        tags: ['AI Translation', 'Health Check'],
        responses: {
          200: {
            description: 'Service is operational',
            content: {
              'application/json': {
                example: {
                  success: true,
                  status: 'AI Translation service is operational',
                  timestamp: '2024-01-15T10:30:00.000Z'
                }
              }
            }
          },
          503: {
            description: 'Service is unavailable',
            content: {
              'application/json': {
                example: {
                  success: false,
                  status: 'AI Translation service is unavailable',
                  timestamp: '2024-01-15T10:30:00.000Z'
                }
              }
            }
          }
        }
      }
    }
  )

    // POST /ai-translation/component - Generate AI translation for component configurations
  .post('/component', 
    async (ctx) => {
      // Simple validation for component translation
      const { componentType, sourceLanguageCode, targetLanguageCode, texts } = ctx.body as any;
      
      if (sourceLanguageCode === targetLanguageCode) {
        return {
          success: false,
          error: 'Source and target languages must be different'
        };
      }

      try {
        const translatedTexts = await aiTranslationController.generateComponentTranslation(ctx.body as any, ctx);
        return translatedTexts;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Component translation failed'
        };
      }
    },
    {
      detail: {
        summary: 'Generate Component Configuration Translation',
        description: 'Generate AI-powered translations for website component configurations like hero sections, category buttons, and navigation elements.',
        tags: ['AI Translation', 'Component Configuration'],
        requestBody: {
          description: 'Component translation request with text fields to translate',
          content: {
            'application/json': {
              example: {
                componentType: 'categories',
                sourceLanguageCode: 'en',
                targetLanguageCode: 'es',
                texts: {
                  'getQuote': 'Get Quote',
                  'viewAll': 'View All',
                  'sellDevice': 'Sell {deviceName}',
                  'browseCategories': 'Browse Categories',
                  'selectDeviceCategory': 'Select Device Category'
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Component translation generated successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    translatedTexts: {
                      'getQuote': 'Obtener Cotización',
                      'viewAll': 'Ver Todo',
                      'sellDevice': 'Vender {deviceName}',
                      'browseCategories': 'Explorar Categorías',
                      'selectDeviceCategory': 'Seleccionar Categoría de Dispositivo'
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - validation errors',
            content: {
              'application/json': {
                example: {
                  success: false,
                  error: 'Source and target languages must be different'
                }
              }
            }
          }
        }
      }
    }
  ); 