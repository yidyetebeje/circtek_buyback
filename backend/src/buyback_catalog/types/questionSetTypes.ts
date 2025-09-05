import { t } from 'elysia';

// Input type enum
export const InputTypeEnum = {
  SINGLE_SELECT_RADIO: 'SINGLE_SELECT_RADIO',
  SINGLE_SELECT_DROPDOWN: 'SINGLE_SELECT_DROPDOWN',
  MULTI_SELECT_CHECKBOX: 'MULTI_SELECT_CHECKBOX',
  TEXT_INPUT: 'TEXT_INPUT',
  NUMBER_INPUT: 'NUMBER_INPUT'
} as const;

export type InputType = keyof typeof InputTypeEnum;

// Base Types
export type TQuestionSetBase = {
  internalName: string;
  displayName: string;
  description?: string;
  tenant_id: number;
};

export type TQuestionBase = {
  key?: string;
  title: string;
  inputType: InputType;
  tooltip?: string;
  category?: string;
  isRequired: boolean;
  orderNo: number;
  metadata?: Record<string, any>;
};

export type TQuestionOptionBase = {
  key?: string;
  title: string;
  priceModifier?: number;
  icon?: string;
  isDefault: boolean;
  orderNo: number;
  metadata?: Record<string, any>;
};

export type TQuestionSetAssignmentBase = {
  modelId: number;
  questionSetId: number;
  assignmentOrder: number;
};

// Create Types
export type TQuestionSetCreate = TQuestionSetBase;
export type TQuestionCreate = TQuestionBase & { questionSetId: number };
export type TQuestionOptionCreate = TQuestionOptionBase & { questionId: number };
export type TQuestionSetAssignmentCreate = TQuestionSetAssignmentBase;

// Translation Create Types
export type TQuestionSetTranslationCreate = {
  questionSetId: number;
  languageId: number;
  displayName: string;
  description?: string;
};

export type TQuestionTranslationCreate = {
  questionId: number;
  languageId: number;
  title: string;
  tooltip?: string;
  category?: string;
};

export type TQuestionOptionTranslationCreate = {
  optionId: number;
  languageId: number;
  title: string;
};

// Update Types
export type TQuestionSetUpdate = Partial<TQuestionSetBase>;
export type TQuestionUpdate = Partial<TQuestionBase>;
export type TQuestionOptionUpdate = Partial<TQuestionOptionBase>;
export type TQuestionSetAssignmentUpdate = Partial<Omit<TQuestionSetAssignmentBase, 'modelId' | 'questionSetId'>>;

// Translation Update Types
export type TQuestionSetTranslationUpdate = Partial<Omit<TQuestionSetTranslationCreate, 'questionSetId' | 'languageId'>>;
export type TQuestionTranslationUpdate = Partial<Omit<TQuestionTranslationCreate, 'questionId' | 'languageId'>>;
export type TQuestionOptionTranslationUpdate = Partial<Omit<TQuestionOptionTranslationCreate, 'optionId' | 'languageId'>>;

// Nested Types for bulk operations
export type TQuestionWithOptions = TQuestionCreate & {
  options: TQuestionOptionCreate[];
};

export type TQuestionSetWithQuestions = TQuestionSetCreate & {
  questions: TQuestionWithOptions[];
};

export type TQuestionSetWithTranslations = TQuestionSetCreate & {
  translations: Omit<TQuestionSetTranslationCreate, 'questionSetId'>[];
};

export type TQuestionWithTranslations = TQuestionCreate & {
  translations: Omit<TQuestionTranslationCreate, 'questionId'>[];
};

export type TQuestionOptionWithTranslations = TQuestionOptionCreate & {
  translations: Omit<TQuestionOptionTranslationCreate, 'optionId'>[];
};

export type TQuestionSetWithQuestionsAndTranslations = TQuestionSetCreate & {
  translations: Omit<TQuestionSetTranslationCreate, 'questionSetId'>[];
  questions: (TQuestionCreate & {
    translations: Omit<TQuestionTranslationCreate, 'questionId'>[];
    options: (TQuestionOptionCreate & {
      translations: Omit<TQuestionOptionTranslationCreate, 'optionId'>[];
    })[];
  })[];
};

// Parameter Schemas
export const QuestionSetIdParamSchema = t.Object({
  questionSetId: t.Numeric({ minimum: 1 })
});

export const QuestionIdParamSchema = t.Object({
  questionId: t.Numeric({ minimum: 1 })
});

export const OptionIdParamSchema = t.Object({
  optionId: t.Numeric({ minimum: 1 })
});

export const AssignmentIdParamSchema = t.Object({
  assignmentId: t.Numeric({ minimum: 1 })
});

// Validation Schemas

// QuestionSet Schemas
export const QuestionSetCreateSchema = t.Object({
  internalName: t.String({ minLength: 1, maxLength: 255 }),
  displayName: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  client_id: t.Numeric({ minimum: 1 })
});

export const QuestionSetUpdateSchema = t.Object({
  internalName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  displayName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.String()),
  client_id: t.Optional(t.Numeric({ minimum: 1 }))
});

// Question Schemas
export const QuestionCreateSchema = t.Object({
  questionSetId: t.Optional(t.Numeric({ minimum: 1 })),
  key: t.Optional(t.String({ maxLength: 100 })),
  title: t.String({ minLength: 1, maxLength: 255 }),
  inputType: t.Enum(InputTypeEnum),
  tooltip: t.Optional(t.String()),
  category: t.Optional(t.String({ maxLength: 100 })),
  isRequired: t.Boolean(),
  orderNo: t.Numeric({ minimum: 0 }),
  metadata: t.Optional(t.Record(t.String(), t.Any()))
});

export const QuestionUpdateSchema = t.Object({
  key: t.Optional(t.String({ maxLength: 100 })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  inputType: t.Optional(t.Enum(InputTypeEnum)),
  tooltip: t.Optional(t.String()),
  category: t.Optional(t.String({ maxLength: 100 })),
  isRequired: t.Optional(t.Boolean()),
  orderNo: t.Optional(t.Numeric({ minimum: 0 })),
  metadata: t.Optional(t.Record(t.String(), t.Any()))
});

// QuestionOption Schemas
export const QuestionOptionCreateSchema = t.Object({
  questionId: t.Numeric({ minimum: 1 }),
  key: t.Optional(t.String({ maxLength: 100 })),
  title: t.String({ minLength: 1, maxLength: 255 }),
  priceModifier: t.Optional(t.Numeric()),
  icon: t.Optional(t.String({ maxLength: 255 })),
  isDefault: t.Boolean(),
  orderNo: t.Numeric({ minimum: 0 }),
  metadata: t.Optional(t.Record(t.String(), t.Any()))
});

export const QuestionOptionUpdateSchema = t.Object({
  key: t.Optional(t.String({ maxLength: 100 })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  priceModifier: t.Optional(t.Numeric()),
  icon: t.Optional(t.String({ maxLength: 255 })),
  isDefault: t.Optional(t.Boolean()),
  orderNo: t.Optional(t.Numeric({ minimum: 0 })),
  metadata: t.Optional(t.Record(t.String(), t.Any()))
});

// Assignment Schemas
export const QuestionSetAssignmentCreateSchema = t.Object({
  modelId: t.Numeric({ minimum: 1 }),
  questionSetId: t.Numeric({ minimum: 1 }),
  assignmentOrder: t.Numeric({ minimum: 0 })
});

export const QuestionSetAssignmentUpdateSchema = t.Object({
  assignmentOrder: t.Numeric({ minimum: 0 })
});

// Translation Schemas
export const QuestionSetTranslationCreateSchema = t.Object({
  languageId: t.Numeric({ minimum: 1 }),
  displayName: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String())
});

export const QuestionTranslationCreateSchema = t.Object({
  languageId: t.Numeric({ minimum: 1 }),
  title: t.String({ minLength: 1, maxLength: 255 }),
  tooltip: t.Optional(t.String()),
  category: t.Optional(t.String({ maxLength: 100 }))
});

export const QuestionOptionTranslationCreateSchema = t.Object({
  languageId: t.Numeric({ minimum: 1 }),
  title: t.String({ minLength: 1, maxLength: 255 })
});

// Nested Create Schemas
export const QuestionWithOptionsCreateSchema = t.Composite([
  QuestionCreateSchema,
  t.Object({
    options: t.Array(t.Composite([
      t.Object({
        key: t.Optional(t.String({ maxLength: 100 })),
        title: t.String({ minLength: 1, maxLength: 255 }),
        priceModifier: t.Optional(t.Numeric()),
        icon: t.Optional(t.String({ maxLength: 255 })),
        isDefault: t.Boolean(),
        orderNo: t.Numeric({ minimum: 0 }),
        metadata: t.Optional(t.Record(t.String(), t.Any()))
      })
    ]))
  })
]);

export const QuestionSetWithQuestionsCreateSchema = t.Composite([
  QuestionSetCreateSchema,
  t.Object({
    questions: t.Array(QuestionWithOptionsCreateSchema)
  })
]);

// Translation Nested Schemas
export const QuestionSetWithTranslationsCreateSchema = t.Composite([
  QuestionSetCreateSchema,
  t.Object({
    translations: t.Array(t.Object({
      languageId: t.Numeric({ minimum: 1 }),
      displayName: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String())
    }))
  })
]);

// Complete Schema with all nested elements
export const QuestionSetWithQuestionsAndTranslationsCreateSchema = t.Composite([
  QuestionSetCreateSchema,
  t.Object({
    translations: t.Array(t.Object({
      languageId: t.Numeric({ minimum: 1 }),
      displayName: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String())
    })),
    questions: t.Array(t.Composite([
      t.Object({
        key: t.Optional(t.String({ maxLength: 100 })),
        title: t.String({ minLength: 1, maxLength: 255 }),
        inputType: t.Enum(InputTypeEnum),
        tooltip: t.Optional(t.String()),
        category: t.Optional(t.String({ maxLength: 100 })),
        isRequired: t.Boolean(),
        orderNo: t.Numeric({ minimum: 0 }),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        translations: t.Optional(t.Array(t.Object({
          languageId: t.Numeric({ minimum: 1 }),
          title: t.String({ minLength: 1, maxLength: 255 }),
          tooltip: t.Optional(t.String()),
          category: t.Optional(t.String({ maxLength: 100 }))
        }))),
        options: t.Array(t.Composite([
          t.Object({
            key: t.Optional(t.String({ maxLength: 100 })),
            title: t.String({ minLength: 1, maxLength: 255 }),
            priceModifier: t.Optional(t.Numeric()),
            icon: t.Optional(t.String({ maxLength: 255 })),
            isDefault: t.Boolean(),
            orderNo: t.Numeric({ minimum: 0 }),
            metadata: t.Optional(t.Record(t.String(), t.Any())),
            translations: t.Optional(t.Array(t.Object({
              languageId: t.Numeric({ minimum: 1 }),
              title: t.String({ minLength: 1, maxLength: 255 })
            })))
          })
        ]))
      })
    ]))
  })
]);

// Query Parameter Schemas
export const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000, default: 20 })),
  orderBy: t.Optional(t.String()),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'asc' })),
  clientId: t.Optional(t.Numeric({ minimum: 1 })),
  search: t.Optional(t.String())
});

export const GetQuestionsBySetIdParamsSchema = t.Object({
  questionSetId: t.Numeric({ minimum: 1 })
});

export const GetQuestionOptionsByQuestionIdParamsSchema = t.Object({
  questionId: t.Numeric({ minimum: 1 })
});

export const GetAssignmentsByModelIdParamsSchema = t.Object({
  modelId: t.Numeric({ minimum: 1 })
});

export const GetAssignmentsByQuestionSetIdParamsSchema = t.Object({
  questionSetId: t.Numeric({ minimum: 1 })
});

export const ModelQuestionSetAssignmentParamsSchema = t.Object({
  modelId: t.Numeric({ minimum: 1 }),
  questionSetId: t.Numeric({ minimum: 1 })
});

export const TranslationParamsSchema = t.Object({
  entityId: t.Numeric({ minimum: 1 }),
  languageId: t.Numeric({ minimum: 1 })
}); 