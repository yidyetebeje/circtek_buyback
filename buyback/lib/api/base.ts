/**
 * Base API client for making requests to the backend API
 * Handles common functionality like authentication, error handling, and request/response processing
 */
import { getSession, signOut } from 'next-auth/react'; // Import getSession and signOut
import { auth } from '@/auth'; // Import the auth helper from NextAuth config

// Define API URL - can be overridden via environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api/v1';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | number[] | undefined>;
  isProtected?: boolean; // Added for authentication
}

export class ApiClient {
  private baseUrl: string;
  private tenantId?: number;

  constructor(baseUrl = API_BASE_URL)
   {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the client ID for subsequent API calls
   */
  settenantId(tenantId: number) {
    this.tenantId = tenantId;
    return this;
  }

  /**
   * Get the current client ID
   */
  gettenantId(): number | undefined {
    return this.tenantId;
  }

  /**
   * Build the full URL including query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | number[] | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add client ID to all requests if available
    if (this.tenantId) {
      url.searchParams.append('tenantId', this.tenantId.toString());
    }
    
    // Add other query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((item) => {
              url.searchParams.append(key, String(item));
            });
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Check if code is running on client side
   */
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Get auth token from the appropriate source based on environment
   */
  private async getAuthToken(): Promise<string | undefined> {
    // Client-side: use next-auth/react getSession
    if (this.isClient()) {
      try {
        const session = await getSession();
        return session?.accessToken;
      } catch (error) {
        console.error('Error getting client-side session:', error);
        return undefined;
      }
    } 
    // Server-side: use auth() from NextAuth
    else {
      try {
        const session = await auth();
        return session?.accessToken;
      } catch (error) {
        // Safely handle if cookies() fails (e.g., in middleware or other contexts)
        console.error('Error getting server-side session:', error);
        return undefined;
      }
    }
  }

  /**
   * Prepare headers, adding Auth token if route is protected
   */
  private async prepareHeaders(existingHeaders: HeadersInit | undefined, isProtected?: boolean): Promise<HeadersInit> {
    // Initialize as Record<string, string> for easier manipulation
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Merge existing headers if they are provided
    if (existingHeaders) {
      if (existingHeaders instanceof Headers) {
        existingHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(existingHeaders)) {
        existingHeaders.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else { // It's a Record<string, string>
        Object.assign(headers, existingHeaders);
      }
    }

    try {
      const token = await this.getAuthToken();
      
      // Check if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (isProtected && this.isClient()) {
        console.warn('No access token found in session for protected request');
        // Only trigger sign out on client side
        await signOut({ callbackUrl: '/en/admin/login' });
      }
    } catch (error) {
      console.error('Error retrieving authentication token:', error);
    }
  
    return headers;
  }

  /**
   * Process API response
   */
  private async processResponse<T>(response: Response): Promise<T> {
    // For 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }
    if (response.status === 401 || response.status === 403) { // Use strict equality for status check
      let errorBody = {};
      try {
        errorBody = await response.json();
        // Log the parsed body if available
        console.log(errorBody, `[ApiClient] Response body for ${response.status} error`);
      } catch {
        // Handle cases where response.json() might fail (e.g., empty or non-JSON body)
        console.warn(`[ApiClient] Could not parse JSON body for ${response.status} error, or body was empty.`);
      }
      if (this.isClient()) {
        await signOut({ callbackUrl: '/admin/login' }); 
        throw {
          status: response.status, // Use the actual response status
          message: 'Your session has expired or access is unauthorized. Please log in again.'
        };
      } else {
       
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        // Extract specific error message from different possible response formats
        let errorMessage = 'An error occurred';
        
        if (data.error) {
          // Backend returns { error: "specific message" }
          errorMessage = data.error;
        } else if (data.message) {
          // Backend returns { message: "specific message" }
          errorMessage = data.message;
        } else if (data.errors && typeof data.errors === 'object') {
          // Backend returns validation errors
          const errorMessages = Object.values(data.errors).flat();
          errorMessage = errorMessages.length > 0 ? errorMessages.join(', ') : errorMessage;
        } else if (typeof data === 'string') {
          // Backend returns just a string
          errorMessage = data;
        }

        const error: ApiError = {
          status: response.status,
          message: errorMessage,
          errors: data.errors
        };
        throw error;
      }
      
      return data as T;
    }
    
    // For other response types
    if (!response.ok) {
      // Try to get error text for non-JSON responses
      let errorMessage = 'An error occurred';
      try {
        const errorText = await response.text();
        if (errorText && errorText.trim().length > 0) {
          errorMessage = errorText;
        }
             } catch {
         console.warn('Could not parse error response as text');
       }

      const error: ApiError = {
        status: response.status,
        message: errorMessage
      };
      throw error;
    }
    
    return {} as T;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, isProtected, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.prepareHeaders(fetchOptions.headers, isProtected);
    console.log(url, "url for get request")
    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...fetchOptions,
    });
    console.log(response, "response for get request")
    
    return this.processResponse<T>(response);
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: unknown, options: FetchOptions = {}): Promise<T> {
    const { params, isProtected, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const isFormData = data instanceof FormData;
    const baseHeaders = await this.prepareHeaders(fetchOptions.headers, isProtected);
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...baseHeaders,
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...fetchOptions,
    });
    
    return this.processResponse<T>(response);
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options: FetchOptions = {}): Promise<T> {
    const { params, isProtected, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const isFormData = data instanceof FormData;
    const baseHeaders = await this.prepareHeaders(fetchOptions.headers, isProtected);
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...baseHeaders,
    };
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...fetchOptions,
    });
    
    return this.processResponse<T>(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, isProtected, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.prepareHeaders(fetchOptions.headers, isProtected);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      ...fetchOptions,
    });
    
    return this.processResponse<T>(response);
  }
}

// Export a default instance
export const apiClient = new ApiClient();

// Export a function to create a new instance with a specific client ID
export const createApiClient = (tenantId?: number) => {
  return tenantId ? new ApiClient().settenantId(tenantId) : new ApiClient();
};
