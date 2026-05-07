import { Resend } from 'resend';

// Use environment variable for Resend API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'The University Hub <support@uniexchangehub.com>';

/**
 * Modern Email Template Wrapper
 */
function wrapInModernTemplate(title: string, content: string, actionUrl?: string, actionText?: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #111827; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background-color: #000000; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900;">The University Hub</h1>
            <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em;">Merchant & Marketplace</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px;">
            <h2 style="margin-top: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; color: #111827;">${title}</h2>
            <div style="color: #4b5563; font-size: 15px; margin-bottom: 30px;">
              ${content}
            </div>

            ${actionUrl ? `
            <div style="text-align: center; margin-top: 40px;">
              <a href="${actionUrl}" style="background-color: #000000; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em; display: inline-block;">${actionText || 'Visit Portal'}</a>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 0.05em;">
              &copy; 2026 The University Hub &bull; Kaydem Logistics
            </p>
            <p style="color: #d1d5db; font-size: 10px; margin-top: 10px;">
              This is an automated system notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, code: string) {
  console.log(`[Email] Attempting to send verification code to ${email}...`);

  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Verification email cannot be sent to:', email);
    return false;
  }

  try {
    const content = `
      <p>Welcome to The University Hub! To complete your registration or login, please use the secure verification code below:</p>
      
      <div style="background-color: #f9fafb; border: 2px solid #000000; border-radius: 20px; padding: 30px; text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Secure Verification Code</p>
        <h1 style="color: #000000; font-size: 48px; margin: 0; letter-spacing: 12px; font-weight: 900;">${code}</h1>
      </div>
      
      <p style="color: #6b7280; font-size: 13px;">
        <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
      </p>
    `;

    const html = wrapInModernTemplate('Verify Your Email', content);
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email.trim(),
      subject: 'The University Hub - Your Verification Code',
      html
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
    const content = `
      <p>You have been invited to join The University Hub as an administrator. You will have full access to manage stores, verify sellers, and oversee platform operations.</p>
      
      <div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 25px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          <strong>⚠️ Security Notice:</strong> This invitation link is unique to your email and should not be shared.
        </p>
      </div>
    `;

    const html = wrapInModernTemplate("You've Been Invited!", content, inviteUrl, 'Create Admin Account');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email.trim(),
      subject: 'The University Hub - Admin Invitation',
      html
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
    const content = `
      <p>We received a request to reset your password for your administrator account. If you didn't make this request, you can safely ignore this email.</p>
    `;

    const html = wrapInModernTemplate('Password Reset Request', content, resetUrl, 'Reset My Password');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email.trim(),
      subject: 'The University Hub - Reset Your Password',
      html
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

export async function sendEmail(to: string, subject: string, htmlContent: string) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Email cannot be sent to:', to);
    return false;
  }

  try {
    const html = wrapInModernTemplate(subject, htmlContent);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to.trim(),
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
  totalAmount: string = "0",
  bcc?: string[]
) {
  if (!resend) {
    console.error('❌ ERROR: RESEND_API_KEY is missing. Purchase confirmation email cannot be sent to:', email);
    return false;
  }

  const deliveryDays = deliveryMethod === 'ems' ? '1-14 days' : '1-5 days';
  const deliveryPartner = deliveryMethod === 'ems' ? 'Ghana Post EMS' : 'Express by Kaydem Logistics';

  const codSection = isCOD ? `
    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 16px; padding: 25px; margin: 25px 0;">
      <h3 style="color: #9a3412; margin-top: 0; font-size: 16px; text-transform: uppercase; font-weight: 900;">💵 Cash on Delivery (COD)</h3>
      <p style="margin: 10px 0; color: #4b5563; font-size: 14px;">You have chosen to pay on delivery. Please ensure you have the exact amount of <strong>GH₵${parseFloat(totalAmount).toFixed(2)}</strong> ready for our delivery agent.</p>
      <p style="margin: 5px 0; color: #9ca3af; font-size: 12px; font-style: italic;">* Payment should only be made to a Kaydem Logistics account or directly to the assigned Kaydem delivery agent.</p>
    </div>
  ` : '';

  try {
    const content = `
      <p>Hi ${buyerName},</p>
      <p>We're excited to let you know that your order <strong>#${orderId}</strong> was successful. Thank you for choosing The University Hub!</p>
      
      <div style="background-color: #f9fafb; border-radius: 20px; padding: 25px; margin: 25px 0; border: 1px solid #f3f4f6;">
        <h3 style="color: #111827; margin-top: 0; font-size: 14px; text-transform: uppercase; font-weight: 900; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px;">📄 Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">Order ID:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 13px;">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">Payment:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 13px;">${isCOD ? 'Cash on Delivery' : 'Paid Online'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">Delivery:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 13px;">${deliveryPartner}</td>
          </tr>
          <tr>
            <td style="padding: 15px 0 0 0; color: #111827; font-weight: 900; font-size: 16px;">TOTAL AMOUNT:</td>
            <td style="padding: 15px 0 0 0; text-align: right; font-weight: 900; font-size: 20px; color: #000000;">GH₵${parseFloat(totalAmount).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${codSection}

      <div style="background-color: #f9fafb; border-radius: 20px; padding: 25px; margin: 25px 0; border: 1px solid #f3f4f6;">
        <h3 style="color: #111827; margin-top: 0; font-size: 14px; text-transform: uppercase; font-weight: 900;">Delivery Information</h3>
        <p style="margin: 10px 0 5px 0; color: #4b5563; font-size: 13px;"><strong>Partner:</strong> ${deliveryPartner}</p>
        <p style="margin: 0; color: #4b5563; font-size: 13px;"><strong>Est. Time:</strong> ${deliveryDays} (once approved by seller)</p>
      </div>
      
      <p style="color: #6b7280; font-size: 13px; margin-top: 25px;">
        <strong>Next Steps:</strong> We have notified the seller. Once they approve the sale, your order will be dispatched via ${deliveryPartner}.
      </p>
    `;

    const html = wrapInModernTemplate('Thank You for Your Purchase!', content, trackingUrl, 'Track My Order');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email.trim(),
      bcc: bcc,
      subject: `Order Confirmation #${orderId} - The University Hub`,
      html
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
