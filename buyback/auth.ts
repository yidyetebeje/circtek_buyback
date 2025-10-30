import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthConfig } from "next-auth";
import { Session } from "next-auth";
import { User } from "next-auth";
// Import env setup (this runs the setup when imported)
import "@/lib/env-setup";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500/api";

// Log the API URL during initialization to help with debugging


// Type declaration for our custom session with extended user properties
interface ExtendedSession extends Session {
  user: {
    id: number;
    fName: string;
    lName: string;
    email: string;
    roleSlug: string;
    shopId?: number;
    managed_shop_id?: number; // Added for shop_manager role
    name?: string | null;
    image?: string | null;
    tenantId?: number;
    
  };
  accessToken: string;
}

// Type declaration for our custom user
interface CustomUser extends User {
  id: number;
  fName: string;
  lName: string;
  email: string;
  userName?: string;
  roleSlug: string;
  shopId?: number;
  managed_shop_id?: number; // Added for shop_manager role
  token: string;
}

export const authConfig: NextAuthConfig = {
  debug: process.env.NODE_ENV === 'development',
  basePath: "/api/auth",
  pages: {
    signIn: "/en/admin/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = pathname.startsWith("/admin");
      
      if (isAdminRoute) {
        return isLoggedIn;
      }
      
      return true;
    },
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        // Cast the user to our custom user type
        const customUser = user as CustomUser;
        
        token.id = customUser.id;
        token.fName = customUser.fName;
        token.lName = customUser.lName;
        token.email = customUser.email;
        token.roleSlug = customUser.roleSlug;
        token.shopId = customUser.shopId;
        token.managed_shop_id = customUser.managed_shop_id;
        token.accessToken = customUser.token;
      }
      return token;
    },
    async session({ session, token }) {
      // Cast the session to our extended session type
      const extendedSession = session as ExtendedSession;
      
      if (token) {
        extendedSession.user.id = token.id as number;
        extendedSession.user.fName = token.fName as string;
        extendedSession.user.lName = token.lName as string;
        extendedSession.user.email = token.email as string;
        extendedSession.user.roleSlug = token.roleSlug as string;
        
        if (token.shopId) {
          extendedSession.user.shopId = token.shopId as number;
        }
        
        // Add managed_shop_id for shop_manager role
        if (token.managed_shop_id) {
          extendedSession.user.managed_shop_id = token.managed_shop_id as number;
        }
        
        extendedSession.accessToken = token.accessToken as string;
      }
      return extendedSession;
    }
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        shopId: { label: "Shop ID", type: "number" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.identifier || !credentials?.password) {
            console.error("Missing credentials - identifier or password is missing");
            return null;
          }

          const shopId = process.env.NEXT_PUBLIC_SHOP_ID;
          const endpoint = `${BASE_API_URL}/auth/shop-login`;
         
        
          const payload: { identifier: string; password: string; shopId?: number } = {
            identifier: String(credentials.identifier),
            password: String(credentials.password),
          };
          
          // Add shopId to payload if it exists and is valid
          if (shopId && typeof shopId === 'string' && shopId.trim() !== '') {
            payload.shopId = parseInt(shopId);
          }
          
         
         
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
         

          if (!response.ok) {
            console.error(`Authentication failed with status: ${response.status}`);
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            return null
          }
          let data;
          const text = await response.text();
          
          try {
            if (text && text.trim()) {
              data = JSON.parse(text);
            } else {
              console.error("Empty response from authentication server");
              throw new Error("Server returned an empty response");
            }
          } catch (e) {
            console.error("Failed to parse JSON response:", e);
            console.error("Response text:", text);
            throw new Error("Failed to parse server response");
          }
         

          if (data && data.data?.token) {
            const user = data.data.user;
            const token = data.data.token;
            return {
              id: user.id,
              name: user.name,
              fName: user.name,
              lName: user.name,
              email: user.email,
              userName: user.user_name,
              roleSlug: user.roleSlug,
              shopId: user.shopId,
              managed_shop_id: user.managed_shop_id,
              token: token,
              tenantId: user.tenant_id
            };
          }
          
          console.error("Authentication response missing token or invalid format");
          throw new Error("Invalid server response: missing authentication token");
        } catch (error) {
          console.error("Auth error:", error);
          // Pass the error message to the client
          throw error instanceof Error 
            ? error 
            : new Error("An unexpected error occurred during authentication");
        }
      }
    })
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig); 