import { languageService } from "../services/languageService";
import { TLanguageCreate, TLanguageUpdate } from "../types/languageTypes";

export class LanguageController {
  async getAllLanguages(page: number = 1, limit: number = 20, orderBy: string = "id", order: "asc" | "desc" = "asc") {
    try {
      return await languageService.getAllLanguages(page, limit, orderBy, order);
    } catch (error) {
      console.error("Error in getAllLanguages:", error);
      throw error;
    }
  }

  async getLanguageById(id: number) {
    try {
      return await languageService.getLanguageById(id);
    } catch (error) {
      console.error(`Error in getLanguageById(${id}):`, error);
      throw error;
    }
  }

  async createLanguage(data: TLanguageCreate) {
    try {
      return await languageService.createLanguage(data);
    } catch (error) {
      console.error("Error in createLanguage:", error);
      throw error;
    }
  }

  async updateLanguage(id: number, data: TLanguageUpdate) {
    try {
      return await languageService.updateLanguage(id, data);
    } catch (error) {
      console.error(`Error in updateLanguage(${id}):`, error);
      throw error;
    }
  }

  async deleteLanguage(id: number) {
    try {
      await languageService.deleteLanguage(id);
      return { success: true, message: `Language with ID ${id} deleted successfully` };
    } catch (error) {
      console.error(`Error in deleteLanguage(${id}):`, error);
      throw error;
    }
  }

  async setDefaultLanguage(id: number) {
    try {
      return await languageService.setDefaultLanguage(id);
    } catch (error) {
      console.error(`Error in setDefaultLanguage(${id}):`, error);
      throw error;
    }
  }
}

export const languageController = new LanguageController();
