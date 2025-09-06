import { Elysia, error, t } from 'elysia';
import { UserController, type HandlerContext } from '../controllers/user-controller';
import { authMiddleware, type JwtUser } from '@/middleware/auth';
import { UserService } from '../services/user-service'; // Import UserService
import {
    createUserWithRoleSchema,
    updateUserRoleSchema,
    updateUserSchema,
    userIdParamSchema,
    userWithRoleResponseSchema,
    userUpdateResponseSchema,
    listUsersQuerySchema,
    paginatedUsersResponseSchema
} from '../types/user-types';

// No need for JWT secret as we're using centralized auth middleware

const userService = new UserService(); // Instantiate UserService
const userController = new UserController(userService); // Pass instance to controller

// Create and export the user routes with authentication using centralized middleware
export const userRoutes = new Elysia({ prefix: '' })
  .decorate('userService', userService) // Decorate with userService instance
  .group('/users', (group) =>
    group
      .use(authMiddleware.isAuthenticated)
      .get('/', (context) => userController.listUsersHandler(context), {
        query: listUsersQuerySchema,
        detail: {
          summary: 'List users',
          description: 'Retrieves a paginated list of users. Requires authentication.',
          tags: ['Users'],
        },
      })
      .get('/:id', (context) => userController.getUserByIdHandler(context), {
        params: userIdParamSchema,
        detail: {
          summary: 'Get a user by ID',
          description: 'Retrieves a specific user by their ID. Requires authentication.',
          tags: ['Users'],
        },
      })
      .post('/create', (context) => userController.createUserHandler(context), {
        body: createUserWithRoleSchema,
        detail: {
          summary: 'Create a new user with a role',
          description: 'Creates a new user. Requires authentication.',
          tags: ['Users'],
        },
      })
      .put('/:id', (context) => userController.updateUserHandler(context), {
        params: userIdParamSchema,
        body: updateUserSchema,
        response: {
          200: userUpdateResponseSchema,
          400: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
          401: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
          403: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
          404: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
          409: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
          500: t.Object({ success: t.Boolean(), message: t.String(), errorCode: t.Optional(t.String()) }),
        },
        detail: {
          summary: 'Update a user',
          description: 'Updates user information including profile data, role, and permissions. Requires authentication.',
          tags: ['Users'],
        },
      })
      .put('/:id/role', (context) => userController.updateUserRoleHandler(context), {
        params: userIdParamSchema,
        body: updateUserRoleSchema,
        detail: {
          summary: "Update a user's role",
          description: "Updates a user's role. Requires authentication.",
          tags: ['Users'],
        },
      })
  ); 