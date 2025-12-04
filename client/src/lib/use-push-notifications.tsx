/**
 * Push Notifications Hook
 * Manages push notification subscription on the client side
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

export function usePushNotifications() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: null
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window &&
      'Notification' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : null,
      isLoading: false
    }));
  }, []);

  // Check current subscription status
  useEffect(() => {
    if (!state.isSupported || !user) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription
        }));
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    };

    checkSubscription();
  }, [state.isSupported, user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !user || !token) {
      toast({
        title: 'Push notifications not available',
        description: 'Your browser does not support push notifications or you are not logged in.',
        variant: 'destructive'
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive'
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Get VAPID public key from server
      const keyResponse = await fetch('/api/push/vapid-key');
      if (!keyResponse.ok) {
        throw new Error('Push notifications not configured on server');
      }
      const { publicKey } = await keyResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast({
        title: 'Notifications enabled! 🔔',
        description: 'You will now receive updates for orders, messages, and more.',
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Failed to enable notifications',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user, token, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!state.isSupported || !user || !token) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications.',
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Failed to disable notifications',
        description: 'Please try again.',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user, token, toast]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!user || !token) return false;

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Test notification sent',
          description: 'You should receive it shortly.',
        });
        return true;
      } else {
        const data = await response.json();
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Failed to send test',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, token, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
