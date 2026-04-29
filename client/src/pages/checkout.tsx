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
  const [shippingMode, setShippingMode] = useState<string>('express_kaydem');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { data: adminMomo } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_momo_number'],
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
          codFee: codFee > 0 ? codFee : undefined,
          shippingMode,
          shippingFee
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: () => {
      toast({ title: "Payment Error", description: "Could not initialize payment. Please try again.", variant: "destructive" });
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
    onError: (error) => {
      console.error("Verification error:", error);
      toast({ title: "Verification Error", description: "Failed to verify payment. If funds were deducted, please contact support." });
    }
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

  const isFreeDeliveryQualified = cartTotal < 100;
  const shippingFee = shippingMode === 'ghana_post_ems' && !isFreeDeliveryQualified ? 70 : 0;
  const codFee = paymentMode === 'cod' ? (cartTotal * 0.10) : 0;
  const grandTotal = cartTotal + shippingFee + codFee;

  useEffect(() => {
    if (cartItems.length === 0 && !new URLSearchParams(window.location.search).get('reference')) {
      setLocation('/gh/browse');
    }
  }, [cartItems.length, setLocation]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!details.firstName || !details.email) return toast({ title: "Missing Info", description: "Please fill in your name and email." });
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      if (!details.address) return toast({ title: "Missing Address", description: "Please provide a delivery address." });
      if (!agreedToTerms) return toast({ title: "Agreement Required", description: "Please agree to our Buyer Protection terms to proceed.", variant: "destructive" });
      isBokoo ? setStep(3) : setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 3) {
      if (!buyerIdFile || !buyerFaceFile) return toast({ title: "Verification Required" });
      handleVerificationAndContinue();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleVerificationAndContinue = async () => {
    if (!buyerIdFile || !buyerFaceFile) return;
    
    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append('buyerId', buyerIdFile);
      formData.append('buyerFace', buyerFaceFile);

      const response = await fetch("/api/buyer-verification", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload verification");

      setStep(4);
      toast({ title: "Verification Uploaded", description: "Your documents have been submitted for review." });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast({ title: "Upload Error", description: "Could not upload verification documents. Please try again.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
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
        codFee: codFee > 0 ? codFee : undefined,
        shippingMode,
        shippingFee
      });
      setLocation('/payment-success');
    } catch (e) {
      toast({ title: "Error creating order" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = () => {
    if (paymentMode === 'momo' || paymentMode === 'card') {
      paystackInitializeMutation.mutate();
    } else {
      handleManualOrder();
    }
  };

  if (paystackVerifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-black mb-4" />
        <h2 className="text-2xl font-black italic">Verifying Payment...</h2>
        <p className="text-gray-400 font-bold mt-2">Please do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
          {[{ n: 1, label: 'Info', icon: User }, { n: 2, label: 'Delivery', icon: MapPin }, { n: 3, label: 'Verify', icon: ShieldCheck, hide: !isBokoo }, { n: 4, label: 'Pay', icon: CreditCard }].filter(s => !s.hide).map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${step >= s.n ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className={`text-[9px] font-black uppercase mt-2 tracking-widest transition-colors ${step >= s.n ? 'text-black' : 'text-gray-300'}`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <div className={`h-0.5 flex-1 mx-2 transition-all duration-700 ${step > s.n ? 'bg-black' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {step === 1 && (
                <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                  <CardHeader className="px-0">
                    <CardTitle className="text-3xl font-black italic">Personal Info.</CardTitle>
                    <CardDescription className="font-bold text-gray-400">Tell us who you are.</CardDescription>
                  </CardHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="First Name" value={details.firstName} onChange={e => setDetails({...details, firstName: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                      <Input placeholder="Last Name" value={details.lastName} onChange={e => setDetails({...details, lastName: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                    </div>
                    <Input placeholder="Email Address" type="email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                    <Input placeholder="Phone Number" value={details.phoneNumber} onChange={e => setDetails({...details, phoneNumber: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                    
                    <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg mt-4 group">
                      Continue to Shipping <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </Card>
              )}

              {step === 2 && (
                <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                  <CardHeader className="px-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="ghost" size="sm" onClick={handlePrevStep} className="p-0 h-auto hover:bg-transparent font-black text-xs uppercase tracking-widest text-gray-400">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                    </div>
                    <CardTitle className="text-3xl font-black italic">Shipping.</CardTitle>
                    <CardDescription className="font-bold text-gray-400">Where should we deliver?</CardDescription>
                  </CardHeader>
                  <div className="space-y-4">
                    <Input placeholder="University / Workplace / Area" value={details.university} onChange={e => setDetails({...details, university: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                    <Input placeholder="Address / Hall / Room / Landmark" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />
                    <Input placeholder="City" value={details.city} onChange={e => setDetails({...details, city: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold" />

                    <RadioGroup value={shippingMode} onValueChange={(v) => setShippingMode(v)} className="space-y-3 mt-6">
                      <h3 className="font-black uppercase text-xs tracking-widest text-gray-400">Delivery Method</h3>
                      <div 
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${shippingMode === 'express_kaydem' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'}`} 
                        onClick={() => setShippingMode('express_kaydem')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Truck className={`h-6 w-6 ${shippingMode === 'express_kaydem' ? 'text-black' : 'text-gray-400'}`} />
                            <div>
                              <h3 className="font-black uppercase text-xs">Express by Kaydem Logistics</h3>
                              <p className="text-[10px] text-gray-500 font-bold">1-5 days • FREE</p>
                            </div>
                          </div>
                          <RadioGroupItem value="express_kaydem" checked={shippingMode === 'express_kaydem'} />
                        </div>
                      </div>

                      <div 
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${shippingMode === 'ghana_post_ems' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'}`} 
                        onClick={() => setShippingMode('ghana_post_ems')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className={`h-6 w-6 ${shippingMode === 'ghana_post_ems' ? 'text-black' : 'text-gray-400'}`} />
                            <div>
                              <h3 className="font-black uppercase text-xs">Ghana Post EMS Delivery</h3>
                              <p className="text-[10px] text-gray-500 font-bold">
                                1-14 days • {isFreeDeliveryQualified ? 'FREE (Under GH₵100)' : 'GH₵70.00'}
                              </p>
                            </div>
                          </div>
                          <RadioGroupItem value="ghana_post_ems" checked={shippingMode === 'ghana_post_ems'} />
                        </div>
                      </div>
                    </RadioGroup>

                    <div 
                      className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${isBokoo ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'} ${cartTotal < 300 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                      onClick={() => {
                        if (cartTotal < 300) {
                          toast({
                            title: "Minimum Order Required",
                            description: "Orders must be GH₵300 or more to qualify for Bɔkɔɔ Pay installments.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setIsBokoo(!isBokoo);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Wallet className={`h-6 w-6 ${isBokoo ? 'text-primary' : ''}`} />
                           <div>
                             <h3 className="font-black uppercase text-xs">Bɔkɔɔ Pay</h3>
                             <p className="text-[10px] text-gray-500 font-bold">
                               {cartTotal < 300 ? "Requires GH₵300+ order" : "4 installments, 0% interest."}
                             </p>
                           </div>
                        </div>
                        <Checkbox 
                          checked={isBokoo} 
                          disabled={cartTotal < 300}
                          onCheckedChange={(v) => {
                            if (cartTotal >= 300) setIsBokoo(v as boolean);
                          }} 
                          className="h-6 w-6" 
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <Checkbox 
                        id="terms" 
                        checked={agreedToTerms} 
                        onCheckedChange={(v) => setAgreedToTerms(v as boolean)} 
                        className="mt-1"
                      />
                      <Label htmlFor="terms" className="text-[11px] leading-tight font-bold cursor-pointer">
                        I agree to the <span className="text-black underline">Buyer Protection terms</span>: Full refund if not delivered on time, 7-day electronics warranty, and money-back guarantee for damaged goods.
                      </Label>
                    </div>

                    <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg group">
                      Review & Pay <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                  <CardHeader className="px-0">
                    <Button variant="ghost" size="sm" onClick={handlePrevStep} className="p-0 h-auto hover:bg-transparent font-black text-xs uppercase tracking-widest text-gray-400 mb-2">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <CardTitle className="text-3xl font-black italic">Verification.</CardTitle>
                    <CardDescription className="font-bold text-gray-400 leading-relaxed">
                      To enable Bɔkɔɔ Pay (Installments), we need to verify your identity. This process is secure and takes less than 2 minutes.
                    </CardDescription>
                  </CardHeader>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-xs">1</div>
                        <h4 className="font-black uppercase text-xs tracking-widest">Identify Yourself</h4>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200">
                         <IdScanCapture onCapture={(file) => setBuyerIdFile(file)} />
                         <div className="mt-4 flex items-start gap-2">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-gray-500 font-bold leading-tight">
                              Upload a clear photo of your Student ID or National ID. Ensure all text is readable and your face is visible.
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-xs">2</div>
                        <h4 className="font-black uppercase text-xs tracking-widest">Live Face Verification</h4>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200">
                         <FacialCapture onCapture={(file) => setBuyerFaceFile(file)} />
                         <div className="mt-4 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-gray-500 font-bold leading-tight">
                              Look directly into the camera in a well-lit area. This helps us ensure it's really you.
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                       <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                       <p className="text-[11px] text-blue-800 font-bold leading-relaxed italic">
                         Your data is encrypted and handled according to Data Protection laws. We only use this for installment approval.
                       </p>
                    </div>

                    <Button onClick={handleNextStep} disabled={isVerifying || !buyerIdFile || !buyerFaceFile} className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg shadow-xl shadow-black/10">
                      {isVerifying ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : "Complete Verification"}
                    </Button>
                  </div>
                </Card>
              )}

              {step === 4 && (
                <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                  <CardHeader className="px-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Button variant="ghost" size="sm" onClick={handlePrevStep} className="p-0 h-auto hover:bg-transparent font-black text-xs uppercase tracking-widest text-gray-400 mb-2">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <CardTitle className="text-3xl font-black italic">Payment.</CardTitle>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                        <Smartphone className="w-3 h-3 mr-1" /> Secure Gateway
                      </Badge>
                    </div>
                  </CardHeader>
                  <div className="space-y-6">
                    {/* Buyer Trust & Terms Notice */}
                    <div className="bg-black text-white p-6 rounded-[2rem] space-y-4 shadow-xl">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                        <h3 className="font-black uppercase text-xs tracking-widest">Buyer Protection.</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                            <p className="text-[10px] font-black uppercase text-gray-400">Refund Guarantee</p>
                          </div>
                          <p className="text-[11px] font-bold italic leading-tight">If your item isn't delivered within the specified dates, you get a 100% full refund immediately.</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Info className="w-3 h-3 text-blue-400" />
                            <p className="text-[10px] font-black uppercase text-gray-400">Electronics & Damage</p>
                          </div>
                          <p className="text-[11px] font-bold italic leading-tight">Electronics carry a 7-day warranty. Arrived damaged? We'll replace or refund you with no stress.</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold border-t border-white/10 pt-3">
                        Shop with 100% confidence. Your money is held in escrow and only released to the seller after you confirm delivery. You are 100% safe from scams.
                      </p>
                    </div>

                    <RadioGroup value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)} className="grid grid-cols-1 gap-4">
                      <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer ${paymentMode === 'momo' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setPaymentMode('momo')}>
                        <div className="flex items-center gap-4">
                          <Smartphone className="h-6 w-6" />
                          <div>
                            <p className="font-black uppercase text-xs">Mobile Money</p>
                            <p className="text-[10px] text-gray-400">MTN, Telecel, AT - Secure Hosted</p>
                          </div>
                        </div>
                        <RadioGroupItem value="momo" id="momo" />
                      </div>

                      <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer ${paymentMode === 'card' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setPaymentMode('card')}>
                        <div className="flex items-center gap-4">
                          <CreditCard className="h-6 w-6" />
                          <div><p className="font-black uppercase text-xs">Credit / Debit Card</p><p className="text-[10px] text-gray-400">Visa, Mastercard - Secure PayStack</p></div>
                        </div>
                        <RadioGroupItem value="card" id="card" />
                      </div>
                      
                      <div className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer ${paymentMode === 'cod' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setPaymentMode('cod')}>
                        <div className="flex items-center gap-4">
                          <Truck className="h-6 w-6" />
                          <div><p className="font-black uppercase text-xs">Cash on Delivery</p><p className="text-[10px] text-gray-400">10% service fee applies</p></div>
                        </div>
                        <RadioGroupItem value="cod" id="cod" />
                      </div>
                    </RadioGroup>

                    <div className="space-y-4">
                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <p className="text-[11px] text-blue-800 leading-relaxed font-bold italic">
                          {paymentMode === 'cod' 
                            ? "IMPORTANT: For Cash on Delivery, you can only pay to a Kaydem Logistics account or give cash directly to the assigned Kaydem delivery agent."
                            : "Your payment is secured and processed by PayStack. You will be redirected to complete the transaction."}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handlePayment} 
                        className="w-full h-16 rounded-2xl bg-black text-white font-black text-lg shadow-xl shadow-black/10"
                        disabled={isLoading || paystackInitializeMutation.isPending || paystackVerifyMutation.isPending}
                      >
                        {paystackInitializeMutation.isPending || paystackVerifyMutation.isPending ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {paystackVerifyMutation.isPending ? "Verifying..." : "Redirecting..."}</>
                        ) : (
                          `Confirm & Pay GH₵${(isBokoo ? grandTotal / 4 : grandTotal).toFixed(2)}`
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
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
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                    <span>Shipping ({shippingMode === 'ghana_post_ems' ? 'EMS' : 'Express'})</span>
                    <span>{shippingFee === 0 ? 'FREE' : `GH₵${shippingFee.toFixed(2)}`}</span>
                  </div>
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
