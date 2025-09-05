import { JwtUser } from './authTypes';
import type { Context } from 'elysia';

// Define a common context type for Elysia handlers that extends Elysia's Context
export interface AppContext extends Partial<Context> {
  set: Context['set']; // Use Elysia's set type directly
  store?: Record<string, any>; // Elysia's store
  request?: Request;
  params?: Record<string, any>; 
  body?: any; 
  query?: Record<string, any>; 
  user?: JwtUser; // User from JWT auth
  [key: string]: any; // For other potential context properties
}
