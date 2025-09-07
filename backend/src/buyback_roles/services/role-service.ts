import { RoleRepository } from "../repositories/role-repository";
import { InsertRoleDTO, UpdateRoleDTO, SelectRoleDTO } from "../types/role-types";
import { NotFoundError, InternalServerError } from "elysia";

export class RoleService {
  private roleRepository: RoleRepository;

  constructor() {
    this.roleRepository = new RoleRepository();
  }

  async getAllRoles(): Promise<SelectRoleDTO[]> {
    return this.roleRepository.findAll();
  }

  async getRoleById(id: number): Promise<SelectRoleDTO> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }
    return role;
  }
  
  async getRoleBySlug(slug: string): Promise<SelectRoleDTO> {
    const role = await this.roleRepository.findBySlug(slug);
    if (!role) {
      throw new NotFoundError(`Role with slug '${slug}' not found`);
    }
    return role;
  }

  async createRole(roleData: InsertRoleDTO): Promise<SelectRoleDTO> {
    if (!roleData.name) {
      throw new Error("Role name is required.");
    }
    const existingRoleByName = await this.roleRepository.findBySlug(roleData.name);
    if (existingRoleByName) {
        throw new Error(`Role with name '${roleData.name}' already exists`);
    }
    
    const newRole = await this.roleRepository.create(roleData);
    if (!newRole) {
        throw new InternalServerError("Failed to create role or retrieve it after creation.");
    }
    return newRole;
  }

  async updateRole(id: number, roleData: UpdateRoleDTO): Promise<SelectRoleDTO> {
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundError(`Role with ID ${id} not found to update`);
    }

    if (roleData.name && roleData.name !== existingRole.name) {
        const conflictingRole = await this.roleRepository.findBySlug(roleData.name);
        if (conflictingRole && conflictingRole.id !== id) {
            throw new Error(`Another role with name '${roleData.name}' already exists`);
        }
    }

    const updatedRole = await this.roleRepository.update(id, roleData);
    if (!updatedRole) {
        throw new InternalServerError(`Failed to update role with ID ${id} or retrieve it after update.`);
    }
    return updatedRole;
  }

  async deleteRole(id: number): Promise<SelectRoleDTO> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found to delete`);
    }
    const deletedRole = await this.roleRepository.delete(id);
    if (!deletedRole) {
        throw new InternalServerError(`Failed to delete role with ID ${id} or retrieve its state after deletion.`);
    }
    return deletedRole;
  }
} 