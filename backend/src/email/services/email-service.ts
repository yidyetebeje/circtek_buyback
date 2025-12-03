import { Resend } from 'resend';

export interface EmailProvider {
  sendEmail(options: {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }>;
}

/**
 * Resend implementation of the EmailProvider interface
 */
export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;
  private defaultFromEmail: string;

  constructor(apiKey: string, defaultFromEmail: string) {
    this.resend = new Resend(apiKey);
    this.defaultFromEmail = defaultFromEmail;
  }

  async sendEmail(options: {
    from?: string;
    to: string | string[];
    subject: string;
    html: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { from = this.defaultFromEmail, to, subject, html, cc, bcc, replyTo } = options;

      const response = await this.resend.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        reply_to: replyTo
      });

      if (response.error) {
        console.error(`[ResendEmailProvider] Error sending email:`, response.error);
        return {
          success: false,
          error: response.error.message || 'Failed to send email'
        };
      }

      return {
        success: true,
        id: response.data?.id
      };
    } catch (error: any) {
      console.error(`[ResendEmailProvider] Exception sending email:`, error);
      return {
        success: false,
        error: error.message || 'Exception while sending email'
      };
    }
  }
}

class NoopEmailProvider implements EmailProvider {
  async sendEmail(): Promise<{ success: boolean; id?: string | undefined; error?: string | undefined; }> {
    console.warn('[EmailService] Email attempt skipped because no provider is configured.');
    return { success: false, error: 'Email provider not configured' };
  }
}

/**
 * Main email service that can use any email provider
 */
export class EmailService {
  private provider: EmailProvider;
  private defaultFromEmail: string;
  private defaultFromName?: string;

  constructor(provider: EmailProvider, defaultFromEmail: string, defaultFromName?: string) {
    this.provider = provider;
    this.defaultFromEmail = defaultFromEmail;
    this.defaultFromName = defaultFromName;
  }

  /**
   * Send an email
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const { to, subject, html, from, fromName, cc, bcc, replyTo } = options;
    
    let fromAddress = from || this.defaultFromEmail;
    
    // Add from name if provided
    if (fromName || this.defaultFromName) {
      fromAddress = `${fromName || this.defaultFromName} <${fromAddress}>`;
    }

    return this.provider.sendEmail({
      from: fromAddress,
      to,
      subject,
      html,
      cc,
      bcc,
      replyTo
    });
  }

  /**
   * Change the email provider
   * This allows swapping providers without recreating the service
   */
  setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }
}

// Create a singleton instance with environment variables
// Will be initialized properly in index.ts
let emailService: EmailService;

export const getEmailService = (): EmailService => {
  if (!emailService) {
    const resendApiKey = process.env.RESEND_API_KEY || '';
    const defaultFromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
    const defaultFromName = process.env.DEFAULT_FROM_NAME || 'Buyback System';
    
    if (!resendApiKey) {
      console.warn('[EmailService] RESEND_API_KEY not found in environment variables. Email sending disabled.');
      emailService = new EmailService(new NoopEmailProvider(), defaultFromEmail, defaultFromName);
    } else {
      const resendProvider = new ResendEmailProvider(resendApiKey, defaultFromEmail);
      emailService = new EmailService(resendProvider, defaultFromEmail, defaultFromName);
    }
  }
  
  return emailService;
};
