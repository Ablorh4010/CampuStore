import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStripe } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function PaymentSuccessContent() {
  const stripe = useStripe();
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      setStatus('failed');
      setErrorMessage('Payment information not found');
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        setStatus('failed');
        setErrorMessage('Payment not found');
        return;
      }

      switch (paymentIntent.status) {
        case 'succeeded':
          setStatus('succeeded');
          clearCart();
          break;
        case 'processing':
          setStatus('loading');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
          break;
        case 'requires_payment_method':
          setStatus('failed');
          setErrorMessage('Payment was not completed. Please try again.');
          break;
        default:
          setStatus('failed');
          setErrorMessage('Something went wrong with your payment');
          break;
      }
    }).catch((error) => {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setErrorMessage('Unable to verify payment status');
    });
  }, [stripe, clearCart]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'succeeded') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Payment Successful!</CardTitle>
            <CardDescription>
              Thank you for your purchase. Your order has been confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium mb-1">What's next?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>You'll receive an order confirmation email shortly</li>
                <li>The seller will be notified of your purchase</li>
                <li>Track your order status in your dashboard</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setLocation('/browse')} 
                variant="outline"
                className="flex-1"
                data-testid="button-continue-shopping"
              >
                Continue Shopping
              </Button>
              <Button 
                onClick={() => setLocation('/')} 
                className="flex-1"
                data-testid="button-go-home"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Payment Failed</CardTitle>
          <CardDescription>
            {errorMessage || 'Your payment could not be processed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <p className="font-medium mb-1">What can you do?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your payment details and try again</li>
              <li>Use a different payment method</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setLocation('/checkout')} 
              className="flex-1"
              data-testid="button-retry-payment"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => setLocation('/browse')} 
              variant="outline"
              className="flex-1"
              data-testid="button-back-to-shopping"
            >
              Back to Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentSuccessContent />
    </Elements>
  );
}
