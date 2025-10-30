import { shopRepository } from "../repositories/shopRepository";
import { TShopCreate, TShopUpdate } from "../types/shopTypes";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors";
import { s3Service } from "./s3Service"; // Use s3Service for file uploads if available
import { userShopAccessRepository } from "../repositories/userShopAccessRepository";

export class ShopService {
  async getAllShops(
    page = 1,
    limit = 20,
    orderBy = "name",
    order: "asc" | "desc" = "asc",
    tenatId?: number,
    ownerId?: number,
    userId?: number,
    active?: boolean,
    search?: string
  ) {
    // If userId is provided, we need to filter by shops the user has access to
    if (userId) {
      const allowedShopIds = await userShopAccessRepository.getAccessibleShopIds(userId);
      return shopRepository.findAll(page, limit, orderBy, order, tenatId, ownerId, allowedShopIds, active, search);
    }
    
    return shopRepository.findAll(page, limit, orderBy, order, tenatId, ownerId, undefined, active, search);
  }

  async getShopById(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestError('Invalid shop ID');
    }

    const shop = await shopRepository.findById(id);
    if (!shop) {
      throw new NotFoundError(`Shop with ID ${id} not found`);
    }

    return shop;
  }

  async createShop(data: TShopCreate) {

    if (data.logo === undefined) {
      delete data.logo;
    }

    try {
      const newShop = await shopRepository.create(data);
      if (!newShop) {
        throw new InternalServerError('Failed to create shop in database. Please try again or contact support.');
      }

      return newShop;
    } catch (error: any) {
      // Check for database-specific errors
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        throw new BadRequestError('A shop with this name already exists. Please choose a different name.');
      }
      
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
        throw new BadRequestError('Invalid tenant ID or owner ID. Please verify the provided IDs.');
      }

      // If it's already a custom error, re-throw it
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof InternalServerError) {
        throw error;
      }

      // Log the original error for debugging
      console.error('Unexpected error creating shop:', error);
      throw new InternalServerError('An unexpected error occurred while creating the shop. Please try again.');
    }
  }

  async updateShop(id: number, data: TShopUpdate) {
    if (!id || isNaN(id)) {
      throw new BadRequestError('Invalid shop ID');
    }

    const existingShop = await shopRepository.findById(id);
    if (!existingShop) {
      throw new NotFoundError(`Shop with ID ${id} not found`);
    }

    // Validate updated fields
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestError('Shop name cannot be empty');
      }
      if (data.name.trim().length > 255) {
        throw new BadRequestError('Shop name cannot exceed 255 characters');
      }
    }

    if (data.organization !== undefined && data.organization && data.organization.length > 255) {
      throw new BadRequestError('Organization name cannot exceed 255 characters');
    }

    if (data.phone !== undefined && data.phone && data.phone.length > 255) {
      throw new BadRequestError('Phone number cannot exceed 255 characters');
    }

    // If logo is undefined, ensure it's not included in the update
    if (data.logo === undefined) {
      delete data.logo;
    }

    if (data.logo === null && existingShop.logo && typeof s3Service?.deleteFile === 'function') {
      try {
        await s3Service.deleteFile(existingShop.logo);
      } catch (deletionError) {
        console.error(`Failed to delete logo for shop ${id}:`, deletionError);
      }
    }

    try {
      return await shopRepository.update(id, data);
    } catch (error: any) {
      // Check for database-specific errors
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        throw new BadRequestError('A shop with this name already exists. Please choose a different name.');
      }

      // Log the original error for debugging
      console.error('Unexpected error updating shop:', error);
      throw new InternalServerError('An unexpected error occurred while updating the shop. Please try again.');
    }
  }

  async deleteShop(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestError('Invalid shop ID');
    }

    const existingShop = await shopRepository.findById(id);
    if (!existingShop) {
      throw new NotFoundError(`Shop with ID ${id} not found`);
    }

    // Handle logo deletion if s3Service is available
    if (existingShop.logo && typeof s3Service?.deleteFile === 'function') {
      try {
        await s3Service.deleteFile(existingShop.logo);
      } catch (error) {
        console.error(`Failed to delete logo for shop ${id}:`, error);
        // Continue with deletion even if file removal fails
      }
    }

    const deleted = await shopRepository.delete(id);
    if (!deleted) {
      throw new InternalServerError(`Failed to delete shop with ID ${id}. Please try again.`);
    }

    return { 
      success: true, 
      message: `Shop with ID ${id} has been deleted`
    };
  }

  async uploadShopLogo(id: number, file: File | Blob) {
    // Validate shop exists
    const shop = await this.getShopById(id);
    
    if (typeof s3Service?.uploadFile === 'function') {
      // Use S3 for file uploads if available
      const timestamp = Date.now();
      const fileType = typeof file.type === 'string' ? file.type : 'application/octet-stream';
      const extensionParts = fileType.split('/');
      const fileExtension = extensionParts.length > 1 ? extensionParts[1] : 'bin';
      const key = `shops/${id}/logo-${timestamp}.${fileExtension}`;
      
      // Delete old logo if it exists
      if (shop.logo && typeof s3Service.deleteFile === 'function') {
        try {
          await s3Service.deleteFile(shop.logo);
        } catch (error) {
          console.error(`Failed to delete old logo for shop ${id}:`, error);
        }
      }
      
      // Upload new logo
      const logoUrl = await s3Service.uploadFile(file, key, fileType);
      return shopRepository.update(id, { logo: logoUrl });
    } else {
      // Fallback to local path simulation
      const timestamp = new Date().getTime();
      const fileName = `shop_logo_${id}_${timestamp}`;
      const filePath = `/uploads/shop_logos/${fileName}`;
     
      return shopRepository.update(id, { logo: filePath });
    }
  }



  async getShopConfig(id: number) {
    if (!id || isNaN(id)) {
      throw new BadRequestError('Invalid shop ID');
    }

    const shopConfig = await shopRepository.findConfigByShopId(id);
    if (!shopConfig) {
      throw new NotFoundError(`Shop with ID ${id} not found`);
    }

    // Return just the config portion
    return shopConfig.config || {};
  }

  async updateShopConfig(id: number, configData: any) {
    if (!id || isNaN(id)) {
      throw new BadRequestError('Invalid shop ID');
    }

    // Validate the shop exists
    const existingShop = await shopRepository.findById(id);
    if (!existingShop) {
      throw new NotFoundError(`Shop with ID ${id} not found`);
    }

    // Update the config
    const updated = await shopRepository.updateConfig(id, configData);
    return updated ? updated.config : null;
  }
}

export const shopService = new ShopService(); 