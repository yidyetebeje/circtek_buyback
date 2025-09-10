import "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    fName: string;
    lName: string;
    email: string;
    userName?: string;
    roleSlug: string;
    shopId?: number; // Potentially managed_shop_id, review for consistency
    tenantId?: number;
    token: string;
  }

  interface Session {
    user: {
      id: number;
      fName: string;
      lName: string;
      email: string;
      roleSlug: string;
      shopId?: number; // Potentially managed_shop_id, review for consistency
      managed_shop_id?: number;
      tenantId?: number;
      name?: string | null;
      image?: string | null;
    };
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    fName: string;
    lName: string;
    email: string;
    roleSlug: string;
    shopId?: number; // Potentially managed_shop_id, review for consistency
    managed_shop_id?: number;
    tenantId?: number;
    accessToken: string;
  }
} 