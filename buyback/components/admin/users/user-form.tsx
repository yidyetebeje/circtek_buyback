"use client";

import React, { useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User, Key, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"; // For status
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For roles
import { useRoles } from '@/hooks/admin/useRoles'; // To fetch roles
import { UserFormValues as ExternalUserFormValues, Role } from '@/types/user'; // Renamed to avoid conflict
import { useWarehouses } from '@/hooks/useWarehouses';

// Zod schema for the form
const baseUserSchema = z.object({
  fName: z.string().min(1, { message: "First name is required." }),
  lName: z.string().min(1, { message: "Last name is required." }),
  userName: z.string().min(1, { message: "Username is required." }),
  roleId: z.string().optional(),
  status: z.boolean(),
  warehouseId: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long.").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  // Only validate passwords if password field is filled
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

// Combined schema
const userFormSchema = baseUserSchema.and(passwordSchema);

// Type for form values derived from Zod schema
export type UserFormValues = z.infer<typeof userFormSchema>;

// Add roleSlug to the values submitted to the backend
export interface UserFormSubmitValues extends Omit<UserFormValues, 'warehouseId' | 'roleId'> {
  id?: number;
  roleSlug?: string;
  warehouseId?: number;
}

interface UserFormProps {
  initialData?: Partial<UserFormValues> & { id?: number };
  onSubmit: (values: UserFormSubmitValues) => void; // onSubmit receives values with roleSlug
  onCancel: () => void;
  isLoading?: boolean;
  showRoleSelection?: boolean; // Add this prop
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showRoleSelection = true, // Default to true
}: UserFormProps) {
  // Fetch roles for the dropdown
  const { data: rolesResponse, isLoading: isLoadingRoles } = useRoles({ limit: 100 });
  const roles = rolesResponse?.data ?? [];

  const { data: warehousesResponse, isLoading: isLoadingWarehouses } = useWarehouses();
  const warehouses = warehousesResponse?.data ?? [];

  const preparedDefaultValues: UserFormValues = {
    fName: initialData?.fName || '',
    lName: initialData?.lName || '',
    userName: initialData?.userName || '',
    roleId: initialData?.roleId || '',
    status: initialData?.status === undefined ? true : initialData.status,
    warehouseId: initialData?.warehouseId || '',
    password: '',
    confirmPassword: '',
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: preparedDefaultValues,
  });

  useEffect(() => {
    // Reset form when initialData changes (e.g., when switching from create to edit)
    form.reset({
      ...preparedDefaultValues,
      ...initialData,
      roleId: showRoleSelection ? initialData?.roleId : undefined,
    });
  }, [initialData, form.reset, showRoleSelection]); // form.reset is stable

  const handleFormSubmit = (values: UserFormValues) => {
    let roleSlug: string | undefined;
    if (showRoleSelection) {
      const selectedRole = roles.find(role => String(role.id) === values.roleId);
      roleSlug = selectedRole?.slug;

      if (!roleSlug && values.roleId) {
        console.error("Selected role not found or slug is missing for roleId:", values.roleId);
        form.setError("roleId", { type: "manual", message: "Could not find role details. Please try again." });
        return;
      }

      if (roleSlug === 'shop_manager' && !values.warehouseId) {
        form.setError('warehouseId', { type: 'manual', message: 'Warehouse is required for Shop Manager' });
        return;
      }
    } else {
      // If role selection is hidden, we might want to ensure roleSlug isn't part of the submission
      roleSlug = undefined;
    }

    const { warehouseId: warehouseIdStr, roleId, ...restValues } = values;

    const submissionValues: UserFormSubmitValues = {
      ...restValues,
      warehouseId: warehouseIdStr ? Number(warehouseIdStr) : undefined,
    };

    if (roleSlug) {
      submissionValues.roleSlug = roleSlug;
    }

    if (initialData?.id) {
      submissionValues.id = initialData.id;
    }
    // Remove password fields if they are empty (important for updates)
    if (!submissionValues.password) {
      delete submissionValues.password;
      delete submissionValues.confirmPassword;
    }
    // roleId might not be needed by the backend if roleSlug is used for creation/update.
    // Decide if it should be removed, e.g., delete submissionValues.roleId;

    onSubmit(submissionValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FormField
            control={form.control}
            name="fName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input placeholder="John" {...field} disabled={isLoading} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input placeholder="Doe" {...field} disabled={isLoading} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input placeholder="johndoe" {...field} disabled={isLoading} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Render role select only if no forcedRoleSlug */}
          {showRoleSelection && (
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || isLoadingRoles}
                    >
                      <FormControl>
                        <SelectTrigger className="pl-9">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role: Role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 md:col-span-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active Account</FormLabel>
                  <FormDescription>
                    {field.value ? "User can log in" : "User cannot log in"}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password {initialData?.id ? "(Leave blank to keep current)" : "*"}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <Key className="h-4 w-4" />
                    </div>
                    <Input type="password" placeholder="******" {...field} disabled={isLoading} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password {initialData?.id ? "" : "*"}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <Key className="h-4 w-4" />
                    </div>
                    <Input type="password" placeholder="******" {...field} disabled={isLoading} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Warehouse dropdown for shop_manager placed here */}
        {(() => {
          if (!showRoleSelection) return null;
          const selectedRole = roles.find(r => String(r.id) === form.watch('roleId'));
          const isShopManagerSelected = selectedRole?.slug === 'shop_manager';
          if (!isShopManagerSelected) return null;

          return (
            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingWarehouses || isLoading || warehouses.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="pl-9">
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((wh: { id: number; name?: string; warehouseName?: string }) => (
                          <SelectItem key={wh.id} value={String(wh.id)}>
                            {wh.name || wh.warehouseName || `Location ${wh.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })()}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : (initialData?.id ? "Update User" : "Create User")}
          </Button>
        </div>
      </form>
    </Form>
  );
}