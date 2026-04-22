import { useEffect, useState, useCallback } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, CreditCard, ShieldCheck, Info, Wallet, Truck } from "lucide-react";
import { IdScanCapture, FacialCapture } from "@/components/verification";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy';
const stripePromise = loadStripe(stripePublicKey);

function CheckoutForm({ isBokoo, originalTotal }: { isBokoo: boolean, originalTotal: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent) {
      setLocation(`/payment-success?payment_intent_client_secret=${paymentIntent.client_secret}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 text-sm">Secure Payment</h3>
          <p className="text-blue-700 text-xs mt-1">
            {isBokoo 
              ? `Bɔkɔɔ Active: You are paying the first installment of $${(originalTotal / 4).toFixed(2)}.`
              : "All payment methods (Card, Apple Pay, MTN MoMo, Telecel Cash) are processed securely through Stripe."
            }
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 shadow-inner">
        <PaymentElement />
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-lg font-bold" 
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-complete-payment"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {isBokoo ? `Pay Installment 1 ($${(originalTotal / 4).toFixed(2)})` : "Complete Payment"}
          </span>
        )}
      </Button>

      <div className="flex justify-center items-center gap-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
         {/* Simulated payment provider logos */}
         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Apple_Pay_logo.svg/512px-Apple_Pay_logo.svg.png" alt="Apple Pay" className="h-6" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/MTN_Logo.svg/1024px-MTN_Logo.svg.png" alt="MTN MoMo" className="h-6" />
         <img src="https://seeklogo.com/images/V/vodafone-cash-logo-9759DB60F4-seeklogo.com.png" alt="Telecel" className="h-6" />
      </div>

      <p className="text-xs text-gray-500 text-center">
        By completing this payment, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBokoo, setIsBokoo] = useState(false);
  const [shippingMode, setShippingMode] = useState<string>('ghana_post_standard');
  const [verificationStep, setVerificationStep] = useState<'verify' | 'payment'>('verify');
  const [buyerIdFile, setBuyerIdFile] = useState<File | null>(null);
  const [buyerFaceFile, setBuyerFaceFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const shippingFee = shippingMode === 'express_delivery' ? 15 : 0;
  const grandTotal = cartTotal + shippingFee;

  const initializePayment = useCallback((useBokoo: boolean = false, mode: string = shippingMode) => {
    setIsLoading(true);
    const fee = mode === 'express_delivery' ? 15 : 0;
    const amount = useBokoo ? (cartTotal + fee) / 4 : (cartTotal + fee);
    
    apiRequest("POST", "/api/create-payment-intent", { 
      amount,
      cartItems: cartItems.map((item: any) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      isBokoo: useBokoo,
      shippingMode: mode
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
        console.error('Payment intent error:', error);
        setIsLoading(false);
      });
  }, [cartTotal, cartItems, toast, shippingMode]);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to proceed with checkout",
        variant: "destructive",
      });
      setLocation('/auth');
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      });
      setLocation('/browse');
      return;
    }

    // Check if buyer already verified
    if (user.buyerIdScanUrl && user.buyerFaceScanUrl) {
      // Skip verification step
      setVerificationStep('payment');
      initializePayment(isBokoo, shippingMode);
    } else {
      setIsLoading(false);
    }
  }, [user, cartItems, initializePayment, isBokoo, shippingMode, setLocation, toast]);

  const handleBokooToggle = (checked: boolean) => {
    setIsBokoo(checked);
    initializePayment(checked, shippingMode);
  };

  const handleShippingChange = (value: string) => {
    setShippingMode(value);
    initializePayment(isBokoo, value);
  };

  const handleVerificationSubmit = async () => {
    if (!buyerIdFile || !buyerFaceFile) {
      toast({
        title: "Verification Required",
        description: "Please upload both ID document and selfie to continue",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const formData = new FormData();
      formData.append('buyerIdScan', buyerIdFile);
      formData.append('buyerFaceScan', buyerFaceFile);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/buyer-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Verification upload failed');
      }

      toast({
        title: "Verification Complete",
        description: "Your identity has been verified. Proceeding to payment...",
      });

      setVerificationStep('payment');
      initializePayment(isBokoo);
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Unable to verify your identity. Please try again.",
        variant: "destructive",
      });
      console.error('Verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading && !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">
            {verificationStep === 'verify' ? 'Processing...' : 'Setting up secure payment...'}
          </p>
        </div>
      </div>
    );
  }

  // Show verification step first
  if (verificationStep === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/browse')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shopping
          </Button>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Buyer Verification Required</CardTitle>
                      <CardDescription>
                        For your security, please verify your identity before checkout
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      🔒 Your verification documents are encrypted and securely stored.
                      This one-time verification helps protect both buyers and sellers.
                    </p>
                  </div>
                  
                  <IdScanCapture 
                    onCapture={setBuyerIdFile}
                    onRemove={() => setBuyerIdFile(null)}
                  />
                  
                  <FacialCapture 
                    onCapture={setBuyerFaceFile}
                    onRemove={() => setBuyerFaceFile(null)}
                  />

                  <Button 
                    onClick={handleVerificationSubmit}
                    disabled={!buyerIdFile || !buyerFaceFile || isVerifying}
                    className="w-full"
                    size="lg"
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Verify & Continue to Payment
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {cartItems.map((item: any) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium truncate">{item.product.title}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Payment Setup Failed</CardTitle>
            <CardDescription>
              We couldn't initialize the payment. Please try again or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/browse')} className="w-full">
              Return to Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/browse')}
          className="mb-6"
          data-testid="button-back-to-cart"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shopping
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-2 border-primary/20 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Bɔkɔɔ (Pay in 4)</h3>
                        <p className="text-sm text-gray-600">Split your purchase into four equal interest-free installments.</p>
                      </div>
                      <Checkbox 
                        id="bokoo-toggle" 
                        checked={isBokoo}
                        onCheckedChange={(checked) => handleBokooToggle(checked as boolean)}
                        className="h-6 w-6"
                      />
                    </div>
                    {isBokoo && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <div className="bg-primary text-white p-2 rounded-lg text-center text-xs">
                          <p className="font-bold">Today</p>
                          <p>${(cartTotal / 4).toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-100 text-gray-400 p-2 rounded-lg text-center text-xs border border-dashed">
                          <p className="font-bold">2 Weeks</p>
                          <p>${(cartTotal / 4).toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-100 text-gray-400 p-2 rounded-lg text-center text-xs border border-dashed">
                          <p className="font-bold">4 Weeks</p>
                          <p>${(cartTotal / 4).toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-100 text-gray-400 p-2 rounded-lg text-center text-xs border border-dashed">
                          <p className="font-bold">6 Weeks</p>
                          <p>${(cartTotal / 4).toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Shipping Method</CardTitle>
                    <CardDescription>
                      Select your preferred delivery option within Ghana
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={shippingMode} onValueChange={handleShippingChange} className="grid gap-4">
                  <div className="flex items-center space-x-3 rounded-xl border-2 p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="ghana_post_standard" id="gp_standard" />
                    <Label htmlFor="gp_standard" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">Ghana Post Standard</p>
                          <p className="text-xs text-gray-500">1 - 10 Business Days</p>
                        </div>
                        <span className="text-sm font-bold text-green-600">FREE</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-xl border-2 p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="express_delivery" id="express" />
                    <Label htmlFor="express" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">Express Delivery</p>
                          <p className="text-xs text-gray-500">1 - 3 Business Days</p>
                        </div>
                        <span className="text-sm font-bold">$15.00</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-xl border-2 p-4 cursor-pointer hover:border-primary/50 transition-colors opacity-60">
                    <RadioGroupItem value="seller_delivery" id="seller" disabled />
                    <Label htmlFor="seller" className="flex-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">Seller Delivery</p>
                          <p className="text-xs text-gray-500">Available for on-campus orders only</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>
                      Choose your preferred payment method
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                   <div className="py-20 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Updating amount...</p>
                   </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }} key={clientSecret}>
                    <CheckoutForm isBokoo={isBokoo} originalTotal={cartTotal} />
                  </Elements>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cartItems.map((item: any) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium truncate">{item.product.title}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping ({shippingMode.replace(/_/g, ' ')})</span>
                    <span className={shippingFee === 0 ? "text-green-600 font-medium" : ""}>
                      {shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <Separator />

                {isBokoo ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-primary font-bold">
                      <div className="flex items-center gap-1">
                        <span>Due Today</span>
                        <Info className="h-3 w-3" />
                      </div>
                      <span className="text-2xl">${(grandTotal / 4).toFixed(2)}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-2">
                      <div className="flex justify-between text-gray-500">
                        <span>3 installments of</span>
                        <span>${(grandTotal / 4).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">Remaining balance will be charged automatically every 2 weeks.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3 mt-4 border border-dashed border-gray-200">
                  <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    Secure payment powered by Stripe
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
