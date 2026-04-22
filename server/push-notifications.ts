/**
 * Web Push Notification Service
 * Provides push notifications for order updates, messages, and promotions
 */
import webpush from 'web-push';
import { db } from './db';

// Push subscription schema - will be stored in database
export interface PushSubscription {
  id: number;
  odId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}

// Initialize web-push with VAPID keys
function initializeWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'support@uniexchangehub.com';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      `mailto:${email}`,
      publicKey,
      privateKey
    );
    console.log('✅ Web Push notification service initialized');
    return true;
  } else {
    console.warn('⚠️  VAPID keys not configured. Push notifications disabled.');
    console.warn('   Generate keys with: npx web-push generate-vapid-keys');
    return false;
  }
}

const isInitialized = initializeWebPush();

// In-memory store for subscriptions (in production, use database)
const subscriptions = new Map<number, webpush.PushSubscription>();

/**
 * Save a push subscription for a user
 */
export async function saveSubscription(userId: number, subscription: webpush.PushSubscription): Promise<boolean> {
  try {
    subscriptions.set(userId, subscription);
    console.log(`Push subscription saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return false;
  }
}

/**
 * Remove a push subscription for a user
 */
export async function removeSubscription(userId: number): Promise<boolean> {
  try {
    subscriptions.delete(userId);
    console.log(`Push subscription removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    return false;
  }
}

/**
 * Get subscription for a user
 */
export function getSubscription(userId: number): webpush.PushSubscription | undefined {
  return subscriptions.get(userId);
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: number, 
  payload: NotificationPayload
): Promise<boolean> {
  if (!isInitialized) {
    console.log('Push notifications not configured, skipping...');
    return false;
  }

  const subscription = getSubscription(userId);
  if (!subscription) {
    console.log(`No subscription found for user ${userId}`);
    return false;
  }

  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      image: payload.image,
      data: {
        url: payload.url || '/',
        ...payload.data
      },
      tag: payload.tag,
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    await webpush.sendNotification(subscription, notificationPayload);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error: unknown) {
    const err = error as { statusCode?: number };
    if (err.statusCode === 410) {
      // Subscription expired, remove it
      await removeSubscription(userId);
      console.log(`Subscription expired for user ${userId}, removed`);
    } else {
      console.error(`Failed to send push notification to user ${userId}:`, error);
    }
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToMany(
  userIds: number[],
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    userIds.map(async (userId) => {
      const success = await sendPushNotification(userId, payload);
      if (success) sent++;
      else failed++;
    })
  );

  return { sent, failed };
}

// Predefined notification types for common events
export const NotificationTypes = {
  /**
   * Order status update notification
   */
  orderUpdate: (orderId: number, status: string, productTitle: string) => ({
    title: 'Order Update',
    body: `Your order for "${productTitle}" is now ${status}`,
    icon: '/icon-192.png',
    url: `/dashboard?tab=orders`,
    tag: `order-${orderId}`,
    data: { type: 'order', orderId }
  }),

  /**
   * New message notification
   */
  newMessage: (senderName: string, preview: string) => ({
    title: `New message from ${senderName}`,
    body: preview.length > 100 ? preview.substring(0, 97) + '...' : preview,
    icon: '/icon-192.png',
    url: '/dashboard?tab=messages',
    tag: 'message',
    data: { type: 'message' }
  }),

  /**
   * Product approved notification
   */
  productApproved: (productTitle: string) => ({
    title: 'Product Approved! 🎉',
    body: `Your product "${productTitle}" has been approved and is now live`,
    icon: '/icon-192.png',
    url: '/dashboard?tab=products',
    tag: 'product-approved',
    data: { type: 'product' }
  }),

  /**
   * New order received notification (for sellers)
   */
  newOrder: (productTitle: string, buyerName: string) => ({
    title: 'New Order Received! 🛒',
    body: `${buyerName} ordered "${productTitle}"`,
    icon: '/icon-192.png',
    url: '/dashboard?tab=orders',
    tag: 'new-order',
    data: { type: 'order' }
  }),

  /**
   * Promotion notification
   */
  promotion: (title: string, message: string, url?: string) => ({
    title,
    body: message,
    icon: '/icon-192.png',
    url: url || '/',
    tag: 'promotion',
    data: { type: 'promotion' }
  }),

  /**
   * Payment received notification (for sellers)
   */
  paymentReceived: (amount: string, productTitle: string) => ({
    title: 'Payment Received! 💰',
    body: `You received ${amount} for "${productTitle}"`,
    icon: '/icon-192.png',
    url: '/dashboard?tab=orders',
    tag: 'payment',
    data: { type: 'payment' }
  }),

  /**
   * Verification status notification
   */
  verificationUpdate: (status: 'approved' | 'rejected') => ({
    title: status === 'approved' ? 'Verification Approved! ✓' : 'Verification Update',
    body: status === 'approved' 
      ? 'Your seller verification has been approved. You can now receive payments!'
      : 'Your verification needs attention. Please check your dashboard.',
    icon: '/icon-192.png',
    url: '/seller-settings',
    tag: 'verification',
    data: { type: 'verification', status }
  })
};

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
