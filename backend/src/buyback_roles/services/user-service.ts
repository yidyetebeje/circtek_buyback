import { UserRepository } from '../repositories/user-repository';
import { RoleService } from './role-service';
import { ShopAccessService } from './shopAccessService';
import { CreateUserWithRoleDTO, UpdateUserRoleDTO, UpdateUserDTO, ListUsersQueryDTO } from '../types/user-types';
import { NotFoundError, InternalServerError, error } from 'elysia';
import { type AuthContext } from '../types/auth-types';

export class UserService {
  private userRepository: UserRepository;
  private roleService: RoleService;
  private shopAccessService: ShopAccessService;

  constructor() {
    this.userRepository = new UserRepository();
    this.roleService = new RoleService();
    this.shopAccessService = new ShopAccessService();
  }

  async createUserWithRole(userData: CreateUserWithRoleDTO & { clientId: number }) {
    // Check if username or email already exists
    const existingByEmail = await this.userRepository.findByEmail(userData.email);
    if (existingByEmail) {
      throw new Error('User with this email already exists.');
    }

    const existingByUsername = await this.userRepository.findByUserName(userData.userName);
    if (existingByUsername) {
      throw new Error('User with this username already exists.');
    }

    // Find the role by name
    const role = await this.userRepository.findRoleByName(userData.roleSlug);
    if (!role) {
      throw new Error(`Role with name '${userData.roleSlug}' not found.`);
    }

    // Create the user with the role
    const newUser = await this.userRepository.createUserWithRole(userData, role.id, userData.clientId);
    if (!newUser) {
      throw new InternalServerError('Failed to create user or retrieve it after creation.');
    }
    
    // If managed_shop_id is provided, add it to user's accessible shops
    if (userData.managed_shop_id) {
      try {
        const shopId = Number(userData.managed_shop_id);
        if (!isNaN(shopId)) {
          // Grant full access to the managed shop (both view and edit)
          await this.shopAccessService.addShopAccess(newUser.id, shopId, true, true);
        }
      } catch (error) {
        console.warn(`Failed to grant access to managed shop id ${userData.managed_shop_id}:`, error);
        // We don't throw here to ensure user creation still succeeds
      }
    }

    // Return user with role information
    return {
      id: newUser.id,
      name: newUser.name,
      user_name: newUser.user_name,
      email: newUser.email,
      roleName: role.name,
      roleSlug: role.name,
      managed_shop_id: userData.managed_shop_id,
    };
  }

  async updateUserRole(userId: number, updateData: UpdateUserRoleDTO) {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    // Find the role by name
    const role = await this.userRepository.findRoleByName(updateData.roleSlug);
    if (!role) {
      throw new Error(`Role with name '${updateData.roleSlug}' not found.`);
    }

    // Update the user's role
    const updatedUser = await this.userRepository.updateUserRole(userId, role.id);
    if (!updatedUser) {
      throw new InternalServerError(`Failed to update user with ID ${userId} or retrieve it after update.`);
    }

    // Return user with updated role information
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      user_name: updatedUser.user_name,
      email: updatedUser.email,
      roleName: role.name,
      roleSlug: role.name,
    };
  }

  async updateUser(userId: number, updateData: UpdateUserDTO) {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    // Prepare update data for repository
    const repositoryUpdateData: any = {};

    // Copy basic fields
    if (updateData.fName !== undefined) repositoryUpdateData.name = updateData.fName;
    if (updateData.lName !== undefined) repositoryUpdateData.name = updateData.lName;
    if (updateData.userName !== undefined) repositoryUpdateData.user_name = updateData.userName;
    if (updateData.email !== undefined) repositoryUpdateData.email = updateData.email;
    if (updateData.password !== undefined) repositoryUpdateData.password = updateData.password;
    if (updateData.status !== undefined) repositoryUpdateData.status = updateData.status;
    if (updateData.clientId !== undefined) repositoryUpdateData.tenant_id = updateData.clientId;
    if (updateData.warehouseId !== undefined) repositoryUpdateData.warehouse_id = updateData.warehouseId;

    // Handle managed_shop_id
    if (updateData.managed_shop_id !== undefined) repositoryUpdateData.managed_shop_id = updateData.managed_shop_id;

    // Handle role update if roleSlug is provided
    if (updateData.roleSlug !== undefined) {
      const role = await this.userRepository.findRoleByName(updateData.roleSlug);
      if (!role) {
        throw new Error(`Role with slug '${updateData.roleSlug}' not found.`);
      }
      repositoryUpdateData.role_id = role.id;
    }

    // Update the user
    const updatedUser = await this.userRepository.updateUser(userId, repositoryUpdateData);
    if (!updatedUser) {
      throw new InternalServerError(`Failed to update user with ID ${userId} or retrieve it after update.`);
    }

    // Get role information for response
    const role = updatedUser.role_id ? await this.userRepository.findRoleById(updatedUser.role_id) : null;

    // Return user with complete information
    return {
      id: updatedUser.id,
      name: updatedUser.name || '',
      user_name: updatedUser.user_name || '',
      email: updatedUser.email || '',
      status: updatedUser.status,
      role_id: updatedUser.role_id,
      roleName: role?.name || '',
      roleSlug: role?.name || '',
      tenant_id: updatedUser.tenant_id,
      warehouse_id: updatedUser.warehouse_id,
      managed_shop_id: updatedUser.managed_shop_id,
    };
  }

  // Method to list users with pagination, sorting, and filtering
  async listUsers(queryParams: ListUsersQueryDTO, authContext?: AuthContext) {
    let filterByAuthClientId: number | undefined = undefined;

    if (authContext) {
      if ((authContext.roleSlug === 'client' || authContext.roleSlug === 'admin') && authContext.clientId !== undefined) {
        filterByAuthClientId = authContext.clientId;
        if(authContext.roleSlug === 'client'){
          filterByAuthClientId = authContext.id;
          if (queryParams.clientId !== undefined && queryParams.clientId !== filterByAuthClientId) {
            console.warn(`Client admin attempted to query for clientId ${queryParams.clientId}, enforcing own clientId ${filterByAuthClientId}`);
            queryParams.clientId = undefined;
          }
        }
      } else if (authContext.roleSlug === 'super-admin') {
        // Super admin behavior (can see all or filter by queryParams.clientId)
      } else {
        throw error(403, 'You do not have permission to list users with your current role.');
      }
    } else {
      throw error(401, 'Authentication required to list users.');
    }

    const result = await this.userRepository.findManyPaginated(queryParams, filterByAuthClientId);
    return result;
  }
  
  // Method to get a user by ID with role information
  async getUserById(userId: number, authContext?: AuthContext) {
    if (!authContext) {
      throw error(401, 'Authentication required to get user details.');
    }
    
    // Only super-admin, admin, and client roles can access user details
    if (!['super-admin', 'admin', 'client', 'shop_manager'].includes(authContext.roleSlug || '')) {
      throw error(403, 'You do not have permission to access user details with your current role.');
    }
    
    // Get the user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }
    
    // For 'client' role, they can only access users from their own client account.
    // The client's own user ID is the `tenant_id` for all users under their account.
    if (authContext.roleSlug === 'client') {
      if (user.tenant_id !== authContext.id) {
        throw new NotFoundError(`User not found or you don't have permission to access this user.`);
      }
    }
    
    // For 'admin' role, they can only access users from their assigned client.
    if (authContext.roleSlug === 'admin' && authContext.clientId !== undefined) {
      if (user.tenant_id !== authContext.clientId) {
        throw new NotFoundError(`User not found or you don't have permission to access this user.`);
      }
    }
    
    const role = user.role_id ? await this.userRepository.findRoleById(user.role_id) : null;
    
    return {
      id: user.id,
      name: user.name,
      user_name: user.user_name,
      email: user.email,
      role_id: user.role_id,
      roleName: role?.name || '',
      roleSlug: role?.name || '',
      tenant_id: user.tenant_id,
      warehouse_id: user.warehouse_id,
      managed_shop_id: user.managed_shop_id,
      created_at: user.created_at,
      role: role ? {
        id: role.id,
        name: role.name,
        description: role.description
      } : null
    };
  }
} 