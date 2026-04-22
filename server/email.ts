import { Resend } from 'resend';

// Use environment variable for Resend API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'The University Hub <notifications@theuniversityhub.com>';

export async function sendVerificationEmail(email: string, code: string) {
  if (!resend) {
    console.warn('Warning: RESEND_API_KEY is missing. Verification email skipped for:', email);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'The University Hub - Your Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">The University Hub</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 16px;">Welcome to The University Hub! To complete your registration, please use the verification code below:</p>
              
              <div style="background-color: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${code}</h1>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                The University Hub - Student Marketplace<br>
                This is an automated email. Please do not reply.
              </p>
            </div>
          </body>
        </html>
      `
    });
    
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendAdminInvite(email: string, inviteToken: string, inviteUrl: string) {
  if (!resend) {
    console.warn('Warning: RESEND_API_KEY is missing. Admin invite skipped for:', email);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'The University Hub - Admin Invitation',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Admin Invitation</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">You've Been Invited!</h2>
              <p style="color: #4b5563; font-size: 16px;">You have been invited to join The University Hub as an administrator. Click the button below to create your admin account:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Create Admin Account
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <strong>⚠️ Security Notice:</strong> This link is for your eyes only. Do not share it with anyone.
              </p>
              
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #667eea; word-break: break-all;">${inviteUrl}</span>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                The University Hub - Admin Portal<br>
                This is an automated email. Please do not reply.
              </p>
            </div>
          </body>
        </html>
      `
    });
    
    console.log(`Admin invite sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send admin invite:', error);
    throw new Error('Failed to send admin invite');
  }
}
