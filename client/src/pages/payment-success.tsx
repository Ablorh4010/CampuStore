import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const statusParam = urlParams.get('status');

    // Handle Cash on Delivery success
    if (mode === 'cod') {
      setStatus('succeeded');
      clearCart();
      return;
    }

    // Handle Paystack/Redirect success
    if (statusParam === 'success' || mode === 'success') {
      setStatus('succeeded');
      clearCart();
      return;
    }

    // Handle failure
    if (statusParam === 'failed' || mode === 'failed') {
      setStatus('failed');
      setErrorMessage('Your payment could not be processed. Please try again.');
      return;
    }

    // Default for just arriving here without params (assuming success if redirected from checkout success)
    setStatus('succeeded');
    clearCart();
  }, [clearCart]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Verifying Status</CardTitle>
            <CardDescription>
              Please wait while we confirm your order...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'succeeded') {
    const isCOD = new URLSearchParams(window.location.search).get('mode') === 'cod';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-900">
              {isCOD ? 'Order Placed Successfully!' : 'Payment Successful!'}
            </CardTitle>
            <CardDescription>
              {isCOD 
                ? 'Your order has been placed successfully. A customer service agent will reach you soon.'
                : 'Thank you for your purchase. Your order has been confirmed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium mb-1">What's next?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {isCOD ? (
                  <>
                    <li>Our agent will call you to confirm your delivery</li>
                    <li>Please prepare the exact amount for the delivery agent</li>
                    <li>Track your order status in your dashboard</li>
                  </>
                ) : (
                  <>
                    <li>You'll receive an order confirmation email shortly</li>
                    <li>The seller will be notified of your purchase</li>
                    <li>Track your order status in your dashboard</li>
                  </>
                )}
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
          <CardTitle className="text-red-900">Process Failed</CardTitle>
          <CardDescription>
            {errorMessage || 'Your request could not be completed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <p className="font-medium mb-1">What can you do?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your details and try again</li>
              <li>Use a different payment method</li>
              <li>Contact support if the issue persists</li>
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
