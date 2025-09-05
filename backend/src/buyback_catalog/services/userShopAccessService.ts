import { userShopAccessRepository, UserShopAccessCreate, UserShopAccessUpdate } from "../repositories/userShopAccessRepository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

export class UserShopAccessService {
  async getUserShopAccess(userId: number) {
    if (!userId || isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    return userShopAccessRepository.findByUserId(userId);
  }

  async getShopUsers(shopId: number) {
    if (!shopId || isNaN(shopId)) {
      throw new BadRequestError('Invalid shop ID');
    }
    
    return userShopAccessRepository.findByShopId(shopId);
  }

  async grantShopAccess(data: UserShopAccessCreate, requestingUserId: number) {
    const { userId, shopId } = data;
    
    if (!userId || !shopId) {
      throw new BadRequestError('User ID and Shop ID are required');
    }

    // Check if the requesting user has rights to grant access to this shop
    // Admin users or client owners/admins can grant access
    const hasAccess = await userShopAccessRepository.checkUserHasAccessToShop(requestingUserId, shopId, true);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to grant access to this shop');
    }

    // Check if access already exists
    const existingAccess = await userShopAccessRepository.findByUserAndShopId(userId, shopId);
    if (existingAccess) {
      throw new BadRequestError('User already has access to this shop');
    }

    // Create new access record
    data.createdBy = requestingUserId;
    const result = await userShopAccessRepository.create(data);

    if (!result) {
      throw new Error('Failed to grant shop access');
    }

    return result;
  }

  async updateShopAccess(userId: number, shopId: number, data: UserShopAccessUpdate, requestingUserId: number) {
    if (!userId || !shopId) {
      throw new BadRequestError('User ID and Shop ID are required');
    }

    // Check if the requesting user has rights to update access to this shop
    const hasAccess = await userShopAccessRepository.checkUserHasAccessToShop(requestingUserId, shopId, true);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to update access for this shop');
    }

    // Check if access exists
    const existingAccess = await userShopAccessRepository.findByUserAndShopId(userId, shopId);
    if (!existingAccess) {
      throw new NotFoundError('User does not have access to this shop');
    }

    // Update access
    return userShopAccessRepository.update(userId, shopId, data);
  }

  async revokeShopAccess(userId: number, shopId: number, requestingUserId: number) {
    if (!userId || !shopId) {
      throw new BadRequestError('User ID and Shop ID are required');
    }

    // Check if the requesting user has rights to revoke access to this shop
    const hasAccess = await userShopAccessRepository.checkUserHasAccessToShop(requestingUserId, shopId, true);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to revoke access for this shop');
    }

    // Check if access exists
    const existingAccess = await userShopAccessRepository.findByUserAndShopId(userId, shopId);
    if (!existingAccess) {
      throw new NotFoundError('User does not have access to this shop');
    }

    // Delete access
    const success = await userShopAccessRepository.delete(userId, shopId);
    return { success };
  }

  async checkUserHasAccessToShop(userId: number, shopId: number, requiresEdit: boolean = false) {
    return userShopAccessRepository.checkUserHasAccessToShop(userId, shopId, requiresEdit);
  }

  async getAccessibleShopIds(userId: number, requiresEdit: boolean = false) {
    return userShopAccessRepository.getAccessibleShopIds(userId, requiresEdit);
  }
}

export const userShopAccessService = new UserShopAccessService(); 