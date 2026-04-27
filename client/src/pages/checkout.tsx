import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Lock, CreditCard, ShieldCheck, Info, Wallet, 
  Truck, User, MapPin, CheckCircle2, Map as MapIcon, Smartphone, Building2, Sparkles, Loader2
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

function CheckoutForm({ isBokoo, originalTotal, checkoutDetails }: { 
  isBokoo: boolean, 
  originalTotal: number,
  checkoutDetails: CheckoutDetails
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

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
      toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    } else if (paymentIntent) {
      setLocation(`/payment-success?payment_intent_client_secret=${paymentIntent.client_secret}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border p-4 shadow-inner">
        <PaymentElement />
      </div>
      <Button type="submit" className="w-full h-14 rounded-2xl bg-black text-white font-black text-lg" disabled={!stripe || isProcessing}>
        {isProcessing ? "Processing..." : `Pay ${isBokoo ? `GH₵${(originalTotal / 4).toFixed(2)}` : 'Now'}`}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { location, captureLocation, loading: locationLoading } = useGeolocation();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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

  const [paymentMode, setPaymentMode] = useState<'card' | 'momo' | 'bank' | 'cod'>('momo');
  const [isBokoo, setIsBokoo] = useState(false);
  const [shippingMode, setShippingMode] = useState<string>('ghana_post_standard');
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: adminMomo } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_momo_number'],
  });

  const paystackChargeMutation = useMutation({
    mutationFn: async () => {
      const amount = isBokoo ? grandTotal / 4 : grandTotal;
      const response = await apiRequest("POST", "/api/paystack/charge-momo", {
        amount,
        email: details.email,
        phoneNumber: details.phoneNumber,
        metadata: {
          userId: user?.id,
          cartItems: cartItems.map((item: any) => ({ productId: item.product.id, quantity: item.quantity })),
          isBokoo,
          guestDetails: !user ? details : undefined,
          codFee: codFee > 0 ? codFee : undefined
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      // If charge is successful, we might need to poll for status or it might be done
      if (data.status === 'success' || data.status === 'send_otp' || data.status === 'pay_offline') {
        toast({ title: "MoMo Prompt Sent", description: "Please check your phone for the payment prompt." });
        // Start verification with the reference
        paystackVerifyMutation.mutate(data.reference);
      } else {
        toast({ title: "Payment Error", description: data.message || "Could not process MoMo payment.", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Payment Error", description: error.message || "Could not initialize MoMo payment. Please try again.", variant: "destructive" });
    }
  });

  const paystackInitializeMutation = useMutation({
    mutationFn: async () => {
      const amount = isBokoo ? grandTotal / 4 : grandTotal;
      const response = await apiRequest("POST", "/api/paystack/initialize", {
        amount,
        email: details.email,
        metadata: {
          userId: user?.id,
          cartItems: cartItems.map((item: any) => ({ productId: item.product.id, quantity: item.quantity })),
          isBokoo,
          guestDetails: !user ? details : undefined,
          codFee: codFee > 0 ? codFee : undefined
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to PayStack checkout
      window.location.href = data.authorization_url;
    },
    onError: () => {
      toast({ title: "Payment Error", description: "Could not initialize MoMo payment. Please try again.", variant: "destructive" });
    }
  });

  const paystackVerifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await apiRequest("GET", `/api/paystack/verify/${reference}`);
      return response.json();
    },
    onSuccess: () => {
      setLocation('/payment-success');
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    if (reference) {
      paystackVerifyMutation.mutate(reference);
    }
  }, []);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [buyerIdFile, setBuyerIdFile] = useState<File | null>(null);
  const [buyerFaceFile, setBuyerFaceFile] = useState<File | null>(null);
  const [verificationUrls, setVerificationUrls] = useState<{ idUrl: string; faceUrl: string } | null>(null);

  const shippingFee = shippingMode === 'express_delivery' ? 15 : 0;
  const codFee = paymentMode === 'cod' ? (cartTotal * 0.10) : 0;
  const grandTotal = cartTotal + shippingFee + codFee;

  useEffect(() => {
    if (cartItems.length === 0) setLocation('/gh/browse');
  }, [cartItems.length, setLocation]);

  const initializePayment = useCallback((useBokoo: boolean = false, vUrls = verificationUrls) => {
    if (paymentMode !== 'card') return;
    setIsLoading(true);
    const amount = useBokoo ? grandTotal / 4 : grandTotal;
    
    apiRequest("POST", "/api/create-payment-intent", { 
      amount,
      cartItems: cartItems.map((item: any) => ({ productId: item.product.id, quantity: item.quantity })),
      isBokoo: useBokoo,
      guestDetails: !user ? details : undefined,
      verificationUrls: vUrls
    })
      .then(res => res.json())
      .then(data => { setClientSecret(data.clientSecret); setIsLoading(false); })
      .catch(() => { toast({ title: "Gateway Error", description: "Stripe key might be missing. Try another mode.", variant: "destructive" }); setIsLoading(false); });
  }, [grandTotal, cartItems, toast, user, details, verificationUrls, paymentMode]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!details.firstName || !details.email) return toast({ title: "Missing Info" });
      setStep(2);
    } else if (step === 2) {
      if (!details.address) return toast({ title: "Missing Address" });
      isBokoo ? setStep(3) : setStep(4);
    } else if (step === 3) {
      if (!buyerIdFile || !buyerFaceFile) return toast({ title: "Verification Required" });
      handleVerificationAndContinue();
    }
  };

  const handleVerificationAndContinue = async () => {
    setIsVerifying(true);
    // Mock upload for now until verified
    setStep(4);
    setIsVerifying(false);
  };

  const handleManualOrder = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/orders", {
        cartItems: cartItems.map((item: any) => ({ productId: item.product.id, quantity: item.quantity })),
        paymentMode,
        isBokoo,
        details,
        totalAmount: grandTotal,
        codFee: codFee > 0 ? codFee : undefined
      });
      setLocation('/payment-success');
    } catch (e) {
      toast({ title: "Error creating order" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = () => {
    if (paymentMode === 'momo') {
      paystackChargeMutation.mutate();
    } else if (paymentMode === 'card') {
      paystackInitializeMutation.mutate();
    } else {
      handleManualOrder();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
          {[{ n: 1, label: 'Info', icon: User }, { n: 2, label: 'Address', icon: MapPin }, { n: 3, label: 'Verify', icon: ShieldCheck, hide: !isBokoo }, { n: 4, label: 'Pay', icon: CreditCard }].filter(s => !s.hide).map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s.n ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-black uppercase mt-2 tracking-widest">{s.label}</span>
              </div>
              {i < arr.length - 1 && <div className={`h-0.5 flex-1 mx-2 ${step > s.n ? 'bg-black' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                <CardHeader className="px-0"><CardTitle className="text-3xl font-black italic">Details.</CardTitle></CardHeader>
                <div className="space-y-4">
                  <Input placeholder="First Name" value={details.firstName} onChange={e => setDetails({...details, firstName: e.target.value})} className="h-14 rounded-2xl" />
                  <Input placeholder="Last Name" value={details.lastName} onChange={e => setDetails({...details, lastName: e.target.value})} className="h-14 rounded-2xl" />
                  <Input placeholder="Email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} className="h-14 rounded-2xl" />
                  <Input placeholder="Phone" value={details.phoneNumber} onChange={e => setDetails({...details, phoneNumber: e.target.value})} className="h-14 rounded-2xl" />
                  <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg">Continue</Button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                <CardHeader className="px-0"><CardTitle className="text-3xl font-black italic">Shipping.</CardTitle></CardHeader>
                <div className="space-y-4">
                  <Input placeholder="University" value={details.university} onChange={e => setDetails({...details, university: e.target.value})} className="h-14 rounded-2xl" />
                  <Input placeholder="Address / Hall / Room" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} className="h-14 rounded-2xl" />
                  
                  <div className={`p-6 rounded-3xl border-2 transition-all ${isBokoo ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Wallet className="h-6 w-6" />
                         <div><h3 className="font-black">Bɔkɔɔ Pay</h3><p className="text-xs text-gray-500">4 installments, 0% interest.</p></div>
                      </div>
                      <Checkbox checked={isBokoo} onCheckedChange={(v) => setIsBokoo(v as boolean)} className="h-6 w-6" />
                    </div>
                  </div>
                  <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg">Proceed</Button>
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                <CardHeader className="px-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl font-black italic">Payment.</CardTitle>
                    {adminMomo?.value && (
                       <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                          <Smartphone className="w-3 h-3 mr-1" /> Secure Admin MoMo Gateway
                       </Badge>
                    )}
                  </div>
                </CardHeader>
                <div className="space-y-6">
                  <RadioGroup value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)} className="grid grid-cols-1 gap-4">
                    <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMode === 'momo' ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-4">
                        <Smartphone className="h-6 w-6" />
                        <div>
                          <p className="font-black uppercase text-xs">Mobile Money (Recommended)</p>
                          <p className="text-[10px] text-gray-400">MTN, Telecel, AT - Automated</p>
                        </div>
                      </div>
                      <RadioGroupItem value="momo" id="momo" />
                    </div>
                    <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMode === 'card' ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-6 w-6" />
                        <div><p className="font-black uppercase text-xs">Credit / Debit Card</p><p className="text-[10px] text-gray-400">Visa, Mastercard - Secure PayStack</p></div>
                      </div>
                      <RadioGroupItem value="card" id="card" />
                    </div>
                    <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMode === 'bank' ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-4">
                        <Building2 className="h-6 w-6" />
                        <div><p className="font-black uppercase text-xs">Bank Transfer</p><p className="text-[10px] text-gray-400">Manual verification</p></div>
                      </div>
                      <RadioGroupItem value="bank" id="bank" />
                    </div>
                    <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMode === 'cod' ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-4">
                        <Truck className="h-6 w-6" />
                        <div><p className="font-black uppercase text-xs">Cash on Delivery</p><p className="text-[10px] text-gray-400">10% service fee applies</p></div>
                      </div>
                      <RadioGroupItem value="cod" id="cod" />
                    </div>
                  </RadioGroup>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-black uppercase text-blue-600">Payment Instruction</p>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-relaxed font-bold">
                        {paymentMode === 'momo' 
                          ? `Funds will be securely processed and held in the admin treasury (${adminMomo?.value || 'Official Account'}). Receiver Name: THE UNIVERSITY HUB.`
                          : paymentMode === 'card'
                          ? "Secure card payment powered by PayStack. Receiver Name: THE UNIVERSITY HUB."
                          : paymentMode === 'cod'
                          ? "IMPORTANT: For Cash on Delivery, you can only pay to a Kaydem Logistics account or give cash directly to the assigned Kaydem delivery agent."
                          : "Transfer to our official bank account. Order will be processed after receipt verification."}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handlePayment} 
                      className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg shadow-xl shadow-black/10"
                      disabled={isLoading || paystackInitializeMutation.isPending || paystackChargeMutation.isPending || paystackVerifyMutation.isPending}
                    >
                      {paystackInitializeMutation.isPending || paystackChargeMutation.isPending || paystackVerifyMutation.isPending ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {paystackVerifyMutation.isPending ? "Verifying..." : "Initializing..."}</>
                      ) : (
                        `Pay GH₵${(isBokoo ? grandTotal / 4 : grandTotal).toFixed(2)}`
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
             <Card className="rounded-[2.5rem] p-8 border-none shadow-xl sticky top-24">
                <h3 className="font-black uppercase text-xs tracking-widest text-gray-400 mb-6">Summary.</h3>
                <div className="space-y-4 mb-6 max-h-[300px] overflow-auto">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm"><p className="font-bold line-clamp-1">{item.product.title}</p><p className="font-black ml-4">GH₵{(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p></div>
                  ))}
                </div>
                <Separator className="mb-6" />
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase"><span>Subtotal</span><span>GH₵{cartTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase"><span>Shipping</span><span>{shippingFee === 0 ? 'FREE' : `GH₵${shippingFee.toFixed(2)}`}</span></div>
                  {codFee > 0 && <div className="flex justify-between text-xs font-bold text-gray-400 uppercase"><span>COD Fee (10%)</span><span>GH₵{codFee.toFixed(2)}</span></div>}
                </div>
                <div className="flex justify-between items-center mb-6"><span className="text-lg font-black italic">Total.</span><span className="text-3xl font-black">GH₵{grandTotal.toFixed(2)}</span></div>
                {isBokoo && <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center text-primary font-black italic"><span>Due Today.</span><span>GH₵{(grandTotal/4).toFixed(2)}</span></div>}
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
}