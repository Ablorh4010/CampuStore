const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendApplicationEmail = async (toEmail, toName, subject, htmlBody, fromStudent) => {
  try {
    const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0d1b4b 0%, #4f35e8 100%); padding: 30px; color: white; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">CampuStore</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Student Application</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
        ${htmlBody}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          <strong>${fromStudent.full_name}</strong><br/>
          Email: ${fromStudent.email}<br/>
          University: ${fromStudent.university || 'Not provided'}
        </p>
      </div>
    </div>`;

    const result = await resend.emails.send({
      from: 'applications@campustore.com',
      to: toEmail,
      subject: subject,
      html: emailHtml,
      replyTo: fromStudent.email,
    });

    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendApplicationEmail };
