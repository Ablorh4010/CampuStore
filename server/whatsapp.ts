/**
 * WhatsApp OTP Service
 * 
 * This service provides WhatsApp OTP functionality for seller authentication.
 * 
 * WhatsApp OTP Integration Options:
 * 1. Meta for Developers WhatsApp Business API (recommended - official API)
 * 2. Twilio WhatsApp API (free trial, then paid)
 * 3. Green API (limited free tier)
 * 
 * For production use:
 * - Meta WhatsApp Business API: https://developers.facebook.com/docs/whatsapp/cloud-api
 * - Twilio: https://www.twilio.com/whatsapp
 * - Green API: https://green-api.com/
 * 
 * Current implementation uses Meta for Developers WhatsApp Business API with fallback to mock service.
 */

export interface WhatsAppOtpService {
  sendOtp(phoneNumber: string, otpCode: string): Promise<boolean>;
}

/**
 * Mock WhatsApp OTP Service
 * In development, this logs the OTP code to console.
 * In production, replace this with actual WhatsApp API calls.
 */
class MockWhatsAppOtpService implements WhatsAppOtpService {
  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    console.log('=================================================');
    console.log('📱 WhatsApp OTP Service (Development Mode)');
    console.log('=================================================');
    console.log(`Phone: ${phoneNumber}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log('=================================================');
    console.log('⚠️  In production, configure Meta WhatsApp Business API');
    console.log('=================================================');
    
    // Simulate successful send
    return true;
  }
}

/**
 * Meta for Developers WhatsApp Business API Service
 * Official WhatsApp Business API from Meta
 * 
 * Setup Instructions:
 * 1. Go to https://developers.facebook.com/apps
 * 2. Create a new app or select existing one
 * 3. Add WhatsApp product to your app
 * 4. Get your Phone Number ID and Access Token from the WhatsApp dashboard
 * 5. Set environment variables:
 *    - META_WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp phone number ID
 *    - META_WHATSAPP_ACCESS_TOKEN: Your permanent access token
 * 
 * API Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
 */
class MetaWhatsAppOtpService implements WhatsAppOtpService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
    this.apiVersion = process.env.META_WHATSAPP_API_VERSION || 'v18.0';
    
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('Meta WhatsApp Business API credentials not configured. Set META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN environment variables.');
    }
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      // Format phone number - remove any non-numeric characters except leading +
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Ensure number starts with country code
      const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'template',
          template: {
            name: 'otp_verification', // You need to create this template in Meta Business Manager
            language: {
              code: 'en'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: otpCode
                  }
                ]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters: [
                  {
                    type: 'text',
                    text: otpCode
                  }
                ]
              }
            ]
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta WhatsApp API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      console.log(`WhatsApp OTP sent via Meta API. Message ID: ${result.messages?.[0]?.id}`);
      return true;
    } catch (error) {
      console.error('Meta WhatsApp OTP error:', error);
      // Fall back to simple text message if template fails
      return await this.sendSimpleTextOtp(phoneNumber, otpCode);
    }
  }

  /**
   * Fallback method to send OTP as simple text message
   * Note: This requires your WhatsApp Business Account to be verified
   */
  private async sendSimpleTextOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'text',
          text: {
            body: `Your CampusAffordHub verification code is: ${otpCode}\n\nThis code is valid for 10 minutes.\n\nDo not share this code with anyone.`
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta WhatsApp API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      console.log(`WhatsApp OTP sent as text via Meta API. Message ID: ${result.messages?.[0]?.id}`);
      return true;
    } catch (error) {
      console.error('Meta WhatsApp simple text OTP error:', error);
      return false;
    }
  }
}

/**
 * Twilio WhatsApp OTP Service
 * Uncomment and configure when ready to use Twilio
 */
/*
import twilio from 'twilio';

class TwilioWhatsAppOtpService implements WhatsAppOtpService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox number
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(accountSid, authToken);
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      // Format phone number for WhatsApp (must include 'whatsapp:' prefix)
      const formattedTo = phoneNumber.startsWith('whatsapp:') 
        ? phoneNumber 
        : `whatsapp:${phoneNumber}`;
      
      const message = await this.client.messages.create({
        body: `Your CampusAffordHub verification code is: ${otpCode}. Valid for 10 minutes.`,
        from: this.fromNumber,
        to: formattedTo,
      });
      
      console.log(`WhatsApp OTP sent via Twilio. SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('Twilio WhatsApp OTP error:', error);
      return false;
    }
  }
}
*/

/**
 * Green API WhatsApp OTP Service
 * Uncomment and configure when ready to use Green API
 */
/*
class GreenApiWhatsAppOtpService implements WhatsAppOtpService {
  private instanceId: string;
  private token: string;

  constructor() {
    this.instanceId = process.env.GREEN_API_INSTANCE_ID || '';
    this.token = process.env.GREEN_API_TOKEN || '';
    
    if (!this.instanceId || !this.token) {
      throw new Error('Green API credentials not configured');
    }
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      // Remove any non-numeric characters and ensure proper format
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      const response = await fetch(
        `https://api.green-api.com/waInstance${this.instanceId}/sendMessage/${this.token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${cleanNumber}@c.us`,
            message: `Your CampusAffordHub verification code is: ${otpCode}. Valid for 10 minutes.`,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Green API error: ${response.statusText}`);
      }
      
      console.log('WhatsApp OTP sent via Green API');
      return true;
    } catch (error) {
      console.error('Green API WhatsApp OTP error:', error);
      return false;
    }
  }
}
*/

// Export the active service
// Change this when moving to production
// For production with Meta WhatsApp API, use:
// export const whatsappOtpService: WhatsAppOtpService = new MetaWhatsAppOtpService();
let activeService: WhatsAppOtpService;

try {
  // Try to initialize Meta WhatsApp service if credentials are available
  if (process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN) {
    activeService = new MetaWhatsAppOtpService();
    console.log('✅ Meta WhatsApp Business API service initialized');
  } else {
    activeService = new MockWhatsAppOtpService();
    console.log('⚠️  Using Mock WhatsApp service. Configure Meta WhatsApp API for production.');
  }
} catch (error) {
  console.error('Failed to initialize Meta WhatsApp service, falling back to mock:', error);
  activeService = new MockWhatsAppOtpService();
}

export const whatsappOtpService: WhatsAppOtpService = activeService;

/**
 * Send WhatsApp OTP to phone number
 */
export async function sendWhatsAppOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
  try {
    return await whatsappOtpService.sendOtp(phoneNumber, otpCode);
  } catch (error) {
    console.error('Failed to send WhatsApp OTP:', error);
    return false;
  }
}
