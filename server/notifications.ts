import { Resend } from 'resend';
import { whatsappOtpService, sendWhatsAppMessage } from './whatsapp';
import { storage } from './storage';
import { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(socketServer: Server) {
  io = socketServer;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'The University Hub <support@uniexchangehub.com>';
const LOGO_URL = 'https://campustore-808678925426.europe-west1.run.app/assets/logo.png'; // Fallback if logo not found

/**
 * Emit a real-time notification to a specific user
 */
function emitRealTimeNotification(userId: number, data: { type: string, message: string, title: string, orderId?: number }) {
  if (io) {
    console.log(`📡 Emitting real-time notification to user ${userId}: ${data.title}`);
    io.to(`user:${userId}`).emit('chat:notification', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Modern Email Wrapper
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

/**
 * Get configured admin emails from app settings
 */
async function getAdminNotificationEmails(): Promise<string[]> {
  try {
    const configuredEmail = await storage.getAppConfig('admin_alert_email');
    const defaultEmails = ['admin@uniexchangehub.com', 'official@uniexchangehub.com', 'support@uniexchangehub.com'];
    
    if (configuredEmail && configuredEmail.includes('@')) {
      // Ensure configured email is first
      return [configuredEmail.trim(), ...defaultEmails];
    }
    return defaultEmails;
  } catch (error) {
    return ['admin@uniexchangehub.com'];
  }
}

export async function sendEmailNotification(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('Warning: RESEND_API_KEY is missing. Email notification skipped for:', to);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to.trim(),
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

/**
 * Send alert to admin via configured email and WhatsApp
 */
export async function sendAdminAlert(subject: string, message: string, html?: string) {
  try {
    // 1. WhatsApp Alert
    await notifyAdminViaWhatsApp(`${subject}: ${message}`);

    // 2. Email Alert
    const adminEmails = await getAdminNotificationEmails();
    const finalHtml = html ? wrapInModernTemplate(`Admin Alert: ${subject}`, html) : wrapInModernTemplate(`Admin Alert: ${subject}`, `<p>${message}</p>`);
    
    for (const email of adminEmails) {
      if (email) {
        await sendEmailNotification(email, `Admin Alert: ${subject}`, finalHtml);
      }
    }

    // 3. Socket Alert to all admins
    if (io) {
      io.to('admin').emit('chat:notification', {
        type: 'admin_alert',
        title: subject,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to send admin alert:', error);
  }
}

/**
 * Send alert to admin via WhatsApp Support Hub number
 */
export async function notifyAdminViaWhatsApp(message: string) {
  try {
    const adminWhatsApp = await storage.getAppConfig('whatsapp_support_1');
    if (adminWhatsApp) {
      console.log(`📱 Sending WhatsApp Admin Alert to ${adminWhatsApp}`);
      await sendWhatsAppMessage(adminWhatsApp, `🚨 ADMIN ALERT: ${message}`);
    } else {
      console.warn('⚠️ Admin WhatsApp Support Number not configured in settings.');
    }
  } catch (error) {
    console.error('Failed to notify admin via WhatsApp:', error);
  }
}

export async function sendOrderConfirmation(order: any, buyer: any, product: any) {
  const orderNum = order.orderNumber || `#${order.id}`;
  const subject = `Invoice for Order ${orderNum} - The University Hub`;
  
  const isInstallment = order.isInstallment;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const content = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; color: #413796; text-transform: uppercase; letter-spacing: 2px;">Invoice</h2>
          <p style="margin: 5px 0; color: #888; font-size: 14px;">Date: ${date}</p>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; color: #333;">${orderNum}</h3>
          <p style="margin: 5px 0; color: #888; font-size: 12px; font-weight: bold;">${isInstallment ? 'BƆKƆƆ PAY PLAN' : 'STANDARD PURCHASE'}</p>
        </div>
      </div>

      <p style="font-size: 16px;">Hi <strong>${buyer.firstName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6;">Thank you for shopping with The University Hub. Your order has been confirmed and is being processed.</p>

      <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 15px; padding: 25px; margin: 30px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 12px; text-transform: uppercase; color: #aaa;">Item</th>
              <th style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 12px; text-transform: uppercase; color: #aaa;">Qty</th>
              <th style="text-align: right; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 12px; text-transform: uppercase; color: #aaa;">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 15px 0; font-weight: bold; color: #444;">${product.title}</td>
              <td style="padding: 15px 0; text-align: center; color: #666;">${order.quantity}</td>
              <td style="padding: 15px 0; text-align: right; font-weight: bold; color: #413796;">GH₵${parseFloat(order.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            ${isInstallment ? `
            <tr>
              <td colspan="2" style="padding: 15px 0 5px 0; text-align: right; font-size: 13px; color: #888;">Initial Deposit Paid</td>
              <td style="padding: 15px 0 5px 0; text-align: right; font-weight: bold; color: #22c55e;">GH₵${(parseFloat(order.totalAmount) * 0.25).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 5px 0; text-align: right; font-size: 13px; color: #888;">Remaining Debt</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #ef4444;">GH₵${(parseFloat(order.totalAmount) * 0.75).toFixed(2)}</td>
            </tr>
            ` : `
            <tr>
              <td colspan="2" style="padding: 20px 0 0 0; text-align: right; font-weight: bold; font-size: 16px;">Total Paid</td>
              <td style="padding: 20px 0 0 0; text-align: right; font-weight: 800; font-size: 20px; color: #413796;">GH₵${parseFloat(order.totalAmount).toFixed(2)}</td>
            </tr>
            `}
          </tfoot>
        </table>
      </div>

      <div style="display: grid; grid-template-cols: 1fr 1px 1fr; gap: 20px; margin-top: 20px;">
        <div>
          <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #aaa;">Delivery Details</h4>
          <p style="margin: 0; font-size: 14px; font-weight: bold;">${order.shippingMode?.replace(/_/g, ' ').toUpperCase() || 'EXPRESS DELIVERY'}</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Status: Processing</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f0f0f0; padding-top: 20px;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">This is an automated invoice from The University Hub platform.</p>
      </div>
    </div>
  `;
  
  const modernHtml = wrapInModernTemplate('Order Confirmed!', content, `${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard`, 'Track My Order');
  await sendEmailNotification(buyer.email, subject, modernHtml);
  
  // Also notify admin
  await sendAdminAlert(
    'New Online Payment', 
    `Order ${orderNum} for ${product.title} - GH₵${parseFloat(order.totalAmount).toFixed(2)}`
  );
}

export async function notifySellerOfNewOrder(order: any, seller: any, product: any) {
  const orderNum = order.orderNumber || `#${order.id}`;
  const subject = `New Order Received: ${orderNum}`;
  const isCOD = order.paymentGateway === 'manual' || order.paymentMode === 'cod';
  
  const content = `
    <p>Hi ${seller.username},</p>
    <p>You have received a new order for <strong>${product.title}</strong>.</p>
    <div style="background-color: #f9fafb; padding: 25px; border-radius: 20px; margin: 25px 0; border: 1px solid #f3f4f6;">
      <p style="margin: 0 0 10px 0;"><strong>Order Number:</strong> ${orderNum}</p>
      <p style="margin: 0 0 10px 0;"><strong>Quantity:</strong> ${order.quantity}</p>
      <p style="margin: 0 0 10px 0;"><strong>Total Amount:</strong> GH₵${parseFloat(order.totalAmount).toFixed(2)}</p>
      <p style="margin: 0;"><strong>Payment Method:</strong> ${isCOD ? 'Cash on Delivery' : 'Paid Online'}</p>
    </div>
    <p>Once you approve the order, Kaydem Logistics will be notified for pickup.</p>
  `;
  
  const modernHtml = wrapInModernTemplate('New Order Received!', content, `${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard`, 'Go to Seller Dashboard');
  await sendEmailNotification(seller.email, subject, modernHtml);

  // 3. Socket Alert to seller
  emitRealTimeNotification(seller.id, {
    type: 'new_order',
    title: 'New Order Received!',
    message: `Order ${orderNum} received for ${product.title}`,
    orderId: order.id
  });
}

export async function notifyAdminOfNewOrder(order: any, adminEmail: string, product: any, seller: any) {
  const subject = `New Order Alert: #${order.id}`;
  const content = `
    <p>A new order has been placed on the platform.</p>
    <div style="background-color: #f9fafb; padding: 25px; border-radius: 20px; margin: 25px 0; border: 1px solid #f3f4f6;">
      <p style="margin: 0 0 10px 0;"><strong>Order Number:</strong> ${order.orderNumber || order.id}</p>
      ${order.invoiceNumber ? `<p style="margin: 0 0 10px 0;"><strong>Invoice Number:</strong> ${order.invoiceNumber}</p>` : ''}
      <p style="margin: 0 0 10px 0;"><strong>Product:</strong> ${product.title}</p>
      <p style="margin: 0 0 10px 0;"><strong>Seller:</strong> ${seller.username} (${seller.email})</p>
      <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> GH₵${parseFloat(order.totalAmount).toFixed(2)}</p>
      <p style="margin: 0;"><strong>Payment Gateway:</strong> ${order.paymentGateway}</p>
    </div>
  `;
  
  const modernHtml = wrapInModernTemplate('New Order Alert', content, `${process.env.APP_URL || 'https://uniexchangehub.com'}/admin`, 'View Admin Panel');
  
  // Use unified alert system to ensure it hits the configured Gmail and WhatsApp
  await sendAdminAlert(
    'New Order Received',
    `#${order.id} - ${product.title} (GH₵${parseFloat(order.totalAmount).toFixed(2)})`,
    content
  );
}

export async function notifyBuyerOfOrderApproval(order: any, buyer: any, product: any) {
  const subject = `Order Approved: ${product.title}`;
  const content = `
    <p>Hi ${buyer.firstName},</p>
    <p>The seller has approved your order for <strong>${product.title}</strong>.</p>
    <div style="background-color: #f9fafb; padding: 25px; border-radius: 20px; margin: 25px 0; border: 1px solid #f3f4f6;">
      <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> #${order.id}</p>
      <p style="margin: 0;"><strong>Status:</strong> Seller Approved</p>
    </div>
    <p>Our logistics partner, Kaydem Logistics, has been notified to pick up your item. You will receive another update when it's on its way.</p>
  `;
  
  const modernHtml = wrapInModernTemplate('Great News!', content, `${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard`, 'Track My Order');
  await sendEmailNotification(buyer.email, subject, modernHtml);
  await sendAdminAlert('Order Approved', `Seller approved Order #${order.id} for ${product.title}`);
}

export async function sendTrackingUpdate(order: any, buyer: any, product: any) {
  const isNearDelivery = order.deliveryStatus === 'near_delivery';
  const isCOD = order.paymentGateway === 'manual' || order.paymentMode === 'cod';
  
  const subject = isNearDelivery 
    ? `Action Required: Your order #${order.id} is arriving tomorrow!` 
    : `Tracking Update: Your order #${order.id} is ${order.deliveryStatus.replace(/_/g, ' ')}`;

  const codReminder = (isNearDelivery && isCOD) ? `
    <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 25px; border-radius: 20px; margin: 25px 0;">
      <h3 style="color: #ea580c; margin-top: 0; font-weight: 900; text-transform: uppercase; font-size: 14px;">💳 Payment Reminder</h3>
      <p style="color: #9a3412; font-weight: bold; margin: 0;">Our delivery agent will be with you tomorrow. Please ensure you have the exact amount of <strong>GH₵${parseFloat(order.totalAmount).toFixed(2)}</strong> ready for payment upon delivery.</p>
    </div>
  ` : '';

  const content = `
    <p>Hi ${buyer.firstName},</p>
    <p>Your order for <strong>${product.title}</strong> has a new update.</p>
    
    ${codReminder}

    <div style="background-color: #f9fafb; padding: 25px; border-radius: 20px; margin: 25px 0; border: 1px solid #f3f4f6;">
      <p style="margin: 0 0 10px 0;"><strong>New Status:</strong> ${order.deliveryStatus.toUpperCase().replace(/_/g, ' ')}</p>
      <p style="margin: 0 0 10px 0;"><strong>Carrier:</strong> ${order.carrier || 'Ghana Post'}</p>
      <p style="margin: 0 0 10px 0;"><strong>Tracking Number:</strong> ${order.trackingNumber || 'N/A'}</p>
      <p style="margin: 0;"><strong>Update:</strong> ${order.trackingHistory || 'No details provided.'}</p>
    </div>
  `;
  
  const modernHtml = wrapInModernTemplate('Delivery Update', content, `${process.env.APP_URL || 'https://uniexchangehub.com'}/dashboard`, 'Check Tracking Details');
  await sendEmailNotification(buyer.email, subject, modernHtml);
}

export async function notifyAdminOfVerificationRequest(type: string, userId: number) {
  await sendAdminAlert('New Verification', `New ${type} verification request from User ID: ${userId}. Please review in Admin Panel.`);
}
