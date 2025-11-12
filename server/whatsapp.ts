/**
 * WhatsApp OTP Service
 * 
 * This service provides WhatsApp OTP functionality for seller authentication.
 * 
 * Free WhatsApp OTP Integration Options:
 * 1. Twilio WhatsApp API (free trial, then paid)
 * 2. Green API (limited free tier)
 * 3. WA Business API (requires business verification)
 * 4. WATI (limited free tier)
 * 
 * For production use, consider:
 * - Twilio: https://www.twilio.com/whatsapp
 * - Green API: https://green-api.com/
 * - WATI: https://www.wati.io/
 * 
 * Current implementation uses a mock service that logs OTP codes.
 * Replace with actual WhatsApp API integration based on your chosen provider.
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
    console.log('⚠️  In production, replace this with actual WhatsApp API');
    console.log('=================================================');
    
    // Simulate successful send
    return true;
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
export const whatsappOtpService: WhatsAppOtpService = new MockWhatsAppOtpService();

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
