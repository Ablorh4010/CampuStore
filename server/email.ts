import { Resend } from 'resend';

// Use environment variable for Resend API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'The University Hub <support@uniexchangehub.com>';

export async function sendVerificationEmail(email: string, code: string) {
  console.log(`[Email] Attempting to send verification code to ${email}...`);
  console.log(`[Email] Using API Key starting with: ${process.env.RESEND_API_KEY?.substring(0, 5)}...`);

  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Verification email cannot be sent to:', email);
    return false;
  }

  try {
    console.log(`[Email] Calling Resend API with FROM: ${FROM_EMAIL}`);
    const { data, error } = await resend.emails.send({
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
    
    if (error) {
      console.error('❌ Resend API Error detail:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`✅ Verification email sent to ${email} successfully. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Exception in sendVerificationEmail:', error);
    return false;
  }
}

export async function sendAdminInvite(email: string, inviteToken: string, inviteUrl: string) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Admin invite cannot be sent to:', email);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
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
    
    if (error) {
      console.error('❌ Resend API Error (Admin Invite):', error);
      return false;
    }

    console.log(`✅ Admin invite sent to ${email}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send admin invite:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Password reset email cannot be sent to:', email);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'The University Hub - Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">The University Hub</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #4b5563; font-size: 16px;">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #1f2937; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #667eea; word-break: break-all;">${resetUrl}</span>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                The University Hub - Admin Security<br>
                This is an automated email. Please do not reply.
              </p>
            </div>
          </body>
        </html>
      `
    });
    
    if (error) {
      console.error('❌ Resend API Error (Password Reset):', error);
      return false;
    }

    console.log(`✅ Password reset email sent to ${email}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Email cannot be sent to:', to);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      return false;
    }

    console.log(`✅ Email sent to ${to}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

export async function sendPurchaseConfirmationEmail(
  email: string, 
  buyerName: string, 
  orderId: number, 
  deliveryMethod: string,
  trackingUrl: string,
  isCOD: boolean = false,
  totalAmount: string = "0"
) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Purchase confirmation email cannot be sent to:', email);
    return false;
  }

  const deliveryDays = deliveryMethod === 'ems' ? '1-14 days' : '1-5 days';
  const deliveryPartner = deliveryMethod === 'ems' ? 'Ghana Post EMS' : 'Express by Kaydem Logistics';

  const codSection = isCOD ? `
    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h3 style="color: #9a3412; margin-top: 0; font-size: 18px;">💵 Cash on Delivery (COD)</h3>
      <p style="margin: 5px 0; color: #4b5563;">You have chosen to pay on delivery. Please ensure you have the exact amount of <strong>GH₵${parseFloat(totalAmount).toFixed(2)}</strong> ready for our delivery agent.</p>
      <p style="margin: 5px 0; color: #4b5563; font-size: 13px; font-style: italic;">* Payment should only be made to a Kaydem Logistics account or directly to the assigned Kaydem delivery agent.</p>
    </div>
  ` : '';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Thank You for Your Purchase! - The University Hub',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #000000 0%, #333333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">The University Hub</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Purchase!</h2>
              <p style="color: #4b5563; font-size: 16px;">Hi ${buyerName},</p>
              <p style="color: #4b5563; font-size: 16px;">We're excited to let you know that your order <strong>#${orderId}</strong> was successful. Thank you for choosing The University Hub!</p>
              
              ${codSection}

              <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">Delivery Information</h3>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Method:</strong> ${deliveryPartner}</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Estimated Delivery:</strong> ${deliveryDays} (starting as soon as the seller approves your sale)</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #4b5563; margin-bottom: 15px;">You can track your order anytime using the link below:</p>
                <a href="${trackingUrl}" style="background-color: #000000; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Track My Order
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                <strong>Next Steps:</strong> We have notified the seller. Once they approve the sale, your order will be dispatched via ${deliveryPartner}.
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
    
    if (error) {
      console.error('❌ Resend API Error (Purchase Confirmation):', error);
      return false;
    }

    console.log(`✅ Purchase confirmation email sent to ${email}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send purchase confirmation email:', error);
    return false;
  }
}
