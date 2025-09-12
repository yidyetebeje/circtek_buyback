import { asc, desc, eq, and, sql, inArray, like } from "drizzle-orm";
import { db } from "../../db";
import { 
  question_sets,
  device_questions,
  question_options,
  device_model_question_set_assignments,
  question_set_translations,
  question_translations,
  question_option_translations,
  models
} from "../../db/buyback_catalogue.schema";
import { 
  TQuestionSetCreate, 
  TQuestionSetUpdate,
  TQuestionSetTranslationCreate
} from "../types/questionSetTypes";

export class QuestionSetRepository {
  async findAll(
    page = 1, 
    limit = 20, 
    orderBy = "internalName", 
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    search?: string
  ) {
    const offset = (page - 1) * limit;
    
    // Build where clauses
    let whereConditions = [];
    
    if (tenantId) {
      whereConditions.push(eq(question_sets.tenant_id, tenantId));
    }
    
    if (search && search.trim() !== '') {
      whereConditions.push(
        sql`(${question_sets.internal_name} LIKE ${`%${search}%`} OR ${question_sets.display_name} LIKE ${`%${search}%`})`
      );
    }
    
    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined;
    
    // Create a column mapping for type safety
    const columnMapping = {
      id: question_sets.id,
      internalName: question_sets.internal_name,
      displayName: question_sets.display_name,
      description: question_sets.description,
      tenant_id: question_sets.tenant_id,
      createdAt: question_sets.createdAt,
      updatedAt: question_sets.updatedAt
    };
    
    // Make sure orderBy is a valid column
    if (!(orderBy in columnMapping)) {
      orderBy = "internalName"; // Default to a safe column if invalid
    }
    
    const items = await db.select({
      id: question_sets.id,
      internalName: question_sets.internal_name,
      displayName: question_sets.display_name,
      description: question_sets.description,
      tenantId: question_sets.tenant_id,
      createdAt: question_sets.createdAt,
      updatedAt: question_sets.updatedAt
    })
    .from(question_sets)
    .where(whereClause || sql`1=1`)
    .limit(limit)
    .offset(offset)
    .orderBy(order === "asc" 
      ? asc(columnMapping[orderBy as keyof typeof columnMapping])
      : desc(columnMapping[orderBy as keyof typeof columnMapping]));

    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(question_sets)
      .where(whereClause || sql`1=1`);
    
    return {
      data: items,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async findById(id: number, includeQuestions = true, includeTranslations = true) {
    const questionSet = await db.select({
      id: question_sets.id,
      internalName: question_sets.internal_name,
      displayName: question_sets.display_name,
      description: question_sets.description,
      tenantId: question_sets.tenant_id,
      createdAt: question_sets.createdAt,
      updatedAt: question_sets.updatedAt
    })
    .from(question_sets)
    .where(eq(question_sets.id, id))
    .limit(1);

    if (questionSet.length === 0) return null;

    const result = questionSet[0];

    if (includeQuestions) {
      const questions = await db.select({
        id: device_questions.id,
        question_set_id: device_questions.question_set_id,
        key: device_questions.key,
        title: device_questions.title,
        input_type: device_questions.input_type,
        tooltip: device_questions.tooltip,
        category: device_questions.category,
        is_required: device_questions.is_required,
        order_no: device_questions.order_no,
        metadata: device_questions.metadata,
        created_at: device_questions.created_at,
        updated_at: device_questions.updated_at
      })
      .from(device_questions)
      .where(eq(device_questions.question_set_id, id))
      .orderBy(asc(device_questions.order_no));

      const questionIds = questions.map(q => q.id);
      const options = questionIds.length > 0 ? await db.select()
        .from(question_options)
        .where(inArray(question_options.question_id, questionIds))
        .orderBy(asc(question_options.order_no)) : [];

      const questionsWithOptions = questions.map(question => ({
        ...question,
        options: options.filter(option => option.question_id === question.id)
      }));

      return {
        ...result,
        questions: questionsWithOptions
      };
    }

    return result;
  }

  async findByInternalName(internalName: string, tenantId: number) {
    const questionSet = await db.select({
      id: question_sets.id,
      internalName: question_sets.internal_name,
      displayName: question_sets.display_name,
      description: question_sets.description,
      tenantId: question_sets.tenant_id,
      createdAt: question_sets.createdAt,
      updatedAt: question_sets.updatedAt
    })
    .from(question_sets)
    .where(and(
      eq(question_sets.internal_name, internalName),
      eq(question_sets.tenant_id, tenantId)
    ))
    .limit(1);

    if (questionSet.length === 0) return null;

    const result = questionSet[0];

    const questions = await db.select()
      .from(device_questions)
      .where(eq(device_questions.question_set_id, result.id))
      .orderBy(asc(device_questions.order_no));

    const questionIds = questions.map(q => q.id);
    const options = questionIds.length > 0 ? await db.select()
      .from(question_options)
      .where(inArray(question_options.question_id, questionIds))
      .orderBy(asc(question_options.order_no)) : [];

    const questionsWithOptions = questions.map(question => ({
      ...question,
      options: options.filter(option => option.question_id === question.id)
    }));

    return {
      ...result,
      questions: questionsWithOptions
    };
  }

  async create(data: TQuestionSetCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
    
    const result = await db.insert(question_sets).values({
      internal_name: data.internalName,
      display_name: data.displayName,
      description: data.description || null,
      tenant_id: data.tenantId,
      createdAt: formattedDate,
      updatedAt: formattedDate
    });
    
    const insertId = Number(result[0].insertId);
    return this.findById(insertId);
  }

  async update(id: number, data: TQuestionSetUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    await db.update(question_sets)
      .set({
        internal_name: data.internalName,
        display_name: data.displayName,
        description: data.description,
        tenant_id: data.tenantId,
        updatedAt: formattedDate
      })
      .where(eq(question_sets.id, id));
    
    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all assignments
    await db.delete(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.question_set_id, id));
    
    // Delete all options for all questions in this set
    const questionsInSet = await db.select({ id: device_questions.id })
      .from(device_questions)
      .where(eq(device_questions.question_set_id, id));
    
    const questionIds = questionsInSet.map(q => q.id);
    
    if (questionIds.length > 0) {
      // Delete option translations
      await db.delete(question_option_translations)
        .where(
          inArray(question_option_translations.option_id,
            db.select({ id: question_options.id })
              .from(question_options)
              .where(inArray(question_options.question_id, questionIds))
          )
        );
      
      // Delete options
      await db.delete(question_options)
        .where(inArray(question_options.question_id, questionIds));
      
      // Delete question translations
      await db.delete(question_translations)
        .where(inArray(question_translations.question_id, questionIds));
    }
    
    // Delete questions
    await db.delete(device_questions)
      .where(eq(device_questions.question_set_id, id));
    
    // Delete question set translations
    await db.delete(question_set_translations)
      .where(eq(question_set_translations.question_set_id, id));
    
    // Finally delete the question set
    await db.delete(question_sets)
      .where(eq(question_sets.id, id));
    
    return true;
  }

  // Translation related methods
  async createTranslation(data: TQuestionSetTranslationCreate) {
    const result = await db.insert(question_set_translations).values({
      question_set_id: data.questionSetId,
      language_id: data.languageId,
      display_name: data.displayName,
      description: data.description,
    });
    return this.findTranslationById(Number(result[0].insertId));
  }

  async findTranslationById(id: number) {
    const translation = await db.select()
      .from(question_set_translations)
      .where(eq(question_set_translations.id, id))
      .limit(1);
    
    return translation[0] || null;
  }

  async findTranslation(questionSetId: number, languageId: number) {
    const translation = await db.select()
      .from(question_set_translations)
      .where(and(
        eq(question_set_translations.question_set_id, questionSetId),
        eq(question_set_translations.language_id, languageId)
      ))
      .limit(1);
    
    return translation[0] || null;
  }

  async updateTranslation(id: number, data: Partial<Omit<TQuestionSetTranslationCreate, 'questionSetId' | 'languageId'>>) {
    await db.update(question_set_translations)
      .set(data)
      .where(eq(question_set_translations.id, id));
    
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(question_set_translations)
      .where(eq(question_set_translations.id, id));
    
    return true;
  }

  async findTranslationsForQuestionSet(questionSetId: number) {
    return db.select()
      .from(question_set_translations)
      .where(eq(question_set_translations.question_set_id, questionSetId));
  }

  // Assignment related methods
  async getQuestionSetsForModel(modelId: number) {
    const assignments = await db.select()
      .from(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.model_id, modelId))
      .orderBy(asc(device_model_question_set_assignments.assignment_order));
    
    const questionSetIds = assignments.map(a => a.question_set_id);
    if (questionSetIds.length === 0) return [];
    
    const questionSets = await db.select({
      id: question_sets.id,
      internalName: question_sets.internal_name,
      displayName: question_sets.display_name,
      description: question_sets.description,
      tenantId: question_sets.tenant_id,
      createdAt: question_sets.createdAt,
      updatedAt: question_sets.updatedAt
    })
      .from(question_sets)
      .where(inArray(question_sets.id, questionSetIds));
    
    // Get questions for all question sets
    const questions = await db.select()
      .from(device_questions)
      .where(inArray(device_questions.question_set_id, questionSetIds))
      .orderBy(asc(device_questions.order_no));
    
    // Get options for all questions
    const questionIds = questions.map(q => q.id);
    const options = questionIds.length > 0 ? await db.select()
      .from(question_options)
      .where(inArray(question_options.question_id, questionIds))
      .orderBy(asc(question_options.order_no)) : [];
    
    // Combine data
    return questionSets.map(qs => ({
      ...qs,
      questions: questions.filter(q => q.question_set_id === qs.id).map(question => ({
        ...question,
        options: options.filter(opt => opt.question_id === question.id)
      }))
    }));
  }

  async getModelsByQuestionSet(questionSetId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const assignments = await db.select({
      model_id: device_model_question_set_assignments.model_id
    })
    .from(device_model_question_set_assignments)
    .where(eq(device_model_question_set_assignments.question_set_id, questionSetId))
    .limit(limit)
    .offset(offset);
    
    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.question_set_id, questionSetId));
    
    const modelIds = assignments.map(a => a.model_id);
    const modelsData = modelIds.length > 0 ? await db.select()
      .from(models)
      .where(inArray(models.id, modelIds)) : [];
    
    return {
      data: modelsData,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async createAssignment(modelId: number, questionSetId: number, assignmentOrder: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Check if the assignment already exists
    const existingAssignment = await db.select()
      .from(device_model_question_set_assignments)
      .where(and(
        eq(device_model_question_set_assignments.model_id, modelId),
        eq(device_model_question_set_assignments.question_set_id, questionSetId)
      ))
      .limit(1);
    
    if (existingAssignment.length > 0) {
      // Update the existing assignment
      await db.update(device_model_question_set_assignments)
        .set({
          assignment_order: assignmentOrder,
          updated_at: formattedDate
        })
        .where(eq(device_model_question_set_assignments.id, existingAssignment[0].id));
      
      const updated = await db.select()
        .from(device_model_question_set_assignments)
        .where(eq(device_model_question_set_assignments.id, existingAssignment[0].id))
        .limit(1);
      
      return updated[0];
    }
    
    // Create a new assignment
    const result = await db.insert(device_model_question_set_assignments).values({
      model_id: modelId,
      question_set_id: questionSetId,
      assignment_order: assignmentOrder,
      created_at: formattedDate,
      updated_at: formattedDate
    });
    
    const created = await db.select()
      .from(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.id, Number(result[0].insertId)))
      .limit(1);
    
    return created[0];
  }

  async updateAssignment(id: number, assignmentOrder: number) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    await db.update(device_model_question_set_assignments)
      .set({
        assignment_order: assignmentOrder,
        updated_at: formattedDate
      })
      .where(eq(device_model_question_set_assignments.id, id));
    
    const updated = await db.select()
      .from(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.id, id))
      .limit(1);
    
    return updated[0];
  }

  async deleteAssignment(id: number) {
    await db.delete(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.id, id));
    
    return true;
  }

  async findAssignment(modelId: number, questionSetId: number) {
    const assignment = await db.select()
      .from(device_model_question_set_assignments)
      .where(and(
        eq(device_model_question_set_assignments.model_id, modelId),
        eq(device_model_question_set_assignments.question_set_id, questionSetId)
      ))
      .limit(1);
    
    return assignment[0] || null;
  }

  async findAssignmentById(id: number) {
    const assignment = await db.select()
      .from(device_model_question_set_assignments)
      .where(eq(device_model_question_set_assignments.id, id))
      .limit(1);
    
    return assignment[0] || null;
  }

  async deleteAssignmentByModelAndQuestionSet(modelId: number, questionSetId: number) {
    await db.delete(device_model_question_set_assignments)
      .where(and(
        eq(device_model_question_set_assignments.model_id, modelId),
        eq(device_model_question_set_assignments.question_set_id, questionSetId)
      ));
    
    return true;
  }
}

export const questionSetRepository = new QuestionSetRepository(); 