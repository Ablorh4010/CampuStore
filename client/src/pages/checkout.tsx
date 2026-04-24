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
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Lock, CreditCard, ShieldCheck, Info, Wallet, 
  Truck, User, MapPin, CheckCircle2, Map as MapIcon
} from "lucide-react";
import { IdScanCapture, FacialCapture } from "@/components/verification";
import { useGeolocation } from "@/hooks/use-geolocation";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy';
const stripePromise = loadStripe(stripePublicKey);

interface CheckoutDetails {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  university: string;
  city: string;
  campus: string;
  address: string;
}

function CheckoutForm({ isBokoo, originalTotal, checkoutDetails, locationData }: { 
  isBokoo: boolean, 
  originalTotal: number,
  checkoutDetails: CheckoutDetails,
  locationData: { latitude: string; longitude: string } | null
}) {
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
        payment_method_data: {
          billing_details: {
            name: `${checkoutDetails.firstName} ${checkoutDetails.lastName}`,
            email: checkoutDetails.email,
            phone: checkoutDetails.phoneNumber,
          }
        }
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
              ? `Bɔkɔɔ Pay Active: You are paying the first installment of $${(originalTotal / 4).toFixed(2)}.`
              : "All payment methods are processed securely through Stripe."
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

      <div className="flex flex-wrap justify-center items-center gap-4 opacity-90 transition-all">
         <img src="https://www.vectorlogo.zone/logos/apple_pay/apple_pay-ar21.svg" alt="Apple Pay" className="h-5" />
         <img src="https://www.vectorlogo.zone/logos/google_pay/google_pay-ar21.svg" alt="Google Pay" className="h-5" />
         <img src="https://www.vectorlogo.zone/logos/visa/visa-ar21.svg" alt="Visa" className="h-3" />
         <img src="https://www.vectorlogo.zone/logos/mastercard/mastercard-ar21.svg" alt="Mastercard" className="h-5" />
      </div>
    </form>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { location, captureLocation, loading: locationLoading } = useGeolocation();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Info, 2: Address, 3: Verification (Installments), 4: Payment
  const [details, setDetails] = useState<CheckoutDetails>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    university: user?.university || '',
    city: user?.city || '',
    campus: user?.campus || '',
    address: '',
  });

  const [isBokoo, setIsBokoo] = useState(false);
  const [shippingMode, setShippingMode] = useState<string>('ghana_post_standard');
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [buyerIdFile, setBuyerIdFile] = useState<File | null>(null);
  const [buyerFaceFile, setBuyerFaceFile] = useState<File | null>(null);
  const [verificationUrls, setVerificationUrls] = useState<{ idUrl: string; faceUrl: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const shippingFee = shippingMode === 'express_delivery' ? 15 : 0;
  const grandTotal = cartTotal + shippingFee;

  useEffect(() => {
    if (cartItems.length === 0) {
      setLocation('/browse');
    }
  }, [cartItems.length, setLocation]);

  const initializePayment = useCallback((useBokoo: boolean = false, mode: string = shippingMode, vUrls = verificationUrls) => {
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
      shippingMode: mode,
      guestDetails: !user ? details : undefined,
      buyerLocation: location,
      verificationUrls: vUrls
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
        setIsLoading(false);
      });
  }, [cartTotal, cartItems, toast, shippingMode, user, details, location, verificationUrls]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!details.firstName || !details.lastName || !details.email || !details.phoneNumber) {
        toast({ title: "Missing Information", description: "Please fill in all personal details.", variant: "destructive" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!details.university || !details.city || !details.address) {
        toast({ title: "Missing Address", description: "Please provide your delivery address.", variant: "destructive" });
        return;
      }
      if (isBokoo) {
        setStep(3);
        captureLocation();
      } else {
        setStep(4);
        initializePayment(false);
      }
    } else if (step === 3) {
      if (!buyerIdFile || !buyerFaceFile || !location) {
        toast({ 
          title: "Verification Required", 
          description: "Live ID, face photo, and location are mandatory for installments.", 
          variant: "destructive" 
        });
        if (!location) captureLocation();
        return;
      }
      handleVerificationAndContinue();
    }
  };

  const handleVerificationAndContinue = async () => {
    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append('buyerIdScan', buyerIdFile!);
      formData.append('buyerFaceScan', buyerFaceFile!);
      formData.append('latitude', location!.latitude);
      formData.append('longitude', location!.longitude);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/buyer-verification', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      const vUrls = { idUrl: data.buyerIdScanUrl, faceUrl: data.buyerFaceScanUrl };
      setVerificationUrls(vUrls);
      setStep(4);
      initializePayment(true, shippingMode, vUrls);
    } catch (error) {
      toast({ title: "Verification Failed", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
          {[
            { n: 1, label: 'Info', icon: User },
            { n: 2, label: 'Address', icon: MapPin },
            { n: 3, label: 'Verify', icon: ShieldCheck, hide: !isBokoo },
            { n: 4, label: 'Pay', icon: CreditCard }
          ].filter(s => !s.hide).map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  step === s.n ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110' : 
                  step > s.n ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > s.n ? <CheckCircle2 className="h-6 w-6" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span className={`text-[10px] font-black uppercase mt-2 tracking-widest ${step === s.n ? 'text-primary' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-0.5 flex-1 mx-4 transition-colors ${step > s.n ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <Card className="rounded-[2.5rem] shadow-xl border-none">
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-2xl font-black italic">Personal Details.</CardTitle>
                  <CardDescription>Tell us who is receiving the order</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest">First Name</Label>
                      <Input 
                        value={details.firstName} 
                        onChange={e => setDetails({...details, firstName: e.target.value})}
                        className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest">Last Name</Label>
                      <Input 
                        value={details.lastName} 
                        onChange={e => setDetails({...details, lastName: e.target.value})}
                        className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest">Email Address</Label>
                    <Input 
                      type="email"
                      value={details.email} 
                      onChange={e => setDetails({...details, email: e.target.value})}
                      className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest">Phone Number</Label>
                    <Input 
                      value={details.phoneNumber} 
                      onChange={e => setDetails({...details, phoneNumber: e.target.value})}
                      className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <Button onClick={handleNextStep} className="w-full h-14 rounded-2xl bg-black text-white font-black text-lg mt-4">
                    Continue to Address
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="rounded-[2.5rem] shadow-xl border-none">
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-2xl font-black italic">Delivery Address.</CardTitle>
                  <CardDescription>Where should we send your items?</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest">University</Label>
                      <Input 
                        value={details.university} 
                        onChange={e => setDetails({...details, university: e.target.value})}
                        className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest">City</Label>
                      <Input 
                        value={details.city} 
                        onChange={e => setDetails({...details, city: e.target.value})}
                        className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest">Detailed Address / Campus Hall</Label>
                    <Input 
                      value={details.address} 
                      onChange={e => setDetails({...details, address: e.target.value})}
                      placeholder="e.g. Block B Room 42, Jean Nelson Hall"
                      className="rounded-xl h-12 border-gray-100 bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <Separator className="my-8" />

                  <div className={`p-6 rounded-3xl border-2 transition-all ${isBokoo ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm">
                        <Wallet className={`h-6 w-6 ${isBokoo ? 'text-primary' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-lg">Bɔkɔɔ Pay (Installments)</h3>
                            <p className="text-sm text-gray-500 font-medium">Pay 25% now, the rest later. No interest.</p>
                          </div>
                          <Checkbox 
                            id="bokoo-toggle" 
                            checked={isBokoo}
                            onCheckedChange={(checked) => setIsBokoo(checked as boolean)}
                            className="h-6 w-6 rounded-lg"
                          />
                        </div>
                        {isBokoo && (
                          <div className="mt-4 bg-white p-4 rounded-2xl border border-primary/20 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3" />
                              Strict Verification Required
                            </p>
                            <p className="text-xs text-gray-600">Selecting this option requires live ID capture, facial verification, and live location sharing.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-14 rounded-2xl font-black">Back</Button>
                    <Button onClick={handleNextStep} className="flex-[2] h-14 rounded-2xl bg-black text-white font-black text-lg">
                      {isBokoo ? 'Continue to Verification' : 'Continue to Payment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="rounded-[2.5rem] shadow-xl border-none">
                <CardHeader className="pt-8 px-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-2xl">
                      <ShieldCheck className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black italic">Live Verification.</CardTitle>
                      <CardDescription>Installment plans require mandatory live authentication</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {location ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                      <MapIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-xs font-black text-green-800 uppercase tracking-widest">Live Location Captured</p>
                        <p className="text-[10px] text-green-700">Lat: {location.latitude}, Lng: {location.longitude}</p>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={captureLocation} 
                      disabled={locationLoading}
                      className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {locationLoading ? 'Capturing Location...' : 'Capture Live Location'}
                    </Button>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <IdScanCapture 
                      title="Live ID Photo"
                      description="Take a live photo of your National ID or Student ID."
                      onCapture={setBuyerIdFile}
                      onRemove={() => setBuyerIdFile(null)}
                    />
                    <FacialCapture 
                      title="Live Face Photo"
                      description="Take a live selfie to verify your identity."
                      onCapture={setBuyerFaceFile}
                      onRemove={() => setBuyerFaceFile(null)}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-14 rounded-2xl font-black">Back</Button>
                    <Button 
                      onClick={handleNextStep} 
                      disabled={!buyerIdFile || !buyerFaceFile || !location || isVerifying}
                      className="flex-[2] h-14 rounded-2xl bg-black text-white font-black text-lg"
                    >
                      {isVerifying ? 'Verifying...' : 'Complete Verification'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card className="rounded-[2.5rem] shadow-xl border-none">
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-2xl font-black italic">Payment Details.</CardTitle>
                  <CardDescription>Choose your preferred payment method</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {isLoading ? (
                    <div className="py-20 text-center">
                      <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="font-black italic text-gray-400">Preparing secure gateway...</p>
                    </div>
                  ) : clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm 
                        isBokoo={isBokoo} 
                        originalTotal={cartTotal} 
                        checkoutDetails={details}
                        locationData={location}
                      />
                    </Elements>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="rounded-[2.5rem] shadow-xl border-none sticky top-24">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-black italic">Order Summary.</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                  {cartItems.map((item: any) => (
                    <div key={item.product.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                        <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{item.product.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-400 font-bold">Qty: {item.quantity}</span>
                          <span className="font-black text-sm">${(parseFloat(item.product.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="bg-gray-100" />

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Shipping</span>
                    <span className={shippingFee === 0 ? "text-green-600" : "text-gray-900"}>
                      {shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <Separator className="bg-gray-100" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-black italic">Grand Total.</span>
                  <span className="text-3xl font-black">${grandTotal.toFixed(2)}</span>
                </div>

                {isBokoo && (
                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <div className="flex justify-between items-center text-primary mb-2">
                      <span className="font-black italic">Due Today.</span>
                      <span className="text-2xl font-black">${(grandTotal / 4).toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                      Remaining 3 payments of ${(grandTotal / 4).toFixed(2)} charged bi-weekly.
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 pt-4">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    100% Secure Transaction
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
