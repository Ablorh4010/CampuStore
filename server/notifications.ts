import { Resend } from 'resend';
import { whatsappOtpService } from './whatsapp';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'The University Hub <support@uniexchangehub.com>';

export async function sendEmailNotification(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('Warning: RESEND_API_KEY is missing. Email notification skipped for:', to);
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
      console.error('❌ Resend API Error (Notification):', error);
      return false;
    }

    console.log(`✅ Email notification sent to ${to}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
    return false;
  }
}

export async function sendOrderConfirmation(order: any, buyer: any, product: any) {
  const subject = `Order Confirmed: ${product.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366f1;">Order Confirmed!</h1>
      <p>Hi ${buyer.firstName},</p>
      <p>Your order for <strong>${product.title}</strong> has been successfully placed.</p>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Amount Paid:</strong> $${parseFloat(order.totalAmount).toFixed(2)}</p>
        <p><strong>Shipping Mode:</strong> ${order.shippingMode.replace(/_/g, ' ')}</p>
      </div>
      <p>The seller has been notified and will begin processing your order shortly.</p>
      <p>Track your order status in your <a href="${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard">dashboard</a>.</p>
    </div>
  `;
  
  await sendEmailNotification(buyer.email, subject, html);
  
  // Also send WhatsApp notification if available
  if (buyer.whatsappNumber || buyer.phoneNumber) {
    const message = `Order Confirmed! Your order for ${product.title} (ID: #${order.id}) has been placed. Track it here: ${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard`;
    // We can extend whatsappOtpService to send generic messages
    console.log('WhatsApp Notification:', { to: buyer.whatsappNumber || buyer.phoneNumber, message });
  }
}

export async function sendTrackingUpdate(order: any, buyer: any, product: any) {
  const isNearDelivery = order.deliveryStatus === 'near_delivery';
  const isCOD = order.paymentGateway === 'manual' || order.paymentMode === 'cod';
  
  const subject = isNearDelivery 
    ? `Action Required: Your order #${order.id} is arriving tomorrow!` 
    : `Tracking Update: Your order #${order.id} is ${order.deliveryStatus.replace(/_/g, ' ')}`;

  const codReminder = (isNearDelivery && isCOD) ? `
    <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3 style="color: #ea580c; margin-top: 0;">💳 Payment Reminder</h3>
      <p style="color: #9a3412; font-weight: bold;">Our delivery agent will be with you tomorrow. Please ensure you have the exact amount of <strong>GH₵${parseFloat(order.totalAmount).toFixed(2)}</strong> ready for payment upon delivery.</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366f1;">Delivery Update</h1>
      <p>Hi ${buyer.firstName},</p>
      <p>Your order for <strong>${product.title}</strong> has a new update.</p>
      
      ${codReminder}

      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p><strong>New Status:</strong> ${order.deliveryStatus.toUpperCase().replace(/_/g, ' ')}</p>
        <p><strong>Carrier:</strong> ${order.carrier || 'Ghana Post'}</p>
        <p><strong>Tracking Number:</strong> ${order.trackingNumber || 'N/A'}</p>
        <p><strong>Update:</strong> ${order.trackingHistory || 'No details provided.'}</p>
      </div>
      <p>Check the full tracking history in your <a href="${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard">dashboard</a>.</p>
    </div>
  `;
  
  await sendEmailNotification(buyer.email, subject, html);
}
