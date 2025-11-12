import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail
  };
}

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'CampusAffordHub - Your Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">CampusAffordHub</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 16px;">Welcome to CampusAffordHub - the student market place! To complete your registration, please use the verification code below:</p>
              
              <div style="background-color: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${code}</h1>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                CampusAffordHub - the student market place<br>
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
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'CampusAffordHub - Admin Invitation',
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
              <p style="color: #4b5563; font-size: 16px;">You have been invited to join CampusAffordHub as an administrator. Click the button below to create your admin account:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Create Admin Account
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <strong>⚠️ Security Notice:</strong> This link is for your eyes only. Do not share it with anyone. The link will expire in 24 hours.
              </p>
              
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #667eea; word-break: break-all;">${inviteUrl}</span>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                CampusAffordHub - Admin Portal<br>
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
