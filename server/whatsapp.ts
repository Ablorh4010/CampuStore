/**
 * WhatsApp OTP Service
 * 
 * This service provides WhatsApp functionality for seller authentication and admin alerts.
 */

export interface WhatsAppOtpService {
  sendOtp(phoneNumber: string, otpCode: string): Promise<boolean>;
  sendMessage(phoneNumber: string, message: string): Promise<boolean>;
}

/**
 * Mock WhatsApp OTP Service
 */
class MockWhatsAppOtpService implements WhatsAppOtpService {
  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    console.log('=================================================');
    console.log('📱 WhatsApp OTP Service (Development Mode)');
    console.log(`Phone: ${phoneNumber}, OTP: ${otpCode}`);
    console.log('=================================================');
    return true;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    console.log('=================================================');
    console.log('📱 WhatsApp Message Service (Development Mode)');
    console.log(`Phone: ${phoneNumber}, Message: ${message}`);
    console.log('=================================================');
    return true;
  }
}

/**
 * Meta for Developers WhatsApp Business API Service
 */
class MetaWhatsAppOtpService implements WhatsAppOtpService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
    this.apiVersion = process.env.META_WHATSAPP_API_VERSION || 'v18.0';
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      if (!this.phoneNumberId || !this.accessToken) return await new MockWhatsAppOtpService().sendOtp(phoneNumber, otpCode);

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
          type: 'template',
          template: {
            name: 'otp_verification',
            language: { code: 'en' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: otpCode }] },
              { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: otpCode }] }
            ]
          }
        }),
      });

      if (!response.ok) throw new Error('Meta API error');
      return true;
    } catch (error) {
      return await this.sendSimpleText(phoneNumber, `Your verification code is: ${otpCode}`);
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    return await this.sendSimpleText(phoneNumber, message);
  }

  private async sendSimpleText(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.phoneNumberId || !this.accessToken) return await new MockWhatsAppOtpService().sendMessage(phoneNumber, message);

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
          text: { body: message }
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }
}

let activeService: WhatsAppOtpService;
if (process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN) {
  activeService = new MetaWhatsAppOtpService();
} else {
  activeService = new MockWhatsAppOtpService();
}

export const whatsappOtpService: WhatsAppOtpService = activeService;

export async function sendWhatsAppOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
  return await whatsappOtpService.sendOtp(phoneNumber, otpCode);
}

export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  return await whatsappOtpService.sendMessage(phoneNumber, message);
}
