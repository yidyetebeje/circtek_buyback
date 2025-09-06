import { NotFoundError, InternalServerError, error, type Context, type Static } from 'elysia';
import { t } from 'elysia'; // Import t for TypeBox
import { UserService } from '../services/user-service';
import {
  createUserWithRoleSchema,
  updateUserRoleSchema,
  userIdParamSchema,
  userWithRoleResponseSchema,
  listUsersQuerySchema,
  paginatedUsersResponseSchema,
  type ListUsersQueryDTO,
  type CreateUserWithRoleDTO,
  type UpdateUserRoleDTO,
  updateUserSchema,
  type UpdateUserDTO
} from '../types/user-types';
import { type JwtUser } from '../../catalog/types/authTypes';
import { type AuthContext } from '../types/auth-types'; // Import AuthContext

// Define a more focused base for handler context
// It includes general Elysia context properties needed by handlers,
// but omits params, query, body, which will be route-specific.
export interface BaseHandlerContext {
  set: Context['set'];
  store: Context['store']; // Example, add others like request if used directly
  // Add other specific Elysia context properties if your handlers use them directly
}

// HandlerContext now combines the base with your custom decorators/derived properties.
export interface HandlerContext extends BaseHandlerContext {
  userService: UserService;
  user?: JwtUser | null; // Authenticated user from JWT (can be null from middleware)
}

export class UserController {
  private userService: UserService;

  constructor(userServiceInstance?: UserService) {
    this.userService = userServiceInstance || new UserService();
  }

  public async listUsersHandler(context: HandlerContext & { query: Static<typeof listUsersQuerySchema> }) {
    const { query, userService, set, user } = context;
    try {
      const authContextForService: AuthContext | undefined = user ? { 
        id: user.id, 
        clientId: user.clientId,
        roleSlug: user.roleSlug
      } : undefined;

      const result = await userService.listUsers(query as ListUsersQueryDTO, authContextForService);
      set.status = 200;
      return {
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (e: any) {
      console.error('Error in listUsersHandler:', e); 
      
      if (e instanceof NotFoundError) {
        set.status = 404;
        return {
          success: false,
          message: 'No users found matching the specified criteria.',
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 },
          errorCode: 'NO_USERS_FOUND'
        };
      } else if (e.status === 401) { 
        set.status = 401;
        return {
          success: false,
          message: 'Authentication required. Please log in and try again.',
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 },
          errorCode: 'AUTHENTICATION_REQUIRED'
        };
      } else if (e.status === 403) { 
        set.status = 403;
        return {
          success: false,
          message: 'You do not have permission to list users. Please contact your administrator.',
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 },
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      } else if (e instanceof InternalServerError) {
        set.status = 500;
        return {
          success: false,
          message: 'An internal server error occurred. Please try again later or contact support.',
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 },
          errorCode: 'INTERNAL_ERROR'
        };
      } else {
        set.status = 400;
        return {
          success: false,
          message: e.message || 'Failed to retrieve users. Please check your request and try again.',
          data: [],
          meta: { total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 },
          errorCode: 'RETRIEVAL_ERROR'
        };
      }
    }
  }

  public async createUserHandler(context: HandlerContext & { body: Static<typeof createUserWithRoleSchema> }) {
    const { body, userService, set, user } = context; 
    try {
      // Create user data with body properties
      const userData: CreateUserWithRoleDTO & { clientId: number } = {
        ...body as CreateUserWithRoleDTO,
        clientId: 0 // Default value, will be overridden
      };
      
      // Set client ID from authenticated user
      if (user) {
        if (user.roleSlug === 'client') {
          userData.clientId = user.id;
        } else {
          // Ensure clientId is always a number (use 0 as default if undefined)
          userData.clientId = user.clientId || 0;
        }
      }
      
      // If role is shop_manager, warehouseId must be provided
      if (userData.roleSlug === 'shop_manager') {
        if (!userData.warehouseId || Number(userData.warehouseId) === 0) {
          throw new Error('Warehouse ID is required for shop manager users.');
        }
      }
      
      const newUser = await userService.createUserWithRole(userData);
      set.status = 201;
      return {
        success: true,
        message: 'User created successfully',
        data: newUser,
      };
    } catch (e: any) {
      console.error('Error in createUserHandler:', e);
      
      // More specific error handling
      if (e.message?.includes('email already exists')) {
        set.status = 409; 
        return { 
          success: false, 
          message: 'A user with this email address already exists. Please use a different email address.',
          errorCode: 'EMAIL_EXISTS'
        };
      } else if (e.message?.includes('username already exists')) {
        set.status = 409; 
        return { 
          success: false, 
          message: 'A user with this username already exists. Please choose a different username.',
          errorCode: 'USERNAME_EXISTS'
        };
      } else if (e.message?.includes('Role with slug') && e.message?.includes('not found')) {
        set.status = 400; 
        return { 
          success: false, 
          message: 'The specified role is invalid or does not exist. Please select a valid role.',
          errorCode: 'INVALID_ROLE'
        };
      } else if (e.message?.includes('Failed to grant access to managed shop')) {
        // Shop access warning - user was created but shop access failed
        set.status = 201; // Still successful creation
        return { 
          success: true, 
          message: 'User created successfully, but there was an issue assigning shop access. Please assign shop access manually.',
          warning: 'SHOP_ACCESS_FAILED'
        };
      } else if (e.status === 401) {
        set.status = 401;
        return { 
          success: false, 
          message: 'Authentication required. Please log in and try again.',
          errorCode: 'AUTHENTICATION_REQUIRED'
        };
      } else if (e.status === 403) {
        set.status = 403;
        return { 
          success: false, 
          message: 'You do not have permission to create users. Please contact your administrator.',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      } else if (e instanceof InternalServerError) {
        set.status = 500;
        return { 
          success: false, 
          message: 'An internal server error occurred. Please try again later or contact support.',
          errorCode: 'INTERNAL_ERROR'
        };
      } else {
        set.status = 400;
        return { 
          success: false, 
          message: e.message || 'Failed to create user. Please check your input and try again.',
          errorCode: 'VALIDATION_ERROR'
        };
      }
    }
  }

  public async updateUserRoleHandler(context: HandlerContext & { params: Static<typeof userIdParamSchema>, body: Static<typeof updateUserRoleSchema> }) {
    const { params, body, userService, set } = context; 
    try {
      const updatedUser = await userService.updateUserRole(params.id, body as UpdateUserRoleDTO);
      set.status = 200;
      return {
        success: true,
        message: 'User role updated successfully',
        data: updatedUser,
      };
    } catch (e: any) {
      console.error('Error in updateUserRoleHandler:', e);
      
      if (e instanceof NotFoundError) {
        set.status = 404;
        return { 
          success: false, 
          message: 'User not found. The user may have been deleted or the ID is incorrect.',
          errorCode: 'USER_NOT_FOUND'
        };
      } else if (e.message?.includes('Role with slug') && e.message?.includes('not found')) {
        set.status = 400; 
        return { 
          success: false, 
          message: 'The specified role is invalid or does not exist. Please select a valid role.',
          errorCode: 'INVALID_ROLE'
        };
      } else if (e.status === 401) {
        set.status = 401;
        return { 
          success: false, 
          message: 'Authentication required. Please log in and try again.',
          errorCode: 'AUTHENTICATION_REQUIRED'
        };
      } else if (e.status === 403) {
        set.status = 403;
        return { 
          success: false, 
          message: 'You do not have permission to update user roles. Please contact your administrator.',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      } else if (e instanceof InternalServerError) {
        set.status = 500;
        return { 
          success: false, 
          message: 'An internal server error occurred. Please try again later or contact support.',
          errorCode: 'INTERNAL_ERROR'
        };
      } else {
        set.status = 400;
        return { 
          success: false, 
          message: e.message || 'Failed to update user role. Please check your input and try again.',
          errorCode: 'VALIDATION_ERROR'
        };
      }
    }
  }

  public async updateUserHandler(context: HandlerContext & { params: Static<typeof userIdParamSchema>, body: Static<typeof updateUserSchema> }) {
    const { params, body, userService, set } = context; 
    try {
      const updatedUser = await userService.updateUser(params.id, body as UpdateUserDTO);
      set.status = 200;
      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (e: any) {
      console.error('Error in updateUserHandler:', e);
      
      if (e instanceof NotFoundError) {
        set.status = 404;
        return { 
          success: false, 
          message: 'User not found. The user may have been deleted or the ID is incorrect.',
          errorCode: 'USER_NOT_FOUND'
        };
      } else if (e.message?.includes('Role with slug') && e.message?.includes('not found')) {
        set.status = 400; 
        return { 
          success: false, 
          message: 'The specified role is invalid or does not exist. Please select a valid role.',
          errorCode: 'INVALID_ROLE'
        };
      } else if (e.message?.includes('Email is already in use')) {
        set.status = 409; 
        return { 
          success: false, 
          message: 'The email address is already in use by another user. Please choose a different email.',
          errorCode: 'EMAIL_CONFLICT'
        };
      } else if (e.message?.includes('Username is already in use')) {
        set.status = 409; 
        return { 
          success: false, 
          message: 'The username is already in use by another user. Please choose a different username.',
          errorCode: 'USERNAME_CONFLICT'
        };
      } else if (e.status === 401) {
        set.status = 401;
        return { 
          success: false, 
          message: 'Authentication required. Please log in and try again.',
          errorCode: 'AUTHENTICATION_REQUIRED'
        };
      } else if (e.status === 403) {
        set.status = 403;
        return { 
          success: false, 
          message: 'You do not have permission to update users. Please contact your administrator.',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      } else if (e instanceof InternalServerError) {
        set.status = 500;
        return { 
          success: false, 
          message: 'An internal server error occurred. Please try again later or contact support.',
          errorCode: 'INTERNAL_ERROR'
        };
      } else {
        set.status = 400;
        return { 
          success: false, 
          message: e.message || 'Failed to update user. Please check your input and try again.',
          errorCode: 'VALIDATION_ERROR'
        };
      }
    }
  }

  public async getUserByIdHandler(context: HandlerContext & { params: Static<typeof userIdParamSchema> }) {
    const { params, userService, set, user } = context;
    try {
      const authContextForService: AuthContext | undefined = user ? { 
        id: user.id, 
        clientId: user.clientId,
        roleSlug: user.roleSlug
      } : undefined;

      const result = await userService.getUserById(params.id, authContextForService);
      set.status = 200;
      return {
        success: true,
        message: 'User retrieved successfully',
        data: result,
      };
    } catch (e: any) {
      console.error('Error in getUserByIdHandler:', e);
      
      if (e instanceof NotFoundError) {
        set.status = 404;
        return { 
          success: false, 
          message: 'User not found. The user may have been deleted or you may not have access to view this user.',
          errorCode: 'USER_NOT_FOUND'
        };
      } else if (e.status === 401) { 
        set.status = 401;
        return { 
          success: false, 
          message: 'Authentication required. Please log in and try again.',
          errorCode: 'AUTHENTICATION_REQUIRED'
        };
      } else if (e.status === 403) { 
        set.status = 403;
        return { 
          success: false, 
          message: 'You do not have permission to view this user. Please contact your administrator.',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      } else if (e instanceof InternalServerError) {
        set.status = 500;
        return { 
          success: false, 
          message: 'An internal server error occurred. Please try again later or contact support.',
          errorCode: 'INTERNAL_ERROR'
        };
      } else {
        set.status = 400;
        return { 
          success: false, 
          message: e.message || 'Failed to retrieve user. Please try again.',
          errorCode: 'RETRIEVAL_ERROR'
        };
      }
    }
  }
} 