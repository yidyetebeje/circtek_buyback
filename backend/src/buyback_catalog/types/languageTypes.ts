import { t, type Static } from 'elysia';
import { createSelectSchema, createInsertSchema } from 'drizzle-typebox';
import { languages } from '../../db/buyback_catalogue.schema';

// Base schema generated from Drizzle table
export const LanguageSchema = createSelectSchema(languages);

// Schema for creating a new language
export const LanguageInsertSchema = createInsertSchema(languages);

// Schema for request body when creating a language (omit generated fields)
export const LanguageCreateSchema = t.Omit(LanguageInsertSchema, ['id', 'createdAt', 'updatedAt']);

// Schema for request body when updating a language (make all fields optional)
export const LanguageUpdateSchema = t.Partial(LanguageCreateSchema);

// Schema for the response when returning a single language
export const LanguageResponseSchema = LanguageSchema;

// Schema for the response when returning a list of languages
export const LanguagesResponseSchema = t.Array(LanguageResponseSchema);

// Schema for validating the language ID in URL parameters
export const LanguageIdParamSchema = t.Object({
  id: t.Numeric({ minimum: 1, error: 'Language ID must be a positive number' })
});

// Static types for convenience
export type TLanguage = Static<typeof LanguageSchema>;
export type TLanguageCreate = Static<typeof LanguageCreateSchema>;
export type TLanguageUpdate = Static<typeof LanguageUpdateSchema>;
