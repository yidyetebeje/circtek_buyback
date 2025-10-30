import { Elysia } from "elysia";
import { getEmailService, EmailService } from "./services";
import 'dotenv/config';

// Initialize email service only once when needed, not during state initialization
let emailServiceInstance: EmailService | null = null;

// Email module - properly type the state to accept EmailService or null
export const emailModule = new Elysia()
  .state('emailService', null as unknown as EmailService) // Type assertion to prevent circular reference
  .onStart(() => {
    // Initialize email service on start
    if (!emailServiceInstance) {
      emailServiceInstance = getEmailService();
      
      // Log initialization status
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn("[Email Module] WARNING: RESEND_API_KEY not set in environment variables. Email sending will fail.");
      } else {
       
      }
      
      // Now actually set the service in the store
      // @ts-ignore - We know this will be EmailService at runtime
      emailModule.store.emailService = emailServiceInstance;
    }
    
   
  });

// Export default for easy importing
export default emailModule;
