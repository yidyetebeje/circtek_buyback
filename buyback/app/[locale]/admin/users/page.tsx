"use client";

import React, { useState, useMemo, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/catalog/data-table";
import { useUsers } from "@/hooks/admin/useUsers";
import { User } from "@/types/user";
import { PlusCircle, Pencil } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

const UsersPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageQuery = searchParams.get("page") ? parseInt(searchParams.get("page") as string, 10) : 1;
  const limitQuery = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string, 10) : 10;
  const searchQuery = searchParams.get("search") || undefined;

  const [pagination, setPagination] = useState({
    pageIndex: pageQuery - 1, // DataTable uses 0-based index
    pageSize: limitQuery,
  });

  const debouncedSearchTerm = searchQuery; // Add debounce if needed for search input
  const {
    data: usersResponse,
    isLoading,
    error
  } = useUsers({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedSearchTerm,
    roleSlug: 'shop_manager', // Only fetch shop managers
  });

  const data = useMemo(() => usersResponse?.data ?? [], [usersResponse]);
  const rowCount = useMemo(() => usersResponse?.meta?.total ?? 0, [usersResponse]);

  const handleRowClick = (row: User) => {
    router.push(`${pathname}/${row.id}`);
  };

  // This callback updates the local pagination state and syncs URL params
  const handlePaginationChange = useCallback(
    (updaterOrValue: React.SetStateAction<{ pageIndex: number; pageSize: number }>) => {
      setPagination(currentPagination => {
        const newPagination = typeof updaterOrValue === 'function'
          ? updaterOrValue(currentPagination)
          : updaterOrValue;

        const params = new URLSearchParams(searchParams.toString());
        params.set("page", (newPagination.pageIndex + 1).toString());
        params.set("limit", newPagination.pageSize.toString());
        if (debouncedSearchTerm) { // Persist search term
          params.set("search", debouncedSearchTerm);
        }
        router.replace(`${pathname}?${params.toString()}`);
        return newPagination;
      });
    },
    [router, pathname, searchParams, debouncedSearchTerm]
  );

  // Define columns for the data table
  const columns = useMemo<ColumnDef<User, unknown>[]>(() => [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "fName", header: "First Name", cell: ({ row }) => row.original.fName || '-' },
    { accessorKey: "lName", header: "Last Name", cell: ({ row }) => row.original.lName || '-' },
    { accessorKey: "userName", header: "Username", cell: ({ row }) => row.original.userName || '-' },
    { id: "roleTitle", header: "Role", accessorFn: (row) => row.role?.title || 'N/A' },
    { accessorKey: "status", header: "Status", cell: ({ row }) => (row.original.status ? "Active" : "Inactive") },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            asChild
            title="Edit User"
          >
            <Link href={`${pathname}/${user.id}`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit User</span>
            </Link>
          </Button>
        );
      },
    }
  ], [pathname]);

  if (error) return <div>Failed to load users. Error: {error.message}</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <AdminHeader title="Shop Managers" />
        <Button onClick={() => router.push(`${pathname}/new?role=shop_manager`)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Shop Manager
        </Button>
      </div>
      {/* TODO: Add Search Input and connect it to searchQuery state and URL param */}
      {isLoading && <p className="text-center my-4">Loading users...</p>}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Shop Managers</h2>
        <p className="text-muted-foreground">Manage shop managers and their shop access permissions</p>
        <DataTable<User, unknown>
          columns={columns}
          data={data}
          searchKey="userName"
          manualPagination
          rowCount={rowCount}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};

export default UsersPage; 