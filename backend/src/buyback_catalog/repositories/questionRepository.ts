import { asc, desc, eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  deviceQuestions,
  questionOptions,
  questionTranslations,
  questionOptionTranslations
} from "../../db/schema/catalog";
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
    return db.query.deviceQuestions.findMany({
      where: eq(deviceQuestions.questionSetId, questionSetId),
      orderBy: asc(deviceQuestions.orderNo),
      with: {
        translations: includeTranslations ? true : undefined,
        options: includeOptions ? {
          orderBy: asc(questionOptions.orderNo),
          with: {
            translations: includeTranslations ? true : undefined
          }
        } : undefined
      }
    });
  }

  async findById(id: number, includeOptions = true, includeTranslations = true) {
    return db.query.deviceQuestions.findFirst({
      where: eq(deviceQuestions.id, id),
      with: {
        translations: includeTranslations ? true : undefined,
        options: includeOptions ? {
          orderBy: asc(questionOptions.orderNo),
          with: {
            translations: includeTranslations ? true : undefined
          }
        } : undefined
      }
    });
  }

  async findByKey(key: string, questionSetId: number) {
    return db.query.deviceQuestions.findFirst({
      where: and(
        eq(deviceQuestions.key, key),
        eq(deviceQuestions.questionSetId, questionSetId)
      ),
      with: {
        translations: true,
        options: {
          orderBy: asc(questionOptions.orderNo),
          with: {
            translations: true
          }
        }
      }
    });
  }

  async create(data: TQuestionCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Create a new object with the correct types
    const insertData: any = {
      title: data.title,
      questionSetId: data.questionSetId,
      inputType: data.inputType,
      isRequired: data.isRequired ? 1 : 0,
      orderNo: data.orderNo,
      createdAt: formattedDate,
      updatedAt: formattedDate
    };

    // Add optional fields
    if (data.key !== undefined) insertData.key = data.key;
    if (data.tooltip !== undefined) insertData.tooltip = data.tooltip;
    if (data.category !== undefined) insertData.category = data.category;
    if (data.metadata !== undefined) insertData.metadata = data.metadata;

    const result = await db.insert(deviceQuestions).values(insertData);

    const insertId = Number(result[0].insertId);
    return this.findById(insertId);
  }

  async update(id: number, data: TQuestionUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Extract the properties we need to update, explicitly converting boolean values to numbers
    const updateData: any = { updatedAt: formattedDate };
    
    if (data.key !== undefined) updateData.key = data.key;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.inputType !== undefined) updateData.inputType = data.inputType;
    if (data.tooltip !== undefined) updateData.tooltip = data.tooltip;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired ? 1 : 0;
    if (data.orderNo !== undefined) updateData.orderNo = data.orderNo;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    await db.update(deviceQuestions)
      .set(updateData)
      .where(eq(deviceQuestions.id, id));

    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all options and their translations
    const optionsToDelete = await db.query.questionOptions.findMany({
      where: eq(questionOptions.questionId, id),
      columns: {
        id: true
      }
    });

    const optionIds = optionsToDelete.map(o => o.id);

    if (optionIds.length > 0) {
      // Delete option translations
      await db.delete(questionOptionTranslations)
        .where(inArray(questionOptionTranslations.optionId, optionIds));

      // Delete options
      await db.delete(questionOptions)
        .where(eq(questionOptions.questionId, id));
    }

    // Delete question translations
    await db.delete(questionTranslations)
      .where(eq(questionTranslations.questionId, id));

    // Delete the question
    await db.delete(deviceQuestions)
      .where(eq(deviceQuestions.id, id));

    return true;
  }

  // Question translation methods
  async createTranslation(data: TQuestionTranslationCreate) {
    const result = await db.insert(questionTranslations).values(data);
    return this.findTranslationById(Number(result[0].insertId));
  }

  async findTranslationById(id: number) {
    return db.query.questionTranslations.findFirst({
      where: eq(questionTranslations.id, id),
      with: {
        language: true
      }
    });
  }

  async findTranslation(questionId: number, languageId: number) {
    return db.query.questionTranslations.findFirst({
      where: and(
        eq(questionTranslations.questionId, questionId),
        eq(questionTranslations.languageId, languageId)
      ),
      with: {
        language: true
      }
    });
  }

  async updateTranslation(id: number, data: Partial<Omit<TQuestionTranslationCreate, 'questionId' | 'languageId'>>) {
    await db.update(questionTranslations)
      .set(data)
      .where(eq(questionTranslations.id, id));

    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(questionTranslations)
      .where(eq(questionTranslations.id, id));

    return true;
  }

  async findTranslationsForQuestion(questionId: number) {
    return db.query.questionTranslations.findMany({
      where: eq(questionTranslations.questionId, questionId),
      with: {
        language: true
      }
    });
  }

  // Question option CRUD operations
  async findAllOptions(questionId: number, includeTranslations = true) {
    return db.query.questionOptions.findMany({
      where: eq(questionOptions.questionId, questionId),
      orderBy: asc(questionOptions.orderNo),
      with: {
        translations: includeTranslations ? true : undefined
      }
    });
  }

  async findOptionById(id: number, includeTranslations = true) {
    return db.query.questionOptions.findFirst({
      where: eq(questionOptions.id, id),
      with: {
        translations: includeTranslations ? true : undefined
      }
    });
  }

  async findOptionByKey(key: string, questionId: number) {
    return db.query.questionOptions.findFirst({
      where: and(
        eq(questionOptions.key, key),
        eq(questionOptions.questionId, questionId)
      ),
      with: {
        translations: true
      }
    });
  }

  async createOption(data: TQuestionOptionCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // If this is a default option for a single select question, ensure no other options are set as default
    if (data.isDefault) {
      const question = await this.findById(data.questionId, false, false);
      if (question && (question.inputType === 'SINGLE_SELECT_RADIO' || question.inputType === 'SINGLE_SELECT_DROPDOWN')) {
        await db.update(questionOptions)
          .set({ isDefault: 0 })
          .where(eq(questionOptions.questionId, data.questionId));
      }
    }

    // Create a new object with the correct types
    const insertData: any = {
      title: data.title,
      orderNo: data.orderNo,
      questionId: data.questionId,
      isDefault: data.isDefault ? 1 : 0,
      createdAt: formattedDate,
      updatedAt: formattedDate
    };

    // Add optional fields
    if (data.key !== undefined) insertData.key = data.key;
    if (data.priceModifier !== undefined) insertData.priceModifier = data.priceModifier;
    if (data.icon !== undefined) insertData.icon = data.icon;
    if (data.metadata !== undefined) insertData.metadata = data.metadata;

    const result = await db.insert(questionOptions).values(insertData);

    const insertId = Number(result[0].insertId);
    return this.findOptionById(insertId);
  }

  async updateOption(id: number, data: TQuestionOptionUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // If setting this option as default for a single select question, ensure no other options are set as default
    const option = await this.findOptionById(id, false);
    if (option && data.isDefault) {
      const question = await this.findById(option.questionId, false, false);
      if (question && (question.inputType === 'SINGLE_SELECT_RADIO' || question.inputType === 'SINGLE_SELECT_DROPDOWN')) {
        await db.update(questionOptions)
          .set({ isDefault: 0 })
          .where(eq(questionOptions.questionId, option.questionId));
      }
    }
    
    // Extract the properties we need to update, explicitly converting boolean values to numbers
    const updateData: any = { updatedAt: formattedDate };
    
    if (data.key !== undefined) updateData.key = data.key;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.priceModifier !== undefined) updateData.priceModifier = data.priceModifier;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault ? 1 : 0;
    if (data.orderNo !== undefined) updateData.orderNo = data.orderNo;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    await db.update(questionOptions)
      .set(updateData)
      .where(eq(questionOptions.id, id));

    return this.findOptionById(id);
  }

  async deleteOption(id: number) {
    // Delete option translations first
    await db.delete(questionOptionTranslations)
      .where(eq(questionOptionTranslations.optionId, id));

    // Delete the option
    await db.delete(questionOptions)
      .where(eq(questionOptions.id, id));

    return true;
  }

  // Question option translation methods
  async createOptionTranslation(data: TQuestionOptionTranslationCreate) {
    const result = await db.insert(questionOptionTranslations).values(data);
    return this.findOptionTranslationById(Number(result[0].insertId));
  }

  async findOptionTranslationById(id: number) {
    return db.query.questionOptionTranslations.findFirst({
      where: eq(questionOptionTranslations.id, id),
      with: {
        language: true
      }
    });
  }

  async findOptionTranslation(optionId: number, languageId: number) {
    return db.query.questionOptionTranslations.findFirst({
      where: and(
        eq(questionOptionTranslations.optionId, optionId),
        eq(questionOptionTranslations.languageId, languageId)
      ),
      with: {
        language: true
      }
    });
  }

  async updateOptionTranslation(id: number, data: Partial<Omit<TQuestionOptionTranslationCreate, 'optionId' | 'languageId'>>) {
    await db.update(questionOptionTranslations)
      .set(data)
      .where(eq(questionOptionTranslations.id, id));

    return this.findOptionTranslationById(id);
  }

  async deleteOptionTranslation(id: number) {
    await db.delete(questionOptionTranslations)
      .where(eq(questionOptionTranslations.id, id));

    return true;
  }

  async findTranslationsForOption(optionId: number) {
    return db.query.questionOptionTranslations.findMany({
      where: eq(questionOptionTranslations.optionId, optionId),
      with: {
        language: true
      }
    });
  }
}

export const questionRepository = new QuestionRepository(); 