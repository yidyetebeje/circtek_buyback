import { asc, desc, eq, and, sql, inArray, like } from "drizzle-orm";
import { db } from "../../db";
import { 
  questionSets,
  deviceQuestions,
  questionOptions,
  deviceModelQuestionSetAssignments,
  questionSetTranslations,
  questionTranslations,
  questionOptionTranslations,
  models
} from "../../db/schema/catalog";
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
    clientId?: number,
    search?: string
  ) {
    const offset = (page - 1) * limit;
    
    // Build where clauses
    let whereConditions = [];
    
    if (clientId) {
      whereConditions.push(eq(questionSets.client_id, clientId));
    }
    
    if (search && search.trim() !== '') {
      whereConditions.push(
        sql`(${questionSets.internalName} LIKE ${`%${search}%`} OR ${questionSets.displayName} LIKE ${`%${search}%`})`
      );
    }
    
    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined;
    
    // Create a column mapping for type safety
    const columnMapping = {
      id: questionSets.id,
      internalName: questionSets.internalName,
      displayName: questionSets.displayName,
      description: questionSets.description,
      client_id: questionSets.client_id,
      createdAt: questionSets.createdAt,
      updatedAt: questionSets.updatedAt
    };
    
    // Make sure orderBy is a valid column
    if (!(orderBy in columnMapping)) {
      orderBy = "internalName"; // Default to a safe column if invalid
    }
    
    const [items, totalCount] = await Promise.all([
      db.query.questionSets.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy: order === "asc" 
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping]),
        with: {
          translations: true,
          questions: {
            with: {
              options: true
            }
          }
        }
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(questionSets)
        .where(whereClause ? whereClause : sql`1=1`)
    ]);
    
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
    return db.query.questionSets.findFirst({
      where: eq(questionSets.id, id),
      with: {
        translations: includeTranslations ? true : undefined,
        questions: includeQuestions ? {
          orderBy: asc(deviceQuestions.orderNo),
          with: {
            translations: includeTranslations ? true : undefined,
            options: {
              orderBy: asc(questionOptions.orderNo),
              with: {
                translations: includeTranslations ? true : undefined
              }
            }
          }
        } : undefined
      }
    });
  }

  async findByInternalName(internalName: string, clientId: number) {
    return db.query.questionSets.findFirst({
      where: and(
        eq(questionSets.internalName, internalName),
        eq(questionSets.client_id, clientId)
      ),
      with: {
        translations: true,
        questions: {
          orderBy: asc(deviceQuestions.orderNo),
          with: {
            translations: true,
            options: {
              orderBy: asc(questionOptions.orderNo),
              with: {
                translations: true
              }
            }
          }
        }
      }
    });
  }

  async create(data: TQuestionSetCreate) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
    
    const result = await db.insert(questionSets).values({
      ...data,
      createdAt: formattedDate,
      updatedAt: formattedDate
    });
    
    const insertId = Number(result[0].insertId);
    return this.findById(insertId);
  }

  async update(id: number, data: TQuestionSetUpdate) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    await db.update(questionSets)
      .set({
        ...data,
        updatedAt: formattedDate
      })
      .where(eq(questionSets.id, id));
    
    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all assignments
    await db.delete(deviceModelQuestionSetAssignments)
      .where(eq(deviceModelQuestionSetAssignments.questionSetId, id));
    
    // Delete all options for all questions in this set
    const questionsInSet = await db.select({ id: deviceQuestions.id })
      .from(deviceQuestions)
      .where(eq(deviceQuestions.questionSetId, id));
    
    const questionIds = questionsInSet.map(q => q.id);
    
    if (questionIds.length > 0) {
      // Delete option translations
      await db.delete(questionOptionTranslations)
        .where(
          inArray(questionOptionTranslations.optionId,
            db.select({ id: questionOptions.id })
              .from(questionOptions)
              .where(inArray(questionOptions.questionId, questionIds))
          )
        );
      
      // Delete options
      await db.delete(questionOptions)
        .where(inArray(questionOptions.questionId, questionIds));
      
      // Delete question translations
      await db.delete(questionTranslations)
        .where(inArray(questionTranslations.questionId, questionIds));
    }
    
    // Delete questions
    await db.delete(deviceQuestions)
      .where(eq(deviceQuestions.questionSetId, id));
    
    // Delete question set translations
    await db.delete(questionSetTranslations)
      .where(eq(questionSetTranslations.questionSetId, id));
    
    // Finally delete the question set
    await db.delete(questionSets)
      .where(eq(questionSets.id, id));
    
    return true;
  }

  // Translation related methods
  async createTranslation(data: TQuestionSetTranslationCreate) {
    const result = await db.insert(questionSetTranslations).values(data);
    return this.findTranslationById(Number(result[0].insertId));
  }

  async findTranslationById(id: number) {
    return db.query.questionSetTranslations.findFirst({
      where: eq(questionSetTranslations.id, id),
      with: {
        language: true
      }
    });
  }

  async findTranslation(questionSetId: number, languageId: number) {
    return db.query.questionSetTranslations.findFirst({
      where: and(
        eq(questionSetTranslations.questionSetId, questionSetId),
        eq(questionSetTranslations.languageId, languageId)
      ),
      with: {
        language: true
      }
    });
  }

  async updateTranslation(id: number, data: Partial<Omit<TQuestionSetTranslationCreate, 'questionSetId' | 'languageId'>>) {
    await db.update(questionSetTranslations)
      .set(data)
      .where(eq(questionSetTranslations.id, id));
    
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(questionSetTranslations)
      .where(eq(questionSetTranslations.id, id));
    
    return true;
  }

  async findTranslationsForQuestionSet(questionSetId: number) {
    return db.query.questionSetTranslations.findMany({
      where: eq(questionSetTranslations.questionSetId, questionSetId),
      with: {
        language: true
      }
    });
  }

  // Assignment related methods
  async getQuestionSetsForModel(modelId: number) {
    const assignments = await db.query.deviceModelQuestionSetAssignments.findMany({
      where: eq(deviceModelQuestionSetAssignments.modelId, modelId),
      orderBy: asc(deviceModelQuestionSetAssignments.assignmentOrder),
      with: {
        questionSet: {
          with: {
            translations: true,
            questions: {
              orderBy: asc(deviceQuestions.orderNo),
              with: {
                translations: true,
                options: {
                  orderBy: asc(questionOptions.orderNo),
                  with: {
                    translations: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    return assignments.map(assignment => assignment.questionSet);
  }

  async getModelsByQuestionSet(questionSetId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const [assignments, totalCount] = await Promise.all([
      db.query.deviceModelQuestionSetAssignments.findMany({
        where: eq(deviceModelQuestionSetAssignments.questionSetId, questionSetId),
        limit,
        offset,
        with: {
          model: {
            with: {
              category: true,
              brand: true,
              modelSeries: true
            }
          }
        }
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(deviceModelQuestionSetAssignments)
        .where(eq(deviceModelQuestionSetAssignments.questionSetId, questionSetId))
    ]);
    
    return {
      data: assignments.map(assignment => assignment.model),
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
    const existingAssignment = await db.query.deviceModelQuestionSetAssignments.findFirst({
      where: and(
        eq(deviceModelQuestionSetAssignments.modelId, modelId),
        eq(deviceModelQuestionSetAssignments.questionSetId, questionSetId)
      )
    });
    
    if (existingAssignment) {
      // Update the existing assignment
      await db.update(deviceModelQuestionSetAssignments)
        .set({
          assignmentOrder,
          updatedAt: formattedDate
        })
        .where(eq(deviceModelQuestionSetAssignments.id, existingAssignment.id));
      
      return db.query.deviceModelQuestionSetAssignments.findFirst({
        where: eq(deviceModelQuestionSetAssignments.id, existingAssignment.id),
        with: {
          model: true,
          questionSet: true
        }
      });
    }
    
    // Create a new assignment
    const result = await db.insert(deviceModelQuestionSetAssignments).values({
      modelId,
      questionSetId,
      assignmentOrder,
      createdAt: formattedDate,
      updatedAt: formattedDate
    });
    
    return db.query.deviceModelQuestionSetAssignments.findFirst({
      where: eq(deviceModelQuestionSetAssignments.id, Number(result[0].insertId)),
      with: {
        model: true,
        questionSet: true
      }
    });
  }

  async updateAssignment(id: number, assignmentOrder: number) {
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    await db.update(deviceModelQuestionSetAssignments)
      .set({
        assignmentOrder,
        updatedAt: formattedDate
      })
      .where(eq(deviceModelQuestionSetAssignments.id, id));
    
    return db.query.deviceModelQuestionSetAssignments.findFirst({
      where: eq(deviceModelQuestionSetAssignments.id, id),
      with: {
        model: true,
        questionSet: true
      }
    });
  }

  async deleteAssignment(id: number) {
    await db.delete(deviceModelQuestionSetAssignments)
      .where(eq(deviceModelQuestionSetAssignments.id, id));
    
    return true;
  }

  async findAssignment(modelId: number, questionSetId: number) {
    return db.query.deviceModelQuestionSetAssignments.findFirst({
      where: and(
        eq(deviceModelQuestionSetAssignments.modelId, modelId),
        eq(deviceModelQuestionSetAssignments.questionSetId, questionSetId)
      ),
      with: {
        model: true,
        questionSet: true
      }
    });
  }

  async findAssignmentById(id: number) {
    return db.query.deviceModelQuestionSetAssignments.findFirst({
      where: eq(deviceModelQuestionSetAssignments.id, id),
      with: {
        model: true,
        questionSet: true
      }
    });
  }

  async deleteAssignmentByModelAndQuestionSet(modelId: number, questionSetId: number) {
    await db.delete(deviceModelQuestionSetAssignments)
      .where(and(
        eq(deviceModelQuestionSetAssignments.modelId, modelId),
        eq(deviceModelQuestionSetAssignments.questionSetId, questionSetId)
      ));
    
    return true;
  }
}

export const questionSetRepository = new QuestionSetRepository(); 