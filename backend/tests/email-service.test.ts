import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { ResendEmailProvider, EmailService, getEmailService } from '../src/email/services/email-service'

/**
 * Integration test for the email service
 * 
 * This test actually sends emails using Resend - no mocking!
 * 
 * IMPORTANT: To run this test, you need:
 * 1. A valid RESEND_API_KEY in your .env file
 * 2. A verified domain or use Resend's test email (onboarding@resend.dev)
 * 3. Set TEST_EMAIL_RECIPIENT to your email address to receive test emails
 * 
 * Run with: bun test tests/email-service.test.ts
 */

// Helper to wait between API calls (Resend has a 2 req/sec rate limit)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('Email Service Integration Tests', () => {
    let emailService: EmailService
    let resendProvider: ResendEmailProvider

    // Configuration - update these for your testing
    const testRecipient = process.env.TEST_EMAIL_RECIPIENT || 'yidnekachewtebeje@gmail.com' // Use Resend's test email
    const testFromEmail = 'onboarding@resend.dev' // Always use Resend's verified sender for tests
    const testFromName = process.env.DEFAULT_FROM_NAME || 'Test Sender'
    const resendApiKey = process.env.RESEND_API_KEY || ''

    beforeAll(() => {
        if (!resendApiKey) {
            console.warn('⚠️  RESEND_API_KEY not set. Email tests will fail.')
        }

        resendProvider = new ResendEmailProvider(resendApiKey, testFromEmail)
        emailService = new EmailService(resendProvider, testFromEmail, testFromName)
    })

    // Add delay between each test to avoid rate limiting (2 req/sec limit)
    beforeEach(async () => {
        await delay(600)
    })

    describe('ResendEmailProvider', () => {
        it('should send a simple email successfully', async () => {
            const result = await resendProvider.sendEmail({
                from: testFromEmail,
                to: testRecipient,
                subject: `Test Email - ${new Date().toISOString()}`,
                html: `
          <h1>Test Email</h1>
          <p>This is a test email sent at ${new Date().toLocaleString()}.</p>
          <p>If you're receiving this, the email service is working correctly!</p>
        `
            })

            console.log('📧 Send email result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
            expect(result.error).toBeUndefined()
        }, 30000) // 30 second timeout for API call

        it('should send email to multiple recipients', async () => {
            const result = await resendProvider.sendEmail({
                from: testFromEmail,
                to: [testRecipient, 'delivered@resend.dev'],
                subject: `Multi-Recipient Test - ${new Date().toISOString()}`,
                html: `
          <h1>Multi-Recipient Test</h1>
          <p>This email was sent to multiple recipients.</p>
        `
            })

            console.log('📧 Multi-recipient result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)

        it('should handle invalid API key gracefully', async () => {
            const invalidProvider = new ResendEmailProvider('invalid_key', testFromEmail)

            const result = await invalidProvider.sendEmail({
                from: testFromEmail,
                to: testRecipient,
                subject: 'Should Fail',
                html: '<p>This should not be sent</p>'
            })

            console.log('📧 Invalid API key result:', result)

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        }, 30000)
    })

    describe('EmailService', () => {
        it('should send email with default from name', async () => {
            const result = await emailService.sendEmail({
                to: testRecipient,
                subject: `EmailService Test - ${new Date().toISOString()}`,
                html: `
          <h1>EmailService Integration Test</h1>
          <p>This email was sent through the EmailService wrapper.</p>
          <p>Default from name should be: ${testFromName}</p>
        `
            })

            console.log('📧 EmailService result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)

        it('should send email with custom from name', async () => {
            const customFromName = 'Custom Sender Name'

            const result = await emailService.sendEmail({
                to: testRecipient,
                subject: `Custom From Name Test - ${new Date().toISOString()}`,
                fromName: customFromName,
                html: `
          <h1>Custom From Name Test</h1>
          <p>This email should show "${customFromName}" as the sender name.</p>
        `
            })

            console.log('📧 Custom from name result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)

        it('should send email with CC and BCC', async () => {
            const result = await emailService.sendEmail({
                to: testRecipient,
                cc: 'delivered@resend.dev',
                bcc: 'delivered@resend.dev',
                subject: `CC/BCC Test - ${new Date().toISOString()}`,
                html: `
          <h1>CC/BCC Test</h1>
          <p>This email includes CC and BCC recipients.</p>
        `
            })

            console.log('📧 CC/BCC result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)

        it('should send email with reply-to address', async () => {
            const result = await emailService.sendEmail({
                to: testRecipient,
                replyTo: 'reply-to@example.com',
                subject: `Reply-To Test - ${new Date().toISOString()}`,
                html: `
          <h1>Reply-To Test</h1>
          <p>This email has a reply-to address set.</p>
        `
            })

            console.log('📧 Reply-to result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)
    })

    describe('getEmailService singleton', () => {
        it('should return an EmailService instance', () => {
            const service = getEmailService()

            expect(service).toBeInstanceOf(EmailService)
        })

        it('should return the same instance on multiple calls', () => {
            const service1 = getEmailService()
            const service2 = getEmailService()

            expect(service1).toBe(service2)
        })

        it('should be able to send email through singleton', async () => {
            const service = getEmailService()

            // The singleton uses env variables which might have an unverified domain
            // So we swap in a provider with the Resend test sender
            const verifiedProvider = new ResendEmailProvider(resendApiKey, testFromEmail)
            service.setProvider(verifiedProvider)

            const result = await service.sendEmail({
                to: testRecipient,
                subject: `Singleton Test - ${new Date().toISOString()}`,
                html: `
          <h1>Singleton Test</h1>
          <p>This email was sent through the getEmailService() singleton.</p>
        `
            })

            console.log('📧 Singleton result:', result)

            expect(result.success).toBe(true)
            expect(result.id).toBeDefined()
        }, 30000)
    })
})
