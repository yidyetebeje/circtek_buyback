import { questionSetRepository } from "../repositories/questionSetRepository";
import { questionRepository } from "../repositories/questionRepository";
import { 
  TQuestionSetCreate,
  TQuestionSetUpdate,
  TQuestionSetTranslationCreate,
  TQuestionCreate,
  TQuestionUpdate,
  TQuestionTranslationCreate,
  TQuestionTranslationUpdate,
  TQuestionOptionCreate,
  TQuestionOptionUpdate,
  TQuestionOptionTranslationCreate,
  TQuestionOptionTranslationUpdate,
  TQuestionSetWithQuestions,
  TQuestionSetWithQuestionsAndTranslations
} from "../types/questionSetTypes";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class QuestionSetService {
  // Question Set CRUD operations
  async getAllQuestionSets(
    page = 1,
    limit = 20,
    orderBy = "internalName",
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    search?: string
  ) {
    return questionSetRepository.findAll(page, limit, orderBy, order, tenantId, search);
  }

  async getQuestionSetById(id: number) {
    const questionSet = await questionSetRepository.findById(id);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${id} not found`);
    }
    return questionSet;
  }

  async getQuestionSetByInternalName(internalName: string, tenantId: number) {
    const questionSet = await questionSetRepository.findByInternalName(internalName, tenantId);
    if (!questionSet) {
      throw new NotFoundError(`Question set with internal name '${internalName}' not found`);
    }
    return questionSet;
  }

  async createQuestionSet(data: TQuestionSetCreate, tenantId: number) {
    // Check for duplicate internal name within the same tenant
    const existingSet = await questionSetRepository.findByInternalName(data.internalName, tenantId);
    if (existingSet) {
      throw new BadRequestError(`Question set with internal name '${data.internalName}' already exists for this tenant`);
    }
    data.tenantId = tenantId;

    return questionSetRepository.create(data);
  }

  async updateQuestionSet(id: number, data: TQuestionSetUpdate) {
    // Check if question set exists
    const questionSet = await questionSetRepository.findById(id);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${id} not found`);
    }

    // If updating the internal name, check for duplicates
    if (data.internalName && data.internalName !== questionSet.internalName && data.tenantId) {
      const existingSet = await questionSetRepository.findByInternalName(data.internalName, data.tenantId);
      if (existingSet && existingSet.id !== id) {
        throw new BadRequestError(`Question set with internal name '${data.internalName}' already exists for this tenant`);
      }
    }

    return questionSetRepository.update(id, data);
  }

  async deleteQuestionSet(id: number) {
    // Check if question set exists
    const questionSet = await questionSetRepository.findById(id);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${id} not found`);
    }

    return questionSetRepository.delete(id);
  }

  // Question Set with Questions (and Options) operations
  async createQuestionSetWithQuestions(data: TQuestionSetWithQuestions, tenantId: number) {
    // Create the question set first
    const questionSet = await this.createQuestionSet(data, tenantId);
    if (!questionSet) {
      throw new NotFoundError("Failed to create question set");
    }

    // Create questions and options
    if (data.questions && data.questions.length > 0) {
      for (const questionData of data.questions) {
        const { options, ...question } = questionData;
        // Create question
        const createdQuestion = await questionRepository.create({
          ...question,
          questionSetId: questionSet.id
        });

        // Create options for this question
        if (createdQuestion && options && options.length > 0) {
          for (const optionData of options) {
            await questionRepository.createOption({
              ...optionData,
              questionId: createdQuestion.id
            });
          }
        }
      }
    }

    // Return the complete question set with questions and options
    return questionSetRepository.findById(questionSet.id);
  }

  async createQuestionSetWithQuestionsAndTranslations(data: TQuestionSetWithQuestionsAndTranslations, tenantId: number) {
    // Create the question set first
    const questionSet = await this.createQuestionSet(data, tenantId);
    if (!questionSet) {
      throw new NotFoundError("Failed to create question set");
    }

    // Create translations for the question set
    if (data.translations && data.translations.length > 0) {
      for (const translation of data.translations) {
        await questionSetRepository.createTranslation({
          ...translation,
          questionSetId: questionSet.id
        });
      }
    }

    // Create questions, options, and their translations
    if (data.questions && data.questions.length > 0) {
      for (const questionData of data.questions) {
        const { options, translations, ...question } = questionData;
        
        // Create question
        const createdQuestion = await questionRepository.create({
          ...question,
          questionSetId: questionSet.id
        });

        // Create translations for this question
        if (createdQuestion && translations && translations.length > 0) {
          for (const translation of translations) {
            await questionRepository.createTranslation({
              ...translation,
              questionId: createdQuestion.id
            });
          }
        }

        // Create options and their translations for this question
        if (createdQuestion && options && options.length > 0) {
          for (const optionData of options) {
            const { translations: optionTranslations, ...option } = optionData;
            
            const createdOption = await questionRepository.createOption({
              ...option,
              questionId: createdQuestion.id
            });

            // Create translations for this option
            if (createdOption && optionTranslations && optionTranslations.length > 0) {
              for (const translation of optionTranslations) {
                await questionRepository.createOptionTranslation({
                  ...translation,
                  optionId: createdOption.id
                });
              }
            }
          }
        }
      }
    }

    // Return the complete question set with all nested data
    return questionSetRepository.findById(questionSet.id);
  }

  // Question Set Translation methods
  async getTranslationsByQuestionSet(questionSetId: number) {
    const questionSet = await questionSetRepository.findById(questionSetId, true, true);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${questionSetId} not found`);
    }

    // Type assertion since we know includeQuestions=true means questions will be included
    const questionSetWithQuestions = questionSet as typeof questionSet & { questions: any[] };

    // Get all question set translations
    const questionSetTranslations = await questionSetRepository.findTranslationsForQuestionSet(questionSetId);
    
    // Build comprehensive translation structure for frontend
    const comprehensiveTranslations = await Promise.all(
      questionSetTranslations.map(async (qsTranslation) => {
        // Get all question translations for this language
        const questionTranslations = await Promise.all(
          (questionSetWithQuestions.questions || []).map(async (question) => {
            const questionTranslation = await questionRepository.findTranslation(question.id, qsTranslation.language_id);
            
            // Get all option translations for this question and language
            const questionOptions = (question as any).options as Array<{ id: number; title: string }> || [];
            const optionTranslations = await Promise.all(
              questionOptions.map(async (option) => {
                const optionTranslation = await questionRepository.findOptionTranslation(option.id, qsTranslation.language_id);
                return {
                  id: option.id,
                  title: optionTranslation?.title || '',
                };
              })
            );

            return {
              id: question.id,
              title: questionTranslation?.title || '',
              tooltip: questionTranslation?.tooltip || '',
              category: questionTranslation?.category || '',
              options: optionTranslations,
            };
          })
        );

        return {
          languageId: qsTranslation.language_id,
          questionSetId: qsTranslation.question_set_id ,
          displayName: qsTranslation.display_name,
          description: qsTranslation.description || '',
          questions: questionTranslations,
        };
      })
    );

    return comprehensiveTranslations;
  }

  async createTranslation(questionSetId: number, data: Omit<TQuestionSetTranslationCreate, 'questionSetId'>) {
    // Check if question set exists
    const questionSet = await questionSetRepository.findById(questionSetId, false);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${questionSetId} not found`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await questionSetRepository.findTranslation(questionSetId, data.languageId);
    if (existingTranslation) {
      throw new BadRequestError(`Translation for this language already exists for question set ${questionSetId}`);
    }

    return questionSetRepository.createTranslation({
      ...data,
      questionSetId
    });
  }

  async updateTranslation(questionSetId: number, languageId: number, data: Partial<Omit<TQuestionSetTranslationCreate, 'questionSetId' | 'languageId'>>) {
    // Check if translation exists
    const translation = await questionSetRepository.findTranslation(questionSetId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for question set ${questionSetId} and language ${languageId}`);
    }

    return questionSetRepository.updateTranslation(translation.id, data);
  }

  async deleteTranslation(questionSetId: number, languageId: number) {
    // Check if translation exists
    const translation = await questionSetRepository.findTranslation(questionSetId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for question set ${questionSetId} and language ${languageId}`);
    }

    return questionSetRepository.deleteTranslation(translation.id);
  }

  // Question Translation methods
  async getQuestionTranslations(questionId: number) {
    return questionRepository.findTranslationsForQuestion(questionId);
  }

  async createQuestionTranslation(questionId: number, data: Omit<TQuestionTranslationCreate, 'questionId'>) {
    // Check if question exists
    const question = await questionRepository.findById(questionId);
    if (!question) {
      throw new NotFoundError(`Question with ID ${questionId} not found`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await questionRepository.findTranslation(questionId, data.languageId);
    if (existingTranslation) {
      throw new BadRequestError(`Translation for this language already exists for question ${questionId}`);
    }

    return questionRepository.createTranslation({
      ...data,
      questionId
    });
  }

  async updateQuestionTranslation(questionId: number, languageId: number, data: TQuestionTranslationUpdate) {
    // Check if translation exists
    const translation = await questionRepository.findTranslation(questionId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for question ${questionId} and language ${languageId}`);
    }

    return questionRepository.updateTranslation(translation.id, data);
  }

  async deleteQuestionTranslation(questionId: number, languageId: number) {
    // Check if translation exists
    const translation = await questionRepository.findTranslation(questionId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for question ${questionId} and language ${languageId}`);
    }

    return questionRepository.deleteTranslation(translation.id);
  }

  // Question Option Translation methods
  async getOptionTranslations(optionId: number) {
    return questionRepository.findTranslationsForOption(optionId);
  }

  async createOptionTranslation(optionId: number, data: Omit<TQuestionOptionTranslationCreate, 'optionId'>) {
    // Check if option exists
    const option = await questionRepository.findOptionById(optionId);
    if (!option) {
      throw new NotFoundError(`Option with ID ${optionId} not found`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await questionRepository.findOptionTranslation(optionId, data.languageId);
    if (existingTranslation) {
      throw new BadRequestError(`Translation for this language already exists for option ${optionId}`);
    }

    return questionRepository.createOptionTranslation({
      ...data,
      optionId
    });
  }

  async updateOptionTranslation(optionId: number, languageId: number, data: TQuestionOptionTranslationUpdate) {
    // Check if translation exists
    const translation = await questionRepository.findOptionTranslation(optionId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for option ${optionId} and language ${languageId}`);
    }

    return questionRepository.updateOptionTranslation(translation.id, data);
  }

  async deleteOptionTranslation(optionId: number, languageId: number) {
    // Check if translation exists
    const translation = await questionRepository.findOptionTranslation(optionId, languageId);
    if (!translation) {
      throw new NotFoundError(`Translation not found for option ${optionId} and language ${languageId}`);
    }

    return questionRepository.deleteOptionTranslation(translation.id);
  }

  // Question Set Assignment methods
  async getQuestionSetsForModel(modelId: number) {
    return questionSetRepository.getQuestionSetsForModel(modelId);
  }

  async getModelsByQuestionSet(questionSetId: number, page = 1, limit = 20) {
    // Check if question set exists
    const questionSet = await questionSetRepository.findById(questionSetId, false);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${questionSetId} not found`);
    }

    return questionSetRepository.getModelsByQuestionSet(questionSetId, page, limit);
  }

  async assignQuestionSetToModel(modelId: number, questionSetId: number, assignmentOrder: number) {
    // Check if question set exists
    const questionSet = await questionSetRepository.findById(questionSetId, false);
    if (!questionSet) {
      throw new NotFoundError(`Question set with ID ${questionSetId} not found`);
    }

    // Check if model exists
    // This check would ideally be done by checking against the models table
    // For now, we'll assume the modelId is valid if the above check passes

    return questionSetRepository.createAssignment(modelId, questionSetId, assignmentOrder);
  }

  async updateAssignment(id: number, assignmentOrder: number) {
    // Check if assignment exists
    const assignment = await questionSetRepository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundError(`Assignment with ID ${id} not found`);
    }

    return questionSetRepository.updateAssignment(id, assignmentOrder);
  }

  async updateAssignmentByModelAndQuestionSet(modelId: number, questionSetId: number, assignmentOrder: number) {
    // Check if assignment exists
    const assignment = await questionSetRepository.findAssignment(modelId, questionSetId);
    if (!assignment) {
      throw new NotFoundError(`Assignment not found for model ${modelId} and question set ${questionSetId}`);
    }

    return questionSetRepository.updateAssignment(assignment.id, assignmentOrder);
  }

  async deleteAssignment(id: number) {
    // Check if assignment exists
    const assignment = await questionSetRepository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundError(`Assignment with ID ${id} not found`);
    }

    return questionSetRepository.deleteAssignment(id);
  }

  async deleteAssignmentByModelAndQuestionSet(modelId: number, questionSetId: number) {
    // Check if assignment exists
    const assignment = await questionSetRepository.findAssignment(modelId, questionSetId);
    if (!assignment) {
      throw new NotFoundError(`Assignment not found for model ${modelId} and question set ${questionSetId}`);
    }

    return questionSetRepository.deleteAssignmentByModelAndQuestionSet(modelId, questionSetId);
  }
}

export const questionSetService = new QuestionSetService(); 