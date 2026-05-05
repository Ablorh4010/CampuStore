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
  const [verificationType, setVerificationType] = useState<'student' | 'worker'>('student');
  const [applicantOccupation, setApplicantOccupation] = useState('');
  const [applicantSalary, setApplicantSalary] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [guardianSalary, setGuardianSalary] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [buyerIdType, setBuyerIdType] = useState<'national_id' | 'passport'>('national_id');
  const [verificationUrls, setVerificationUrls] = useState<{ 
    idUrl?: string, 
    idBackUrl?: string,
    faceUrl?: string,
    guardianIdUrl?: string,
    guardianFaceWithIdUrl?: string
  } | null>(null);
  const [shippingMode, setShippingMode] = useState<string>('express_kaydem');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { data: adminMomo } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_momo_number'],
  });

  const paystackInitializeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/paystack/initialize", {
        amount: upfrontAmount,
        email: details.email,
        metadata: {
          userId: user?.id,
          cartItems: cartItems.map((item: any) => ({ productId: item.product.id, quantity: item.quantity })),
          isBokoo,
          recurringAmount,
          guestDetails: !user ? details : undefined,
          codFee: codFee > 0 ? codFee : undefined,
          shippingMode,
          shippingFee,
          // Detailed verification for installments
          verificationType,
          verificationOccupation: verificationType === 'worker' ? applicantOccupation : undefined,
          verificationSalary: verificationType === 'worker' ? applicantSalary : undefined,
          verificationIdType: buyerIdType,
          verificationIdFrontUrl: verificationUrls?.idUrl,
          verificationIdBackUrl: verificationUrls?.idBackUrl,
          guardianName: verificationType === 'student' ? guardianName : undefined,
          guardianOccupation: verificationType === 'student' ? guardianOccupation : undefined,
          guardianSalary: verificationType === 'student' ? guardianSalary : undefined,
          guardianPhone: verificationType === 'student' ? guardianPhone : undefined,
          guardianIdUrl: verificationUrls?.guardianIdUrl,
          guardianFaceWithIdUrl: verificationUrls?.guardianFaceWithIdUrl,
          verificationUrls
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
  const [buyerIdFileBack, setBuyerIdFileBack] = useState<File | null>(null);
  const [buyerFaceFile, setBuyerFaceFile] = useState<File | null>(null);
  const [guardianIdFile, setGuardianIdFile] = useState<File | null>(null);
  const [guardianFaceWithIdFile, setGuardianFaceWithIdFile] = useState<File | null>(null);

  const eligibleItems = cartItems.filter((item: any) => item.product.isInstallmentEligible);
  const nonEligibleItems = cartItems.filter((item: any) => !item.product.isInstallmentEligible);
  const digitalItems = cartItems.filter((item: any) => item.product.isDigital);
  const hasDigitalOnly = cartItems.length > 0 && cartItems.every((item: any) => item.product.isDigital);

  const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
  const nonEligibleTotal = nonEligibleItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

  const isFreeDeliveryQualified = cartTotal < 100 || digitalItems.length === cartItems.length;
  const shippingFee = (shippingMode === 'ghana_post_ems' && !isFreeDeliveryQualified && !hasDigitalOnly) ? 70 : 0;
  const codFee = (paymentMode === 'cod' && !hasDigitalOnly) 
    ? (cartTotal > 1000 ? 50 : cartTotal * 0.01) 
    : 0;
  
  const grandTotal = cartTotal + shippingFee + codFee;
  
  const upfrontAmount = isBokoo 
    ? nonEligibleTotal + (eligibleTotal / 4) + shippingFee + codFee
    : grandTotal;
  
  const recurringAmount = isBokoo ? (eligibleTotal * 3 / 4) / 3 : 0;

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
      
      if (isBokoo) {
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
    if (!buyerIdFile) return toast({ title: "Buyer ID Required" });
    if (buyerIdType === 'national_id' && !buyerIdFileBack) return toast({ title: "Back of National ID Required" });
    
    if (verificationType === 'student') {
      if (!guardianName || !guardianPhone) return toast({ title: "Guardian Info Required" });
      if (!guardianIdFile || !guardianFaceWithIdFile) return toast({ title: "Guardian Documents Required" });
    } else {
      if (!applicantOccupation || !applicantSalary) return toast({ title: "Employment Info Required" });
    }
    
    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append('buyerIdScan', buyerIdFile);
      if (buyerIdFileBack) formData.append('buyerIdScanBack', buyerIdFileBack);
      if (buyerFaceFile) formData.append('buyerFaceScan', buyerFaceFile);
      
      if (verificationType === 'student') {
        formData.append('guardianIdScan', guardianIdFile!);
        formData.append('guardianFaceWithId', guardianFaceWithIdFile!);
      }

      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
      }

      const response = await apiRequest("POST", "/api/upload/buyer-verification", formData);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload verification documents");
      }

      const data = await response.json();
      setVerificationUrls({
        idUrl: data.buyerIdScanUrl,
        idBackUrl: data.buyerIdScanBackUrl,
        faceUrl: data.buyerFaceScanUrl,
        guardianIdUrl: data.guardianIdUrl,
        guardianFaceWithIdUrl: data.guardianFaceWithIdUrl
      });

      setStep(4);
      toast({ title: "Verification Uploaded", description: "Your documents have been submitted for review." });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast({ 
        title: "Upload Error", 
        description: e.message || "Could not upload verification documents. Please try again.", 
        variant: "destructive" 
      });
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
        shippingFee,
        // Pass all verification details
        verificationType,
        verificationOccupation: verificationType === 'worker' ? applicantOccupation : undefined,
        verificationSalary: verificationType === 'worker' ? applicantSalary : undefined,
        verificationIdType: buyerIdType,
        verificationIdFrontUrl: verificationUrls?.idUrl,
        verificationIdBackUrl: verificationUrls?.idBackUrl,
        guardianName: verificationType === 'student' ? guardianName : undefined,
        guardianOccupation: verificationType === 'student' ? guardianOccupation : undefined,
        guardianSalary: verificationType === 'student' ? guardianSalary : undefined,
        guardianPhone: verificationType === 'student' ? guardianPhone : undefined,
        guardianIdUrl: verificationUrls?.guardianIdUrl,
        guardianFaceWithIdUrl: verificationUrls?.guardianFaceWithIdUrl,
        verificationUrls // Keeping for backward compatibility if any
      });
      setLocation('/payment-success?mode=cod');
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
        <h2 className="text-2xl font-bold tracking-tight mb-4">Verifying Payment...</h2>
        <p className="text-gray-400 font-medium mt-2">Please do not close this window.</p>
      </div>
    );
  }

  const StepHeader = ({ n, title, summary, onEdit, isActive, isCompleted }: { n: number, title: string, summary?: string, onEdit?: () => void, isActive: boolean, isCompleted: boolean }) => (
    <div className={`py-6 px-8 ${!isActive && isCompleted ? 'cursor-pointer hover:bg-gray-50/50' : ''}`} onClick={!isActive && isCompleted ? onEdit : undefined}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isActive ? 'bg-black text-white ring-4 ring-black/5' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
            {isCompleted && !isActive ? <CheckCircle2 className="h-4 w-4" /> : n}
          </div>
          <div>
            <h3 className={`font-bold uppercase text-[10px] tracking-[0.15em] ${isActive ? 'text-black' : 'text-gray-400'}`}>{title}</h3>
            {!isActive && isCompleted && summary && (
              <p className="text-sm text-gray-600 font-medium mt-0.5 animate-in fade-in slide-in-from-left-2 duration-300">{summary}</p>
            )}
          </div>
        </div>
        {!isActive && isCompleted && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 px-3">
            Change
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="mb-10">
               <h1 className="text-4xl font-bold tracking-tight mb-3 italic">Checkout.</h1>
               <p className="text-gray-400 font-medium">Securely complete your university purchase.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {/* Step 1: Personal Info */}
              <div className="border-b border-gray-50">
                <StepHeader 
                  n={1} 
                  title="Contact Information" 
                  summary={`${details.firstName} ${details.lastName} • ${details.email}`}
                  isActive={step === 1}
                  isCompleted={step > 1}
                  onEdit={() => setStep(1)}
                />
                {step === 1 && (
                  <div className="px-8 pb-10 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Input placeholder="First Name" value={details.firstName} onChange={e => setDetails({...details, firstName: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                      <Input placeholder="Last Name" value={details.lastName} onChange={e => setDetails({...details, lastName: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                    </div>
                    <div className="space-y-4">
                      <Input placeholder="Email Address" type="email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                      <Input placeholder="Phone Number" value={details.phoneNumber} onChange={e => setDetails({...details, phoneNumber: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                      <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-bold text-lg mt-4 group shadow-xl shadow-black/5 hover:bg-black/90 transition-all">
                        Continue to Shipping <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Shipping */}
              <div className="border-b border-gray-50">
                <StepHeader 
                  n={2} 
                  title="Delivery Details" 
                  summary={`${details.address}, ${details.city}`}
                  isActive={step === 2}
                  isCompleted={step > 2}
                  onEdit={() => setStep(2)}
                />
                {step === 2 && (
                  <div className="px-8 pb-10 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="space-y-4">
                      <Input placeholder="University / Workplace / Area" value={details.university} onChange={e => setDetails({...details, university: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                      <Input placeholder="Address / Hall / Room / Landmark" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />
                      <Input placeholder="City" value={details.city} onChange={e => setDetails({...details, city: e.target.value})} className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-semibold placeholder:text-gray-300" />

                      <div className="mt-8">
                        <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400 mb-4">Delivery Method</h3>
                        <RadioGroup value={shippingMode} onValueChange={(v) => setShippingMode(v)} className="grid grid-cols-1 gap-3">
                          <div 
                            className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${shippingMode === 'express_kaydem' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`} 
                            onClick={() => setShippingMode('express_kaydem')}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${shippingMode === 'express_kaydem' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                                  <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm tracking-tight">Express by Kaydem</h3>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">1-5 days • FREE</p>
                                </div>
                              </div>
                              <RadioGroupItem value="express_kaydem" checked={shippingMode === 'express_kaydem'} />
                            </div>
                          </div>

                          <div 
                            className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${shippingMode === 'ghana_post_ems' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`} 
                            onClick={() => setShippingMode('ghana_post_ems')}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${shippingMode === 'ghana_post_ems' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm tracking-tight">Ghana Post EMS</h3>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                    1-14 days • {isFreeDeliveryQualified ? 'FREE' : `GH₵${shippingFee.toFixed(2)}`}
                                  </p>
                                </div>
                              </div>
                              <RadioGroupItem value="ghana_post_ems" checked={shippingMode === 'ghana_post_ems'} />
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      <div 
                        className={`mt-6 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isBokoo ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-gray-200'} ${cartTotal < 300 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                        onClick={() => {
                          if (cartTotal < 300) {
                            toast({
                              title: "Minimum Order GH₵300",
                              description: "Add more items to unlock Bɔkɔɔ Pay installments.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setIsBokoo(!isBokoo);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`p-2 rounded-xl ${isBokoo ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                               <Wallet className="h-5 w-5" />
                             </div>
                             <div>
                               <h3 className="font-bold text-sm tracking-tight">Bɔkɔɔ Pay (Installments)</h3>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                 {cartTotal < 300 ? "Requires GH₵300+ order" : "Pay 25% today • 0% Interest"}
                               </p>
                             </div>
                          </div>
                          <Checkbox 
                            checked={isBokoo} 
                            disabled={cartTotal < 300}
                            onCheckedChange={(v) => {
                              if (cartTotal >= 300) setIsBokoo(v as boolean);
                            }} 
                            className="h-5 w-5 rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 mt-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <Checkbox 
                          id="terms" 
                          checked={agreedToTerms} 
                          onCheckedChange={(v) => setAgreedToTerms(v as boolean)} 
                          className="mt-0.5 border-gray-300"
                        />
                        <Label htmlFor="terms" className="text-[11px] leading-relaxed font-medium cursor-pointer text-gray-400">
                          I agree to <span className="text-black underline font-bold">Buyer Protection</span>: Full refund if not delivered, 7-day electronics warranty, and money-back guarantee.
                        </Label>
                      </div>

                      <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl bg-black text-white font-bold text-lg group shadow-xl shadow-black/5 hover:bg-black/90 transition-all">
                        {isBokoo ? "Continue to Verification" : "Continue to Payment"} <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Verification (Only for Bɔkɔɔ) */}
              {isBokoo && (
                <div className="border-b border-gray-50">
                  <StepHeader 
                    n={3} 
                    title="Identity Verification" 
                    summary="Verification documents submitted"
                    isActive={step === 3}
                    isCompleted={step > 3}
                    onEdit={() => setStep(3)}
                  />
                  {step === 3 && (
                    <div className="px-8 pb-10 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="space-y-8">
                        {/* 1. Applicant Type */}
                        <div>
                          <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400 mb-4">I am a:</h3>
                          <RadioGroup value={verificationType} onValueChange={(v: any) => setVerificationType(v)} className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${verificationType === 'student' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setVerificationType('student')}>
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5" />
                                <span className="font-bold text-sm">Student</span>
                              </div>
                            </div>
                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${verificationType === 'worker' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setVerificationType('worker')}>
                              <div className="flex items-center gap-3">
                                <Truck className="h-5 w-5" />
                                <span className="font-bold text-sm">Worker</span>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* 2. ID Type & Uploads */}
                        <div>
                          <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400 mb-4">Applicant's ID:</h3>
                          <RadioGroup value={buyerIdType} onValueChange={(v: any) => setBuyerIdType(v)} className="grid grid-cols-2 gap-4 mb-6">
                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${buyerIdType === 'national_id' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setBuyerIdType('national_id')}>
                              <span className="font-bold text-sm">National ID</span>
                            </div>
                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${buyerIdType === 'passport' ? 'border-black bg-gray-50' : 'border-gray-100'}`} onClick={() => setBuyerIdType('passport')}>
                              <span className="font-bold text-sm">Passport</span>
                            </div>
                          </RadioGroup>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <p className="text-[10px] font-bold uppercase text-gray-400">{buyerIdType === 'national_id' ? 'Front Side' : 'Data Page'}</p>
                               <IdScanCapture onCapture={(file) => setBuyerIdFile(file)} />
                            </div>
                            {buyerIdType === 'national_id' && (
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold uppercase text-gray-400">Back Side</p>
                                 <IdScanCapture onCapture={(file) => setBuyerIdFileBack(file)} />
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 space-y-2">
                             <p className="text-[10px] font-bold uppercase text-gray-400">Applicant Face Capture</p>
                             <FacialCapture onCapture={(file) => setBuyerFaceFile(file)} />
                          </div>
                        </div>

                        {/* 3. Conditional Details (Guardian vs Work) */}
                        {verificationType === 'student' ? (
                          <div className="space-y-6 pt-6 border-t border-gray-50">
                            <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400">Guardian Verification:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input placeholder="Guardian Full Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                              <Input placeholder="Guardian Phone Number" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                              <Input placeholder="Guardian Occupation" value={guardianOccupation} onChange={e => setGuardianOccupation(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                              <Input placeholder="Guardian Monthly Salary (GH₵)" value={guardianSalary} onChange={e => setGuardianSalary(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold uppercase text-gray-400">Guardian ID</p>
                                 <IdScanCapture onCapture={(file) => setGuardianIdFile(file)} />
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold uppercase text-gray-400">Guardian Holding ID (at cheek)</p>
                                 <FacialCapture onCapture={(file) => setGuardianFaceWithIdFile(file)} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6 pt-6 border-t border-gray-50">
                            <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400">Employment Details:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input placeholder="Your Occupation" value={applicantOccupation} onChange={e => setApplicantOccupation(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                              <Input placeholder="Monthly Salary (GH₵)" value={applicantSalary} onChange={e => setApplicantSalary(e.target.value)} className="h-14 rounded-2xl bg-gray-50 border-none font-semibold" />
                            </div>
                          </div>
                        )}

                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                           <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                           <p className="text-[11px] text-blue-700 font-semibold italic leading-relaxed">
                             Your data is encrypted. We only use this for installment approval. Verification is sent to admin for manual review.
                           </p>
                        </div>

                        <Button onClick={handleNextStep} disabled={isVerifying} className="w-full h-16 rounded-2xl bg-black text-white font-bold text-lg shadow-xl shadow-black/5 hover:bg-black/90 transition-all">
                          {isVerifying ? <><Loader2 className="animate-spin mr-2" /> Securely Processing...</> : "Submit for Approval"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Payment */}
              <div>
                <StepHeader 
                  n={isBokoo ? 4 : 3} 
                  title="Final Payment" 
                  isActive={step === 4}
                  isCompleted={step > 4}
                />
                {step === 4 && (
                  <div className="px-8 pb-10 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="space-y-8">
                      <RadioGroup value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)} className="grid grid-cols-1 gap-3">
                        <div 
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${paymentMode === 'momo' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`} 
                          onClick={() => setPaymentMode('momo')}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${paymentMode === 'momo' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                              <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">Mobile Money</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">MTN, Telecel, AT • Secure</p>
                            </div>
                          </div>
                          <RadioGroupItem value="momo" id="momo" />
                        </div>

                        <div 
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${paymentMode === 'card' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`} 
                          onClick={() => setPaymentMode('card')}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${paymentMode === 'card' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">Credit / Debit Card</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Visa, Mastercard • Secure</p>
                            </div>
                          </div>
                          <RadioGroupItem value="card" id="card" />
                        </div>
                        
                        {!isBokoo && (
                          <div 
                            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${paymentMode === 'cod' ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`} 
                            onClick={() => setPaymentMode('cod')}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-xl ${paymentMode === 'cod' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Truck className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm tracking-tight">Cash on Delivery</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">10% service fee applies</p>
                              </div>
                            </div>
                            <RadioGroupItem value="cod" id="cod" />
                          </div>
                        )}
                      </RadioGroup>

                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-[11px] text-gray-400 leading-relaxed font-semibold italic text-center">
                          {paymentMode === 'cod' 
                            ? "For COD, payment should ONLY be made to Kaydem Logistics accounts or assigned agents."
                            : "Payments are secured and processed by PayStack. You'll be redirected shortly."}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handlePayment} 
                        className="w-full h-16 rounded-2xl bg-black text-white font-bold text-lg shadow-xl shadow-black/5 hover:bg-black/90 transition-all"
                        disabled={isLoading || paystackInitializeMutation.isPending || paystackVerifyMutation.isPending}
                      >
                        {paystackInitializeMutation.isPending || paystackVerifyMutation.isPending ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Securing Transaction...</>
                        ) : (
                          <div className="flex items-center gap-3 justify-center">
                            <span>Confirm & Pay</span>
                            <div className="h-4 w-px bg-white/20" />
                            <div className="flex items-center tracking-tight">
                              <span className="text-xs opacity-50 mr-1 italic">GH₵</span>
                              <span>{upfrontAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Trust & Terms Notice */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm mt-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                 <ShieldCheck className="w-32 h-32 text-black" />
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-green-50 p-3 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                   <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-black">Buyer Protection</h3>
                   <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">100% Safe & Secure</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-50 flex items-center justify-center">
                       <Sparkles className="w-3 h-3 text-yellow-600" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Refund Guarantee</p>
                  </div>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed italic pr-4">If your item isn't delivered within the specified dates, you get a 100% full refund immediately.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                       <Info className="w-3 h-3 text-blue-600" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Quality Assurance</p>
                  </div>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed italic pr-4">Electronics carry a 7-day warranty. Arrived damaged? We'll replace or refund you with no stress.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
             <div className="sticky top-24">
               <Card className="rounded-[2.5rem] p-10 border-none shadow-2xl bg-white overflow-hidden">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-400">Order Summary</h3>
                    <Badge variant="outline" className="text-[8px] font-bold uppercase text-gray-300 border-gray-100 rounded-full px-3">{cartItems.length} Items</Badge>
                  </div>
                  
                  <div className="space-y-8 mb-10 max-h-[400px] overflow-auto pr-4 scrollbar-hide">
                    {cartItems.map((item: any) => (
                      <div key={item.id} className="flex gap-5 items-center group">
                        <div className="w-20 h-20 rounded-3xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-50 group-hover:shadow-lg transition-all duration-500">
                          <img src={item.product.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm tracking-tight truncate mb-1">{item.product.title}</p>
                          <div className="flex items-center gap-3">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Qty: {item.quantity}</p>
                             {item.product.isInstallmentEligible && (
                               <Badge variant="secondary" className="text-[7px] font-bold uppercase bg-primary/5 text-primary border-none h-4 px-1.5 rounded-full">Bɔkɔɔ</Badge>
                             )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tracking-tight">
                            <span className="text-[10px] text-gray-300 mr-1 italic font-medium">GH₵</span>
                            {(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      <span>Subtotal</span>
                      <span className="text-gray-900 tracking-tight">GH₵ {cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      <span>Shipping ({shippingMode === 'ghana_post_ems' ? 'EMS' : 'Express'})</span>
                      <span className={shippingFee === 0 ? 'text-green-600 font-bold tracking-tight' : 'text-gray-900 tracking-tight'}>
                        {shippingFee === 0 ? 'FREE' : `GH₵ ${shippingFee.toFixed(2)}`}
                      </span>
                    </div>
                    {codFee > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] animate-in fade-in slide-in-from-right-2 duration-300">
                        <span>COD Service (10%)</span>
                        <span className="text-gray-900 tracking-tight">GH₵ {codFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-10 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50">
                    <span className="text-sm font-bold tracking-[0.2em] uppercase text-gray-400 italic">Total.</span>
                    <div className="text-right">
                      <p className="text-3xl font-bold tracking-tight text-black">
                        <span className="text-xs text-gray-300 mr-1.5 italic font-medium">GH₵</span>
                        {grandTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {isBokoo && (
                     <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="p-6 bg-primary/[0.03] rounded-[2.5rem] border-2 border-primary/10 relative overflow-hidden group hover:border-primary/20 transition-all">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                              <Wallet className="w-12 h-12 text-primary" />
                           </div>
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold uppercase text-primary tracking-[0.15em]">Initial Deposit</span>
                              <p className="text-2xl font-bold tracking-tight text-primary">
                                <span className="text-xs mr-1.5 italic font-medium">GH₵</span>
                                {upfrontAmount.toFixed(2)}
                              </p>
                           </div>
                           <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wider leading-tight">Secures order today.</p>
                        </div>
                        <div className="p-6 bg-gray-50/30 rounded-[2.5rem] border-2 border-gray-100 hover:border-gray-200 transition-all">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-[0.15em]">Monthly Split</span>
                              <p className="text-2xl font-bold tracking-tight text-gray-700">
                                <span className="text-xs text-gray-300 mr-1.5 italic font-medium">GH₵</span>
                                {recurringAmount.toFixed(2)}
                              </p>
                           </div>
                           <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">3x Installments</p>
                        </div>
                     </div>
                  )}
               </Card>
               
               <p className="text-center text-[10px] font-bold text-gray-200 uppercase tracking-[0.3em] mt-10 flex items-center justify-center gap-3">
                 <div className="h-px w-8 bg-gray-100" />
                 <Lock className="w-3 h-3" /> Encrypted
                 <div className="h-px w-8 bg-gray-100" />
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
