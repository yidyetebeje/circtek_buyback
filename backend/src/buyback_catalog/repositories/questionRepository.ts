import { asc, desc, eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  device_questions,
  question_options,
  question_translations,
  question_option_translations
} from "../../db/buyback_catalogue.schema";
import {
  TQuestionCreate,
  TQuestionUpdate,
  TQuestionTranslationCreate,
  TQuestionOptionCreate,
  TQuestionOptionUpdate,
  TQuestionOptionTranslationCreate
} from "../types/questionSetTypes";

export class QuestionRepository {
  // Question CRUD operations
  async findAll(questionSetId: number, includeOptions = true, includeTranslations = true) {
    const questions = await db.select()
      .from(device_questions)
      .where(eq(device_questions.question_set_id, questionSetId))
      .orderBy(asc(device_questions.order_no));

    if (!includeOptions) return questions;

    const questionIds = questions.map(q => q.id);
    const options = questionIds.length > 0 ? await db.select()
      .from(question_options)
      .where(inArray(question_options.question_id, questionIds))
      .orderBy(asc(question_options.order_no)) : [];

    return questions.map(question => ({
      ...question,
      options: options.filter(opt => opt.question_id === question.id)
    }));
  }

  async findById(id: number, includeOptions = true, includeTranslations = true) {
    const question = await db.select()
      .from(device_questions)
      .where(eq(device_questions.id, id))
      .limit(1);

    if (question.length === 0) return null;

    const result = question[0];

    if (includeOptions) {
      const options = await db.select()
        .from(question_options)
        .where(eq(question_options.question_id, id))
        .orderBy(asc(question_options.order_no));

      return {
        ...result,
        options
      };
    }

    return result;
  }

  async findByKey(key: string, questionSetId: number) {
    const question = await db.select()
      .from(device_questions)
      .where(and(
        eq(device_questions.key, key),
        eq(device_questions.question_set_id, questionSetId)
      ))
      .limit(1);

    if (question.length === 0) return null;

    const result = question[0];

    const options = await db.select()
      .from(question_options)
      .where(eq(question_options.question_id, result.id))
      .orderBy(asc(question_options.order_no));

    return {
      ...result,
      options
    };
  }

  async create(data: TQuestionCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Apply defaults for optional fields (empty string also treated as undefined)
    const inputType = (data.inputType && data.inputType !== '') ? data.inputType : 'SINGLE_SELECT_RADIO';
    const isRequired = data.isRequired ?? false;

    // Create a new object with the correct types
    const insertData: any = {
      title: data.title,
      question_set_id: data.questionSetId,
      input_type: inputType,
      is_required: isRequired ? 1 : 0,
      order_no: data.orderNo,
      created_at: formattedDate,
      updated_at: formattedDate
    };

    // Add optional fields
    if (data.key !== undefined) insertData.key = data.key;
    if (data.tooltip !== undefined) insertData.tooltip = data.tooltip;
    if (data.category !== undefined) insertData.category = data.category;
    if (data.metadata !== undefined) insertData.metadata = data.metadata;

    const result = await db.insert(device_questions).values(insertData);

    const insertId = Number(result[0].insertId);
    return this.findById(insertId);
  }

  async update(id: number, data: TQuestionUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Extract the properties we need to update, explicitly converting boolean values to numbers
    const updateData: any = { updated_at: formattedDate };

    if (data.key !== undefined) updateData.key = data.key;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.inputType !== undefined) updateData.input_type = data.inputType;
    if (data.tooltip !== undefined) updateData.tooltip = data.tooltip;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isRequired !== undefined) updateData.is_required = data.isRequired ? 1 : 0;
    if (data.orderNo !== undefined) updateData.order_no = data.orderNo;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    await db.update(device_questions)
      .set(updateData)
      .where(eq(device_questions.id, id));

    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all options and their translations
    const optionsToDelete = await db.select({ id: question_options.id })
      .from(question_options)
      .where(eq(question_options.question_id, id));

    const optionIds = optionsToDelete.map(o => o.id);

    if (optionIds.length > 0) {
      // Delete option translations
      await db.delete(question_option_translations)
        .where(inArray(question_option_translations.option_id, optionIds));

      // Delete options
      await db.delete(question_options)
        .where(eq(question_options.question_id, id));
    }

    // Delete question translations
    await db.delete(question_translations)
      .where(eq(question_translations.question_id, id));

    // Delete the question
    await db.delete(device_questions)
      .where(eq(device_questions.id, id));

    return true;
  }

  // Question translation methods
  async createTranslation(data: TQuestionTranslationCreate) {
    const result = await db.insert(question_translations).values({
      question_id: data.questionId,
      language_id: data.languageId,
      title: data.title,
      tooltip: data.tooltip,
      category: data.category
    });
    return this.findTranslationById(Number(result[0].insertId));
  }

  async findTranslationById(id: number) {
    const translation = await db.select()
      .from(question_translations)
      .where(eq(question_translations.id, id))
      .limit(1);

    return translation[0] || null;
  }

  async findTranslation(questionId: number, languageId: number) {
    const translation = await db.select()
      .from(question_translations)
      .where(and(
        eq(question_translations.question_id, questionId),
        eq(question_translations.language_id, languageId)
      ))
      .limit(1);

    return translation[0] || null;
  }

  async updateTranslation(id: number, data: Partial<Omit<TQuestionTranslationCreate, 'questionId' | 'languageId'>>) {
    await db.update(question_translations)
      .set(data)
      .where(eq(question_translations.id, id));

    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(question_translations)
      .where(eq(question_translations.id, id));

    return true;
  }

  async findTranslationsForQuestion(questionId: number) {
    return db.select()
      .from(question_translations)
      .where(eq(question_translations.question_id, questionId));
  }

  // Question option CRUD operations
  async findAllOptions(questionId: number, includeTranslations = true) {
    return db.select()
      .from(question_options)
      .where(eq(question_options.question_id, questionId))
      .orderBy(asc(question_options.order_no));
  }

  async findOptionById(id: number, includeTranslations = true) {
    const option = await db.select()
      .from(question_options)
      .where(eq(question_options.id, id))
      .limit(1);

    return option[0] || null;
  }

  async findOptionByKey(key: string, questionId: number) {
    const option = await db.select()
      .from(question_options)
      .where(and(
        eq(question_options.key, key),
        eq(question_options.question_id, questionId)
      ))
      .limit(1);

    return option[0] || null;
  }

  async createOption(data: TQuestionOptionCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Apply default for isDefault
    const isDefault = data.isDefault ?? false;

    // If this is a default option for a single select question, ensure no other options are set as default
    if (isDefault) {
      const question = await this.findById(data.questionId, false, false);
      if (question && (question.input_type === 'SINGLE_SELECT_RADIO' || question.input_type === 'SINGLE_SELECT_DROPDOWN')) {
        await db.update(question_options)
          .set({ is_default: 0 })
          .where(eq(question_options.question_id, data.questionId));
      }
    }

    // Create a new object with the correct types
    const insertData: any = {
      title: data.title,
      order_no: data.orderNo,
      question_id: data.questionId,
      is_default: isDefault ? 1 : 0,
      created_at: formattedDate,
      updated_at: formattedDate
    };

    // Add optional fields
    if (data.key !== undefined) insertData.key = data.key;
    if (data.priceModifier !== undefined) insertData.price_modifier = data.priceModifier;
    if (data.icon !== undefined) insertData.icon = data.icon;
    if (data.metadata !== undefined) insertData.metadata = data.metadata;

    const result = await db.insert(question_options).values(insertData);

    const insertId = Number(result[0].insertId);
    return this.findOptionById(insertId);
  }

  async updateOption(id: number, data: TQuestionOptionUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // If setting this option as default for a single select question, ensure no other options are set as default
    const option = await this.findOptionById(id, false);
    if (option && data.isDefault) {
      const question = await this.findById(option.question_id, false, false);
      if (question && (question.input_type === 'SINGLE_SELECT_RADIO' || question.input_type === 'SINGLE_SELECT_DROPDOWN')) {
        await db.update(question_options)
          .set({ is_default: 0 })
          .where(eq(question_options.question_id, option.question_id));
      }
    }

    // Extract the properties we need to update, explicitly converting boolean values to numbers
    const updateData: any = { updated_at: formattedDate };

    if (data.key !== undefined) updateData.key = data.key;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.priceModifier !== undefined) updateData.price_modifier = data.priceModifier;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.isDefault !== undefined) updateData.is_default = data.isDefault ? 1 : 0;
    if (data.orderNo !== undefined) updateData.order_no = data.orderNo;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    await db.update(question_options)
      .set(updateData)
      .where(eq(question_options.id, id));

    return this.findOptionById(id);
  }

  async deleteOption(id: number) {
    // Delete option translations first
    await db.delete(question_option_translations)
      .where(eq(question_option_translations.option_id, id));

    // Delete the option
    await db.delete(question_options)
      .where(eq(question_options.id, id));

    return true;
  }

  // Question option translation methods
  async createOptionTranslation(data: TQuestionOptionTranslationCreate) {
    const result = await db.insert(question_option_translations).values({
      option_id: data.optionId,
      language_id: data.languageId,
      title: data.title
    });
    return this.findOptionTranslationById(Number(result[0].insertId));
  }

  async findOptionTranslationById(id: number) {
    const translation = await db.select()
      .from(question_option_translations)
      .where(eq(question_option_translations.id, id))
      .limit(1);

    return translation[0] || null;
  }

  async findOptionTranslation(optionId: number, languageId: number) {
    const translation = await db.select()
      .from(question_option_translations)
      .where(and(
        eq(question_option_translations.option_id, optionId),
        eq(question_option_translations.language_id, languageId)
      ))
      .limit(1);

    return translation[0] || null;
  }

  async updateOptionTranslation(id: number, data: Partial<Omit<TQuestionOptionTranslationCreate, 'optionId' | 'languageId'>>) {
    await db.update(question_option_translations)
      .set(data)
      .where(eq(question_option_translations.id, id));

    return this.findOptionTranslationById(id);
  }

  async deleteOptionTranslation(id: number) {
    await db.delete(question_option_translations)
      .where(eq(question_option_translations.id, id));

    return true;
  }

  async findTranslationsForOption(optionId: number) {
    return db.select()
      .from(question_option_translations)
      .where(eq(question_option_translations.option_id, optionId));
  }
}

export const questionRepository = new QuestionRepository(); 