import { Elysia } from 'elysia';
import { questionSetController } from '../controllers/questionSetController';
import {
  QuestionSetCreateSchema,
  QuestionSetUpdateSchema,
  QuestionSetIdParamSchema,
  QuestionSetWithQuestionsCreateSchema,
  QuestionSetWithQuestionsAndTranslationsCreateSchema,
  QuestionSetTranslationCreateSchema,
  PaginationQuerySchema,
  AssignmentIdParamSchema,
  ModelQuestionSetAssignmentParamsSchema,
  GetAssignmentsByModelIdParamsSchema,
  GetAssignmentsByQuestionSetIdParamsSchema
} from '../types/questionSetTypes';
import { t } from 'elysia';
import { authMiddleware, type JwtUser } from '@/middleware/auth';
import { getClientId } from '../utils/getId';

// Create and export the question set routes
export const questionSetRoutes = new Elysia({ prefix: '/question-sets' })
  .use(authMiddleware.isAuthenticated) // Add centralized authentication middleware
  // GET all question sets
  .get('/', 
    async (ctx) => {
      const { page, limit, orderBy, order, clientId, search } = ctx.query;
      let client_id: number | undefined = clientId || getClientId(ctx.user!);  
      return await questionSetController.getAllQuestionSets(page, limit, orderBy, order, client_id, search);
    }, {
      query: PaginationQuerySchema,
      detail: {
        summary: 'Get all question sets',
        description: 'Retrieve a paginated list of all question sets',
        tags: ['Question Sets']
      }
    }
  )
  
  // GET question set by ID
  .get('/:questionSetId', 
    async ({ params }) => {
      return await questionSetController.getQuestionSetById(params.questionSetId);
    }, {
      params: QuestionSetIdParamSchema,
      detail: {
        summary: 'Get question set by ID',
        description: 'Retrieve a single question set by its ID',
        tags: ['Question Sets']
      }
    }
  )
  
  // GET question set by internal name
  .get('/by-name/:internalName/client/:clientId', 
    async ({ params }) => {
      return await questionSetController.getQuestionSetByInternalName(params.internalName, params.clientId);
    }, {
      params: t.Object({
        internalName: t.String(),
        clientId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Get question set by internal name',
        description: 'Retrieve a single question set by its internal name and client ID',
        tags: ['Question Sets']
      }
    }
  )
  
  // POST create new question set
  .post('/', 
    async ({ body, user }) => {
      const clientId = getClientId(user!) || 0;
      return await questionSetController.createQuestionSet(body, clientId);
    }, {
      body: QuestionSetCreateSchema,
      detail: {
        summary: 'Create a new question set',
        description: 'Create a new question set template',
        tags: ['Question Sets']
      }
    }
  )
  
  // PUT update question set
  .put('/:questionSetId', 
    async ({ params, body }) => {
      return await questionSetController.updateQuestionSet(params.questionSetId, body);
    }, {
      params: QuestionSetIdParamSchema,
      body: QuestionSetUpdateSchema,
      detail: {
        summary: 'Update question set',
        description: 'Update an existing question set template by its ID',
        tags: ['Question Sets']
      }
    }
  )
  
  // DELETE question set
  .delete('/:questionSetId', 
    async ({ params }) => {
      return await questionSetController.deleteQuestionSet(params.questionSetId);
    }, {
      params: QuestionSetIdParamSchema,
      detail: {
        summary: 'Delete question set',
        description: 'Delete a question set template by its ID',
        tags: ['Question Sets']
      }
    }
  )
  
  // POST create question set with questions and options
  .post('/with-questions', 
    async ({ body , user, set}) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized'
        }
      }
      const clientId = getClientId(user) || 0;
      return await questionSetController.createQuestionSetWithQuestions(body, clientId);
    }, {
      body: QuestionSetWithQuestionsCreateSchema,
      detail: {
        summary: 'Create question set with questions',
        description: 'Create a new question set with multiple questions and options in one request',
        tags: ['Question Sets']
      }
    }
  )
  
  // POST create question set with questions, options, and translations
  .post('/with-questions-and-translations', 
    async ({ body , user, set}) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized'
        }
      }
      const clientId = getClientId(user) || 0;
      return await questionSetController.createQuestionSetWithQuestionsAndTranslations(body, clientId);
    }, {
      body: QuestionSetWithQuestionsAndTranslationsCreateSchema,
      detail: {
        summary: 'Create question set with questions and translations',
        description: 'Create a new question set with questions, options, and translations in one request',
        tags: ['Question Sets']
      }
    }
  )
  
  // Translation endpoints
  
  // GET translations by question set
  .get('/:questionSetId/translations', 
    async ({ params }) => {
      return await questionSetController.getTranslationsByQuestionSet(params.questionSetId);
    }, {
      params: QuestionSetIdParamSchema,
      detail: {
        summary: 'Get question set translations',
        description: 'Retrieve all translations for a specific question set',
        tags: ['Question Set Translations']
      }
    }
  )
  
  // POST create translation
  .post('/:questionSetId/translations', 
    async ({ params, body }) => {
      return await questionSetController.createTranslation(params.questionSetId, body);
    }, {
      params: QuestionSetIdParamSchema,
      body: QuestionSetTranslationCreateSchema,
      detail: {
        summary: 'Create question set translation',
        description: 'Create a new translation for a question set',
        tags: ['Question Set Translations']
      }
    }
  )
  
  // PUT update translation
  .put('/:questionSetId/translations/:languageId', 
    async ({ params, body }) => {
      return await questionSetController.updateTranslation(params.questionSetId, params.languageId, body);
    }, {
      params: t.Object({ 
        questionSetId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: t.Object({
        displayName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        description: t.Optional(t.String())
      }),
      detail: {
        summary: 'Update question set translation',
        description: 'Update an existing translation for a question set',
        tags: ['Question Set Translations']
      }
    }
  )
  
  // DELETE translation
  .delete('/:questionSetId/translations/:languageId', 
    async ({ params }) => {
      return await questionSetController.deleteTranslation(params.questionSetId, params.languageId);
    }, {
      params: t.Object({ 
        questionSetId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Delete question set translation',
        description: 'Delete a translation for a question set',
        tags: ['Question Set Translations']
      }
    }
  )
  
  // Question translation endpoints
  
  // GET question translations
  .get('/questions/:questionId/translations', 
    async ({ params }) => {
      return await questionSetController.getQuestionTranslations(params.questionId);
    }, {
      params: t.Object({ 
        questionId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Get question translations',
        description: 'Retrieve all translations for a specific question',
        tags: ['Question Translations']
      }
    }
  )
  
  // POST create question translation
  .post('/questions/:questionId/translations', 
    async ({ params, body }) => {
      return await questionSetController.createQuestionTranslation(params.questionId, body);
    }, {
      params: t.Object({ 
        questionId: t.Numeric({ minimum: 1 })
      }),
      body: t.Object({
        languageId: t.Numeric({ minimum: 1 }),
        title: t.String({ minLength: 1, maxLength: 255 }),
        tooltip: t.Optional(t.String()),
        category: t.Optional(t.String({ maxLength: 100 }))
      }),
      detail: {
        summary: 'Create question translation',
        description: 'Create a new translation for a question',
        tags: ['Question Translations']
      }
    }
  )
  
  // PUT update question translation
  .put('/questions/:questionId/translations/:languageId', 
    async ({ params, body }) => {
      return await questionSetController.updateQuestionTranslation(params.questionId, params.languageId, body);
    }, {
      params: t.Object({ 
        questionId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        tooltip: t.Optional(t.String()),
        category: t.Optional(t.String({ maxLength: 100 }))
      }),
      detail: {
        summary: 'Update question translation',
        description: 'Update an existing translation for a question',
        tags: ['Question Translations']
      }
    }
  )
  
  // DELETE question translation
  .delete('/questions/:questionId/translations/:languageId', 
    async ({ params }) => {
      return await questionSetController.deleteQuestionTranslation(params.questionId, params.languageId);
    }, {
      params: t.Object({ 
        questionId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Delete question translation',
        description: 'Delete a translation for a question',
        tags: ['Question Translations']
      }
    }
  )
  
  // Option translation endpoints
  
  // GET option translations
  .get('/options/:optionId/translations', 
    async ({ params }) => {
      return await questionSetController.getOptionTranslations(params.optionId);
    }, {
      params: t.Object({ 
        optionId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Get option translations',
        description: 'Retrieve all translations for a specific option',
        tags: ['Option Translations']
      }
    }
  )
  
  // POST create option translation
  .post('/options/:optionId/translations', 
    async ({ params, body }) => {
      return await questionSetController.createOptionTranslation(params.optionId, body);
    }, {
      params: t.Object({ 
        optionId: t.Numeric({ minimum: 1 })
      }),
      body: t.Object({
        languageId: t.Numeric({ minimum: 1 }),
        title: t.String({ minLength: 1, maxLength: 255 })
      }),
      detail: {
        summary: 'Create option translation',
        description: 'Create a new translation for an option',
        tags: ['Option Translations']
      }
    }
  )
  
  // PUT update option translation
  .put('/options/:optionId/translations/:languageId', 
    async ({ params, body }) => {
      return await questionSetController.updateOptionTranslation(params.optionId, params.languageId, body);
    }, {
      params: t.Object({ 
        optionId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 255 }))
      }),
      detail: {
        summary: 'Update option translation',
        description: 'Update an existing translation for an option',
        tags: ['Option Translations']
      }
    }
  )
  
  // DELETE option translation
  .delete('/options/:optionId/translations/:languageId', 
    async ({ params }) => {
      return await questionSetController.deleteOptionTranslation(params.optionId, params.languageId);
    }, {
      params: t.Object({ 
        optionId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Delete option translation',
        description: 'Delete a translation for an option',
        tags: ['Option Translations']
      }
    }
  )
  
  // Model assignment endpoints
  
  // GET question sets for a model
  .get('/for-model/:modelId', 
    async ({ params }) => {
      return await questionSetController.getQuestionSetsForModel(params.modelId);
    }, {
      params: GetAssignmentsByModelIdParamsSchema,
      detail: {
        summary: 'Get question sets for model',
        description: 'Retrieve all question sets assigned to a specific device model',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // GET models for a question set
  .get('/:questionSetId/models', 
    async (ctx) => {
      const { page, limit } = ctx.query;
      const compliantCtx = {
        ...ctx,
        query: {},
        params: {}
      };
      return await questionSetController.getModelsByQuestionSet(ctx.params.questionSetId, page, limit, compliantCtx);
    }, {
      params: GetAssignmentsByQuestionSetIdParamsSchema,
      query: t.Pick(PaginationQuerySchema, ['page', 'limit']),
      detail: {
        summary: 'Get models for question set',
        description: 'Retrieve all device models that have this question set assigned',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // POST assign question set to model
  .post('/assign-to-model', 
    async ({ body }) => {
      return await questionSetController.assignQuestionSetToModel(body);
    }, {
      body: t.Object({
        modelId: t.Numeric({ minimum: 1 }),
        questionSetId: t.Numeric({ minimum: 1 }),
        assignmentOrder: t.Numeric({ minimum: 0 })
      }),
      detail: {
        summary: 'Assign question set to model',
        description: 'Assign a question set to a device model',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // PUT update assignment
  .put('/assignments/:assignmentId', 
    async ({ params, body }) => {
      return await questionSetController.updateAssignment(params.assignmentId, body.assignmentOrder);
    }, {
      params: AssignmentIdParamSchema,
      body: t.Object({
        assignmentOrder: t.Numeric({ minimum: 0 })
      }),
      detail: {
        summary: 'Update assignment',
        description: 'Update an existing question set assignment',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // PUT update assignment by model and question set
  .put('/assignments/model/:modelId/question-set/:questionSetId', 
    async ({ params, body }) => {
      return await questionSetController.updateAssignmentByModelAndQuestionSet(
        params.modelId, 
        params.questionSetId, 
        body.assignmentOrder
      );
    }, {
      params: ModelQuestionSetAssignmentParamsSchema,
      body: t.Object({
        assignmentOrder: t.Numeric({ minimum: 0 })
      }),
      detail: {
        summary: 'Update assignment by model and question set',
        description: 'Update an existing question set assignment by model ID and question set ID',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // DELETE assignment
  .delete('/assignments/:assignmentId', 
    async ({ params }) => {
      return await questionSetController.deleteAssignment(params.assignmentId);
    }, {
      params: AssignmentIdParamSchema,
      detail: {
        summary: 'Delete assignment',
        description: 'Delete a question set assignment by its ID',
        tags: ['Question Set Assignments']
      }
    }
  )
  
  // DELETE assignment by model and question set
  .delete('/assignments/model/:modelId/question-set/:questionSetId', 
    async ({ params }) => {
      return await questionSetController.deleteAssignmentByModelAndQuestionSet(
        params.modelId, 
        params.questionSetId
      );
    }, {
      params: ModelQuestionSetAssignmentParamsSchema,
      detail: {
        summary: 'Delete assignment by model and question set',
        description: 'Delete a question set assignment by model ID and question set ID',
        tags: ['Question Set Assignments']
      }
    }
  ); 