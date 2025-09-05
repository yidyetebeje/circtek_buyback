import { languageRepository } from "../repositories/languageRepository";
import { TLanguageCreate, TLanguageUpdate } from "../types/languageTypes";

export class LanguageService {
  async getAllLanguages(page = 1, limit = 20, orderBy = "id", order: "asc" | "desc" = "asc") {
    return languageRepository.findAll(page, limit, orderBy, order);
  }

  async getLanguageById(id: number) {
    const language = await languageRepository.findById(id);
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }
    return language;
  }

  async createLanguage(data: TLanguageCreate) {
    // Check if a language with the same code already exists
    const existingLanguage = await languageRepository.findByCode(data.code);
    if (existingLanguage) {
      throw new Error(`Language with code '${data.code}' already exists`);
    }

    return languageRepository.create(data);
  }

  async updateLanguage(id: number, data: TLanguageUpdate) {
    // Check if language exists
    const language = await languageRepository.findById(id);
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }

    // If updating code, check for duplicates
    if (data.code && data.code !== language.code) {
      const existingLanguage = await languageRepository.findByCode(data.code);
      if (existingLanguage) {
        throw new Error(`Language with code '${data.code}' already exists`);
      }
    }

    return languageRepository.update(id, data);
  }

  async deleteLanguage(id: number) {
    // Check if language exists
    const language = await languageRepository.findById(id);
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }

    // Prevent deleting the default language
    if (language.is_default === 1) {
      throw new Error("Cannot delete the default language");
    }

    return languageRepository.delete(id);
  }

  async setDefaultLanguage(id: number) {
    // Check if language exists
    const language = await languageRepository.findById(id);
    if (!language) {
      throw new Error(`Language with ID ${id} not found`);
    }

    return languageRepository.setDefault(id);
  }
}

export const languageService = new LanguageService();
