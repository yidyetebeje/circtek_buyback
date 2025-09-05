import { questionSetService } from "../services/questionSetService";
import { 
  TQuestionSetCreate, 
  TQuestionSetUpdate,
  TQuestionSetWithQuestions,
  TQuestionSetWithQuestionsAndTranslations,
  TQuestionSetAssignmentCreate
} from "../types/questionSetTypes";
import { Context } from "elysia";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class QuestionSetController {
  // Question Set CRUD operations
  async getAllQuestionSets(
    page: number = 1, 
    limit: number = 20, 
    orderBy: string = "internalName", 
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    search?: string
  ) {
    try {
      return await questionSetService.getAllQuestionSets(page, limit, orderBy, order, tenantId, search);
    } catch (error) {
      console.error("Error in getAllQuestionSets:", error);
      throw error;
    }
  }

  async getQuestionSetById(id: number) {
    try {
      const questionSet = await questionSetService.getQuestionSetById(id);
      return {
        success: true,
        data: questionSet
      };
    } catch (error) {
      console.error(`Error in getQuestionSetById(${id}):`, error);
      throw error;
    }
  }

  async getQuestionSetByInternalName(internalName: string, tenantId: number) {
    try {
      return await questionSetService.getQuestionSetByInternalName(internalName, tenantId);
    } catch (error) {
      console.error(`Error in getQuestionSetByInternalName(${internalName}, ${tenantId}):`, error);
      throw error;
    }
  }

  async createQuestionSet(data: TQuestionSetCreate, tenantId: number) {
    try {
      const questionSet = await questionSetService.createQuestionSet(data, tenantId);
      return {
        success: true,
        data: questionSet,
        message: "Question set created successfully"
      };
    } catch (error) {
      console.error("Error in createQuestionSet:", error);
      throw error;
    }
  }

  async updateQuestionSet(id: number, data: TQuestionSetUpdate) {
    try {
      const questionSet = await questionSetService.updateQuestionSet(id, data);
      return {
        success: true,
        data: questionSet,
        message: "Question set updated successfully"
      };
    } catch (error) {
      console.error(`Error in updateQuestionSet(${id}):`, error);
      throw error;
    }
  }

  async deleteQuestionSet(id: number) {
    try {
      await questionSetService.deleteQuestionSet(id);
      return { 
        success: true, 
        message: `Question set with ID ${id} deleted successfully` 
      };
    } catch (error) {
      console.error(`Error in deleteQuestionSet(${id}):`, error);
      throw error;
    }
  }

  // Question Set with Questions operations
  async createQuestionSetWithQuestions(data: any, tenantId: number) {
    try {
      const questionSet = await questionSetService.createQuestionSetWithQuestions(data, tenantId);
      return {
        success: true,
        data: questionSet,
        message: "Question set with questions created successfully"
      };
    } catch (error) {
      console.error("Error in createQuestionSetWithQuestions:", error);
      throw error;
    }
  }

  async createQuestionSetWithQuestionsAndTranslations(data: any, tenantId: number) {
    try {
      const questionSet = await questionSetService.createQuestionSetWithQuestionsAndTranslations(data, tenantId);
      return {
        success: true,
        data: questionSet,
        message: "Question set with questions and translations created successfully"
      };
    } catch (error) {
      console.error("Error in createQuestionSetWithQuestionsAndTranslations:", error);
      throw error;
    }
  }

  // Translation methods
  async getTranslationsByQuestionSet(questionSetId: number) {
    try {
      const translations = await questionSetService.getTranslationsByQuestionSet(questionSetId);
      return {
        success: true,
        data: translations,
        message: "Translations retrieved successfully"
      };
    } catch (error) {
      console.error(`Error in getTranslationsByQuestionSet(${questionSetId}):`, error);
      throw error;
    }
  }

  async createTranslation(questionSetId: number, data: any) {
    try {
      return await questionSetService.createTranslation(questionSetId, data);
    } catch (error) {
      console.error(`Error in createTranslation(${questionSetId}):`, error);
      throw error;
    }
  }

  async updateTranslation(questionSetId: number, languageId: number, data: any) {
    try {
      return await questionSetService.updateTranslation(questionSetId, languageId, data);
    } catch (error) {
      console.error(`Error in updateTranslation(${questionSetId}, ${languageId}):`, error);
      throw error;
    }
  }

  async deleteTranslation(questionSetId: number, languageId: number) {
    try {
      await questionSetService.deleteTranslation(questionSetId, languageId);
      return { 
        success: true, 
        message: `Translation deleted successfully` 
      };
    } catch (error) {
      console.error(`Error in deleteTranslation(${questionSetId}, ${languageId}):`, error);
      throw error;
    }
  }

  // Question Translation methods
  async getQuestionTranslations(questionId: number) {
    try {
      return await questionSetService.getQuestionTranslations(questionId);
    } catch (error) {
      console.error(`Error in getQuestionTranslations(${questionId}):`, error);
      throw error;
    }
  }

  async createQuestionTranslation(questionId: number, data: any) {
    try {
      return await questionSetService.createQuestionTranslation(questionId, data);
    } catch (error) {
      console.error(`Error in createQuestionTranslation(${questionId}):`, error);
      throw error;
    }
  }

  async updateQuestionTranslation(questionId: number, languageId: number, data: any) {
    try {
      return await questionSetService.updateQuestionTranslation(questionId, languageId, data);
    } catch (error) {
      console.error(`Error in updateQuestionTranslation(${questionId}, ${languageId}):`, error);
      throw error;
    }
  }

  async deleteQuestionTranslation(questionId: number, languageId: number) {
    try {
      await questionSetService.deleteQuestionTranslation(questionId, languageId);
      return { 
        success: true, 
        message: `Question translation deleted successfully` 
      };
    } catch (error) {
      console.error(`Error in deleteQuestionTranslation(${questionId}, ${languageId}):`, error);
      throw error;
    }
  }

  // Option Translation methods
  async getOptionTranslations(optionId: number) {
    try {
      return await questionSetService.getOptionTranslations(optionId);
    } catch (error) {
      console.error(`Error in getOptionTranslations(${optionId}):`, error);
      throw error;
    }
  }

  async createOptionTranslation(optionId: number, data: any) {
    try {
      return await questionSetService.createOptionTranslation(optionId, data);
    } catch (error) {
      console.error(`Error in createOptionTranslation(${optionId}):`, error);
      throw error;
    }
  }

  async updateOptionTranslation(optionId: number, languageId: number, data: any) {
    try {
      return await questionSetService.updateOptionTranslation(optionId, languageId, data);
    } catch (error) {
      console.error(`Error in updateOptionTranslation(${optionId}, ${languageId}):`, error);
      throw error;
    }
  }

  async deleteOptionTranslation(optionId: number, languageId: number) {
    try {
      await questionSetService.deleteOptionTranslation(optionId, languageId);
      return { 
        success: true, 
        message: `Option translation deleted successfully` 
      };
    } catch (error) {
      console.error(`Error in deleteOptionTranslation(${optionId}, ${languageId}):`, error);
      throw error;
    }
  }

  // Assignment methods
  async getQuestionSetsForModel(modelId: number) {
    try {
      return await questionSetService.getQuestionSetsForModel(modelId);
    } catch (error) {
      console.error(`Error in getQuestionSetsForModel(${modelId}):`, error);
      throw error;
    }
  }

  async getModelsByQuestionSet(
    questionSetId: number,
    page: number = 1,
    limit: number = 20,
    ctx: Context
  ) {
    try {
      if (isNaN(questionSetId)) throw new BadRequestError('Invalid question set ID');
      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value');

      return await questionSetService.getModelsByQuestionSet(questionSetId, page, limit);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error(`Error in getModelsByQuestionSet(${questionSetId}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve models for question set' };
    }
  }

  async assignQuestionSetToModel(data: TQuestionSetAssignmentCreate) {
    try {
      const assignment = await questionSetService.assignQuestionSetToModel(
        data.modelId,
        data.questionSetId,
        data.assignmentOrder
      );
      return {
        success: true,
        data: assignment,
        message: "Question set assigned to model successfully"
      };
    } catch (error) {
      console.error(`Error in assignQuestionSetToModel:`, error);
      throw error;
    }
  }

  async updateAssignment(id: number, assignmentOrder: number) {
    try {
      const assignment = await questionSetService.updateAssignment(id, assignmentOrder);
      return {
        success: true,
        data: assignment,
        message: "Assignment updated successfully"
      };
    } catch (error) {
      console.error(`Error in updateAssignment(${id}):`, error);
      throw error;
    }
  }

  async updateAssignmentByModelAndQuestionSet(
    modelId: number,
    questionSetId: number,
    assignmentOrder: number
  ) {
    try {
      const assignment = await questionSetService.updateAssignmentByModelAndQuestionSet(
        modelId,
        questionSetId,
        assignmentOrder
      );
      return {
        success: true,
        data: assignment,
        message: "Assignment updated successfully"
      };
    } catch (error) {
      console.error(`Error in updateAssignmentByModelAndQuestionSet(${modelId}, ${questionSetId}):`, error);
      throw error;
    }
  }

  async deleteAssignment(id: number) {
    try {
      await questionSetService.deleteAssignment(id);
      return {
        success: true,
        message: "Assignment deleted successfully"
      };
    } catch (error) {
      console.error(`Error in deleteAssignment(${id}):`, error);
      throw error;
    }
  }

  async deleteAssignmentByModelAndQuestionSet(modelId: number, questionSetId: number) {
    try {
      await questionSetService.deleteAssignmentByModelAndQuestionSet(modelId, questionSetId);
      return {
        success: true,
        message: "Assignment deleted successfully"
      };
    } catch (error) {
      console.error(`Error in deleteAssignmentByModelAndQuestionSet(${modelId}, ${questionSetId}):`, error);
      throw error;
    }
  }
}

export const questionSetController = new QuestionSetController(); 