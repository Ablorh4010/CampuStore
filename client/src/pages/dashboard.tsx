import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Package, ShoppingCart, TrendingUp, Settings, 
  Trash2, Eye, ExternalLink, MessageCircle, MapPin, 
  Clock, CheckCircle2, AlertCircle, Loader2, RefreshCcw,
  Sparkles, Wallet, Smartphone, ChevronRight, Info, Download,
  Store as StoreIcon, Star, CreditCard, User as UserIcon, Building2, Upload, ShieldCheck, XCircle, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ProductForm from '@/components/modals/product-form';
import AIProductListerModal from '@/components/modals/ai-product-lister';
import InboxComponent from '@/components/chat/InboxComponent';
import ProductCard from '@/components/product/product-card';
import { IdScanCapture, FacialCapture } from '@/components/verification';
import type { ProductWithStore, Store, OrderWithDetails, User as UserType } from '@shared/schema';

export default function Dashboard() {
  const { user, countryCode, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const isMerchantUser = user?.isAdmin || user?.userType === 'seller' || user?.isMerchant;
  const isVerified = user?.verificationStatus === 'verified' || user?.isAdmin;
  const isPending = user?.verificationStatus === 'pending';
  const needsCorrection = user?.verificationStatus === 'needs_correction';
  const isRejected = user?.verificationStatus === 'rejected';

  const [viewingTracking, setViewingTracking] = useState<OrderWithDetails | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAIProductListerOpen, setIsAIProductListerOpen] = useState(false);
  const [initialAIUrl, setInitialAIUrl] = useState('');
  const [reviewOrder, setReviewOrder] = useState<OrderWithDetails | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  const [rejectingOrder, setRejectingOrder] = useState<OrderWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [payingInstallmentOrder, setPayingInstallmentOrder] = useState<OrderWithDetails | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);

  // ... (rest of useEffects)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/seller-auth');
    }
  }, [user, authLoading, setLocation]);

  // Checklist / Limited Access states
  const [idFileFront, setIdFileFront] = useState<File | null>(null);
  const [idFileBack, setIdFileBack] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccountNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  // Handle ai_url query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aiUrl = params.get('ai_url');
    if (aiUrl) {
      setInitialAIUrl(aiUrl);
      setIsAIProductListerOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAiInsight = async (orderId: number) => {
    setIsGeneratingInsight(true);
    try {
      const response = await apiRequest('POST', `/api/ai/generate-tracking-insights/${orderId}`, {});
      const data = await response.json();
      setAiInsight(data.summary);
    } catch (error) {
      setAiInsight("Unable to load tracking insights.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const { data: userStores = [], isLoading: storesLoading, refetch: refetchStores, isFetching: storesFetching } = useQuery<Store[]>({
    queryKey: ['/api/stores/user', user?.id],
    enabled: !!user,
    staleTime: 0, // Ensure we always get fresh data
  });

  const primaryStore = userStores[0];

  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [initializationProgress, setInitializationProgress] = useState(0);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const creationAttempted = useRef(false);

  // Auto-create store for admins and sellers if missing
  useEffect(() => {
    let mounted = true;
    
    // If stores are found, ensure we are not in auto-creating state
    if (userStores.length > 0 && isAutoCreating) {
      setIsAutoCreating(false);
      setInitializationProgress(100);
      return;
    }

    if (!authLoading && user && !storesLoading && !storesFetching && userStores.length === 0 && isMerchantUser && !isAutoCreating && !creationAttempted.current) {
      creationAttempted.current = true;
      setIsAutoCreating(true);
      setInitializationProgress(10);
      setInitializationError(null);
      
      const simulateProgress = setInterval(() => {
        if (mounted) {
          setInitializationProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.floor(Math.random() * 10);
          });
        }
      }, 1000);

      apiRequest('POST', '/api/stores', {
        userId: user.id,
        name: user.isAdmin ? "University Hub Official" : `${user.firstName}'s Store`,
        description: user.isAdmin ? "Official store for The University Hub" : `Official store for ${user.firstName} ${user.lastName}`,
        city: user.city || "Accra", 
        university: user.university || "All Universities", 
        address: user.sellerAddress || "HQ"
      }).then(async (res) => {
        const newStore = await res.json();
        
        if (mounted) {
           setInitializationProgress(100);
           clearInterval(simulateProgress);
           toast({ title: "Store Initialized", description: "Your merchant dashboard is ready." });
           queryClient.setQueryData(['/api/stores/user', user.id], [newStore]);
           await queryClient.invalidateQueries({ queryKey: ['/api/stores/user', user.id] });
           await refetchStores();
        }
      }).catch(err => {
        console.error("Failed to auto-create store:", err);
        if (mounted) {
          clearInterval(simulateProgress);
          setInitializationProgress(0);
          setInitializationError(err instanceof Error ? err.message : String(err));
          // On error, reset after a delay to allow retry if needed, but don't loop infinitely
          setTimeout(() => { if (mounted) creationAttempted.current = false; }, 15000);
        }
      }).finally(() => {
        if (mounted) {
          setTimeout(() => {
            if (mounted) setIsAutoCreating(false);
          }, 1000);
        }
      });
      
      return () => { 
        mounted = false; 
        clearInterval(simulateProgress);
      };
    }
    return () => { mounted = false; };
  }, [userStores.length, storesLoading, storesFetching, user, refetchStores, isAutoCreating, isMerchantUser, authLoading]);

  const { data: storeProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products/store', primaryStore?.id],
    enabled: !!primaryStore,
  });

  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/seller', user?.id],
    enabled: !!user,
  });

  const { data: purchases = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/buyer', user?.id],
    enabled: !!user,
  });

  // Handle reviewOrderId if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reviewOrderId = params.get('reviewOrderId');
    if (reviewOrderId && purchases.length > 0) {
      const order = purchases.find(p => p.id === parseInt(reviewOrderId));
      if (order) setReviewOrder(order);
    }
  }, [purchases]);

  const payInstallmentMutation = useMutation({
    mutationFn: async ({ orderId, installments }: { orderId: number, installments: number }) => {
      const response = await apiRequest("POST", "/api/paystack/initialize-installment", {
        orderId,
        installments,
        email: user?.email
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

  const handleChecklistSubmit = async () => {
    if (!idFileFront || !faceFile || !bankName || !accNumber || !momoNumber || !logoFile) {
      return toast({ title: "Checklist Incomplete", description: "Please complete all verification steps.", variant: "destructive" });
    }

    setIsSubmittingChecklist(true);
    try {
      // 1. Update Profile Info
      await apiRequest('PATCH', `/api/users/${user?.id}/profile`, {
        bankName, bankAccountNumber: accNumber, mobileMoneyPhone: momoNumber
      });

      // 2. Upload Verification & Logo
      const formData = new FormData();
      formData.append('idScan', idFileFront);
      if (idFileBack) formData.append('idScanBack', idFileBack);
      formData.append('faceScan', faceFile);
      formData.append('logo', logoFile);
      formData.append('sellerVerificationType', user?.sellerVerificationType || 'student');
      
      await fetch('/api/upload/verification', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      toast({ title: "Success!", description: "Your store verification has been submitted for admin approval." });
      window.location.reload();
    } catch (err) {
      toast({ title: "Submission Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingChecklist(false);
    }
  };

  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: number, data: any }) => {
      return apiRequest('PUT', `/api/products/${productId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      toast({ title: "Updated", description: "Listing changes saved." });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('DELETE', `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      toast({ title: "Removed", description: "Listing has been deleted." });
    },
  });

  const updateOrderApprovalMutation = useMutation({
    mutationFn: async ({ orderId, approval, rejectionReason }: { orderId: number, approval: string, rejectionReason?: string }) => {
      return apiRequest('PUT', `/api/orders/${orderId}/seller-approval`, { approval, rejectionReason });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/seller'] });
      toast({ 
        title: variables.approval === 'approved' ? "Order Confirmed" : "Order Declined", 
        description: variables.approval === 'approved' ? "Order sent for admin review." : "Buyer has been notified of the cancellation." 
      });
      setRejectingOrder(null);
      setRejectionReason('');
    },
  });

  // If a store is expected but missing, or loading is in progress
  const isInitializing = authLoading || storesLoading || isAutoCreating || (user && userStores.length === 0 && isMerchantUser && (storesFetching || !creationAttempted.current));
  const showSyncError = !isAutoCreating && !storesLoading && !storesFetching && creationAttempted.current && userStores.length === 0 && isMerchantUser;

  // Safety Timeout: Don't stay on the loading screen for more than 15 seconds
  const [stuckTimeout, setStuckTimeout] = useState(false);
  useEffect(() => {
    if (isInitializing && !stuckTimeout) {
      const timer = setTimeout(() => {
        if (isInitializing) {
          setStuckTimeout(true);
        }
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, stuckTimeout]);

  if (authLoading || (isInitializing && !showSyncError && !stuckTimeout)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-slate-50">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-slate-200 border-t-black animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <StoreIcon className="w-8 h-8 text-black" />
          </div>
        </div>
        
        <div className="text-center space-y-4 max-w-xs w-full">
          <h2 className="text-xl font-black uppercase tracking-tighter">Setting Up Your Hub.</h2>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-black h-full transition-all duration-500 ease-out" 
              style={{ width: `${authLoading ? 30 : Math.max(initializationProgress, 40)}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {authLoading ? 'Verifying Account' : isAutoCreating ? 'Syncing Profile' : 'Finalizing Portal'}
            </p>
            <p className="text-[10px] font-black text-black">{authLoading ? 30 : Math.max(initializationProgress, 40)}%</p>
          </div>
        </div>
      </div>
    );
  }

  // If no store and NOT a merchant/admin, show "Start Selling"
  if (!primaryStore && !isMerchantUser) {
    return (
      <div className="min-h-screen bg-white py-24 flex items-center justify-center">
         <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl p-12 text-center">
            <StoreIcon className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Start Selling.</h2>
            <p className="text-gray-500 mb-8 font-medium">Click below to set up your merchant profile.</p>
            <Link href="/seller-auth"><Button className="w-full h-14 rounded-2xl bg-black font-black uppercase">Begin Setup</Button></Link>
         </Card>
      </div>
    );
  }

  // If a merchant user still has no store, we show the portal with empty state/retry
  if (!primaryStore && isMerchantUser) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
           <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
           </div>
           <h1 className="text-3xl font-black uppercase tracking-tighter">Portal Sync Issue</h1>
           <p className="text-gray-500 font-medium">We couldn't load your store details. This usually happens if initialization is still in progress or failed.</p>
           
           {initializationError && (
             <Alert variant="destructive" className="text-left rounded-2xl">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle className="text-xs font-black uppercase">Initialization Error</AlertTitle>
               <AlertDescription className="text-xs">{initializationError}</AlertDescription>
             </Alert>
           )}

           <div className="p-4 bg-slate-100 rounded-2xl text-[10px] text-left font-mono space-y-1">
             <p>USER_ID: {user?.id}</p>
             <p>USER_TYPE: {user?.userType}</p>
             <p>IS_MERCHANT: {String(user?.isMerchant)}</p>
             <p>STORES_COUNT: {userStores.length}</p>
             <p>IS_FETCHING: {String(storesFetching)}</p>
           </div>

           <div className="flex flex-col gap-3">
              <Button onClick={() => window.location.reload()} className="h-14 rounded-2xl bg-black font-black uppercase">Refresh Portal</Button>
              <Button variant="ghost" onClick={() => { 
                creationAttempted.current = false; 
                setIsAutoCreating(false); 
                setInitializationProgress(0); 
                setStuckTimeout(false);
                setInitializationError(null);
                queryClient.invalidateQueries({ queryKey: ['/api/stores/user', user?.id] });
              }} className="text-xs font-bold text-gray-400">Retry Store Creation</Button>
           </div>
        </div>
      </div>
    );
  }

  // LIMITED ACCESS DASHBOARD (Checklist)
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
           <div className="text-center">
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Merchant Hub.</h1>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Complete the checklist to unlock full abilities</p>
           </div>

           {needsCorrection && (
             <Alert className="rounded-3xl border-amber-200 bg-amber-50 py-6 mb-8">
               <AlertCircle className="h-5 w-5 text-amber-600" />
               <AlertTitle className="font-black uppercase text-[10px] text-amber-600">Admin Feedback</AlertTitle>
               <AlertDescription className="font-bold text-amber-800">{user?.verificationNotes}</AlertDescription>
             </Alert>
           )}

           {isRejected && (
             <Alert variant="destructive" className="rounded-3xl py-6 mb-8">
               <XCircle className="h-5 w-5" />
               <AlertTitle className="font-black uppercase text-[10px]">Application Rejected</AlertTitle>
               <AlertDescription className="font-bold">{user?.verificationNotes || "Your seller application has been rejected by the administrator."}</AlertDescription>
             </Alert>
           )}

           <div className="grid gap-6">
              {/* Step 1: ID Verification */}
              <Card className="rounded-[2.5rem] border-none shadow-sm p-8">
                 <div className="flex items-center gap-4 mb-8">
                    <div className={`p-3 rounded-2xl ${idFileFront ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                       {idFileFront ? <CheckCircle2 /> : <ShieldCheck />}
                    </div>
                    <div><h3 className="font-black uppercase text-sm">01. ID Verification</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Front & Back Ghana Card</p></div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <IdScanCapture side="front" onCapture={setIdFileFront} title="ID Front" />
                    <IdScanCapture side="back" onCapture={setIdFileBack} title="ID Back" />
                 </div>
                 <div className="mt-4"><FacialCapture onCapture={setFaceFile} /></div>
              </Card>

              {/* Step 2: Banking Details */}
              <Card className="rounded-[2.5rem] border-none shadow-sm p-8">
                 <div className="flex items-center gap-4 mb-8">
                    <div className={`p-3 rounded-2xl ${bankName && accNumber ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                       <Wallet />
                    </div>
                    <div><h3 className="font-black uppercase text-sm">02. Payout Details</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Where you receive your money</p></div>
                 </div>
                 <div className="space-y-4">
                    <Input placeholder="Bank Name (e.g. GCB, Ecobank)" value={bankName} onChange={e => setBankName(e.target.value)} className="h-12 rounded-xl border-2" />
                    <div className="grid grid-cols-2 gap-4">
                       <Input placeholder="Account Number" value={accNumber} onChange={e => setAccountNumber(e.target.value)} className="h-12 rounded-xl border-2" />
                       <Input placeholder="Momo Number" value={momoNumber} onChange={e => setMomoNumber(e.target.value)} className="h-12 rounded-xl border-2" />
                    </div>
                 </div>
              </Card>

              {/* Step 3: Store Branding */}
              <Card className="rounded-[2.5rem] border-none shadow-sm p-8">
                 <div className="flex items-center gap-4 mb-8">
                    <div className={`p-3 rounded-2xl ${logoFile ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                       <StoreIcon />
                    </div>
                    <div><h3 className="font-black uppercase text-sm">03. Store Identity</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Upload your brand logo</p></div>
                 </div>
                 <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl bg-gray-50 group cursor-pointer hover:bg-white transition-all relative overflow-hidden">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} className="w-24 h-24 rounded-full object-cover shadow-xl" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-300 mb-2 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Logo File</span>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setLogoFile(e.target.files?.[0] || null)} accept="image/*" />
                 </div>
              </Card>

              <Button 
                className="w-full h-20 rounded-[2rem] bg-black text-white font-black uppercase tracking-widest text-lg shadow-2xl shadow-black/20"
                onClick={handleChecklistSubmit}
                disabled={isSubmittingChecklist || isPending}
              >
                {isSubmittingChecklist ? <Loader2 className="animate-spin" /> : isPending ? "Wait for Admin Approval" : "Submit Everything for Approval"}
              </Button>
           </div>
        </div>
      </div>
    );
  }

  // FULL DASHBOARD FOR VERIFIED MERCHANTS
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-xl"><img src={primaryStore.logoUrl || '/placeholder-logo.png'} className="w-full h-full object-cover" /></div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">Merchant HUB</Badge><Badge className="bg-green-100 text-green-700 border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">Verified</Badge></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">{primaryStore.name}</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">Status: Active</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsAIProductListerOpen(true)} className="rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] h-12 px-6"><Brain className="w-4 h-4 mr-2" /> AI Product Lister</Button>
            <Button onClick={() => setIsProductFormOpen(true)} className="rounded-xl bg-black text-white font-black uppercase tracking-widest text-[10px] h-12 px-6"><Plus className="w-4 h-4 mr-2" /> New Listing</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="w-full overflow-x-auto pb-2 tabs-scroll">
            <TabsList className="inline-flex h-14 bg-gray-50 p-1 border rounded-2xl min-w-max">
              <TabsTrigger value="overview" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Overview</TabsTrigger>
              <TabsTrigger value="listings" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Inventory</TabsTrigger>
              <TabsTrigger value="sales" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Orders</TabsTrigger>
              <TabsTrigger value="purchases" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Purchases</TabsTrigger>
              <TabsTrigger value="inbox" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Inbox</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl px-6 md:px-8 font-black uppercase tracking-widest text-[10px]">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Sales', val: orders.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Products', val: storeProducts.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Views', val: storeProducts.reduce((s, p) => s + (p.viewCount || 0), 0), icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Rating', val: `${parseFloat(primaryStore.rating).toFixed(1)}/5`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
              ].map((stat, i) => (
                <Card key={i} className="rounded-2xl md:rounded-3xl border-none shadow-sm">
                  <CardContent className="p-4 md:p-8">
                    <div className={`${stat.bg} w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-4`}><stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} /></div>
                    <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-xl md:text-3xl font-black text-gray-900 mt-1">{stat.val}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Recent Orders List */}
            <div className="space-y-4">
               {orders.slice(0, 5).map(o => (
                  <Card key={o.id} className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-none shadow-sm bg-gray-50/50">
                     <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-4 items-center min-w-0">
                           <img src={o.product.images?.[0]} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shrink-0" />
                           <div className="min-w-0"><p className="font-black text-xs md:text-sm uppercase truncate">{o.product.title}</p><p className="text-[10px] font-bold text-gray-400 truncate">{o.orderNumber || `#${o.id}`} • {new Date(o.createdAt!).toLocaleDateString()}</p></div>
                        </div>
                        <p className="font-black text-sm md:text-lg text-primary shrink-0">GH₵{parseFloat(o.totalAmount).toFixed(2)}</p>
                     </div>
                  </Card>
               ))}
            </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {storeProducts.map(p => (
                  <div key={p.id} className="group relative flex flex-col bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-gray-100 overflow-hidden">
                    <div className="aspect-[4/3] relative">
                      <img src={p.images?.[0] || '/placeholder.png'} className="w-full h-full object-cover" />
                      {!p.isAvailable && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black text-white uppercase tracking-widest">Sleeping</div>}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                         <Badge className={`${p.approvalStatus === 'approved' ? 'bg-green-500' : 'bg-amber-500'} text-white border-none font-black text-[9px] uppercase`}>
                           {p.approvalStatus === 'approved' ? 'Approved' : 'Pending'}
                         </Badge>
                         <Badge className={`${p.isInstallmentEligible ? 'bg-green-500' : 'bg-gray-400'} text-white border-none font-black text-[9px] uppercase`}>
                           {p.isInstallmentEligible ? 'Eligible' : 'Standard'}
                         </Badge>
                      </div>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                       <div>
                         <h4 className="font-black text-sm uppercase truncate">{p.title}</h4>
                         <p className="font-black text-primary">GH₵{parseFloat(p.price).toFixed(2)}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            className="rounded-xl h-10 font-black text-[9px] uppercase border-2"
                            onClick={() => updateProductMutation.mutate({ productId: p.id, data: { isAvailable: !p.isAvailable } })}
                          >
                            {p.isAvailable ? <Clock className="w-3 h-3 mr-2 text-amber-500" /> : <Eye className="w-3 h-3 mr-2 text-green-500" />}
                            {p.isAvailable ? 'Sleep' : 'Wake'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="rounded-xl h-10 font-black text-[9px] uppercase border-2"
                            onClick={() => updateProductMutation.mutate({ productId: p.id, data: { isInstallmentEligible: !p.isInstallmentEligible } })}
                          >
                            <CreditCard className={`w-3 h-3 mr-2 ${p.isInstallmentEligible ? 'text-green-500' : 'text-gray-400'}`} />
                            Plan
                          </Button>
                          <Button 
                            variant="outline" 
                            className="rounded-xl h-10 font-black text-[9px] uppercase border-2"
                            onClick={() => { setEditingProduct(p); setIsProductFormOpen(true); }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="rounded-xl h-10 font-black text-[9px] uppercase"
                            onClick={() => { if(confirm('Delete this listing?')) deleteProductMutation.mutate(p.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                       </div>
                    </div>
                  </div>
                ))}
                {storeProducts.length === 0 && <p className="col-span-full py-20 text-center text-gray-400 font-bold uppercase text-xs">No listings yet.</p>}
             </div>
          </TabsContent>

          <TabsContent value="sales" className="mt-0 space-y-4">
             {orders.map(o => (
               <div key={o.id} className="p-4 md:p-8 bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center transition-all hover:shadow-xl gap-4">
                  <div className="flex items-center gap-4 md:gap-6">
                     <img src={o.product.images?.[0]} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover shrink-0" />
                     <div className="min-w-0">
                       <h4 className="font-black text-sm md:text-lg uppercase truncate">{o.product.title}</h4>
                       <p className="text-[10px] md:text-sm font-bold text-gray-500 truncate">
                         Order: {o.orderNumber || `#${o.id}`} • Buyer: {o.buyer.firstName} {o.buyer.lastName} • {o.deliveryStatus?.toUpperCase()}
                       </p>
                     </div>
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto gap-4">
                     <p className="font-black text-lg md:text-2xl">GH₵{parseFloat(o.totalAmount).toFixed(2)}</p>
                     <div className="flex gap-2">
                        {o.sellerApproval === 'pending' && (
                          <>
                            <Button className="rounded-xl bg-green-500 font-black text-[10px] h-10 px-6 uppercase" onClick={() => updateOrderApprovalMutation.mutate({ orderId: o.id, approval: 'approved' })}>Confirm</Button>
                            <Button variant="destructive" className="rounded-xl font-black text-[10px] h-10 px-6 uppercase" onClick={() => setRejectingOrder(o)}>Decline</Button>
                          </>
                        )}
                        {o.status === 'rejected' && <Badge variant="destructive" className="uppercase font-black text-[10px]">Declined</Badge>}
                     </div>
                  </div>
               </div>
             ))}
          </TabsContent>

          <TabsContent value="purchases" className="mt-0 space-y-4">
             {purchases.map(p => (
               <div key={p.id} className="p-4 md:p-8 bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center transition-all hover:shadow-xl gap-4">
                  <div className="flex items-center gap-4 md:gap-6">
                     <img src={p.product.images?.[0]} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover shrink-0" />
                     <div className="min-w-0">
                       <h4 className="font-black text-sm md:text-lg uppercase truncate">{p.product.title}</h4>
                       <p className="text-[10px] md:text-sm font-bold text-gray-500 truncate">
                         Order: {p.orderNumber || `#${p.id}`} • {p.deliveryStatus?.toUpperCase()} • {new Date(p.createdAt!).toLocaleDateString()}
                       </p>
                     </div>
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto gap-4">
                     <div className="text-right">
                        <p className="font-black text-lg md:text-2xl">GH₵{parseFloat(p.totalAmount).toFixed(2)}</p>
                        {p.isInstallment && (
                          <p className="text-[8px] font-black uppercase text-primary tracking-widest mt-1">BƆKƆƆ Pay™ • {p.installmentsPaid}/4 Parts Paid</p>
                        )}
                     </div>
                     <div className="flex gap-2">
                        {p.isInstallment && p.installmentsPaid < 4 && (
                          <Button 
                            className="rounded-xl bg-primary text-black font-black text-[10px] h-10 px-6 uppercase"
                            onClick={() => {
                               setPayingInstallmentOrder(p);
                               setSelectedInstallments([p.installmentsPaid + 1]);
                            }}
                          >
                            Pay Installments
                          </Button>
                        )}
                        <Button variant="outline" className="rounded-xl font-black text-[10px] h-10 px-6 uppercase border-2" onClick={() => setViewingTracking(p)}>Track</Button>
                        {p.deliveryStatus === 'delivered' && !p.buyerConfirmation && (
                          <Button className="rounded-xl bg-green-500 font-black text-[10px] h-10 px-6 uppercase">Confirm Receipt</Button>
                        )}
                     </div>
                  </div>
               </div>
             ))}
             {purchases.length === 0 && <p className="py-20 text-center text-gray-400 font-bold uppercase text-xs">No purchases yet.</p>}
          </TabsContent>
          <TabsContent value="inbox" className="mt-0"><InboxComponent /></TabsContent>
          <TabsContent value="settings" className="mt-0">
             <StoreSettingsForm store={primaryStore} user={user} />
          </TabsContent>
        </Tabs>

        <ProductForm isOpen={isProductFormOpen} onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} userStores={userStores} initialData={editingProduct} />
        <AIProductListerModal isOpen={isAIProductListerOpen} onClose={() => {setIsAIProductListerOpen(false); setInitialAIUrl('');}} userStores={userStores} initialUrl={initialAIUrl} />
        
        {/* Installment Payment Dialog */}
        <Dialog open={!!payingInstallmentOrder} onOpenChange={(open) => !open && setPayingInstallmentOrder(null)}>
           <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
              <DialogHeader className="bg-primary text-black p-8">
                 <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className="border-black text-black font-black uppercase text-[8px]">BƆKƆƆ Pay™</Badge></div>
                 <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Pay Installments</DialogTitle>
                 <DialogDescription className="text-black/60 font-bold uppercase text-[9px] tracking-widest">Select parts to pay for Order {payingInstallmentOrder?.orderNumber}</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Choose parts to pay now:</p>
                    <div className="grid gap-3">
                       {[1, 2, 3, 4].map((i) => {
                          const isPaid = i <= (payingInstallmentOrder?.installmentsPaid || 0);
                          const isNext = i === (payingInstallmentOrder?.installmentsPaid || 0) + 1;
                          
                          return (
                             <div 
                               key={i} 
                               className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isPaid ? 'bg-gray-50 border-gray-100 opacity-50' : selectedInstallments.includes(i) ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                               onClick={() => {
                                  if (isPaid) return;
                                  if (selectedInstallments.includes(i)) {
                                     setSelectedInstallments(selectedInstallments.filter(id => id !== i));
                                  } else {
                                     // Ensure they pay in order
                                     const missingPrev = [1,2,3,4].filter(id => id < i && !selectedInstallments.includes(id) && id > (payingInstallmentOrder?.installmentsPaid || 0));
                                     setSelectedInstallments([...new Set([...selectedInstallments, ...missingPrev, i])]);
                                  }
                               }}
                             >
                                <div className="flex items-center gap-3">
                                   <Checkbox 
                                     checked={isPaid || selectedInstallments.includes(i)} 
                                     disabled={isPaid}
                                     className="h-5 w-5 rounded-lg"
                                   />
                                   <div>
                                      <p className="font-black text-xs uppercase">Part {i}</p>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{isPaid ? 'Already Paid' : `GH₵${(parseFloat(payingInstallmentOrder?.installmentAmount?.toString() || "0")).toFixed(2)}`}</p>
                                   </div>
                                </div>
                                {isPaid && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                             </div>
                          );
                       })}
                    </div>
                 </div>

                 <div className="bg-black rounded-2xl p-6 text-white flex justify-between items-center">
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total to Pay</p>
                       <h4 className="text-2xl font-black text-primary">GH₵{(selectedInstallments.length * parseFloat(payingInstallmentOrder?.installmentAmount?.toString() || "0")).toFixed(2)}</h4>
                    </div>
                    <Button 
                      disabled={selectedInstallments.length === 0 || payInstallmentMutation.isPending} 
                      className="rounded-xl bg-primary text-black font-black uppercase text-[10px] h-12 px-6"
                      onClick={() => {
                         if (payingInstallmentOrder) {
                            payInstallmentMutation.mutate({
                               orderId: payingInstallmentOrder.id,
                               installments: selectedInstallments.length
                            });
                         }
                      }}
                    >
                      {payInstallmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
                    </Button>
                 </div>
              </div>
           </DialogContent>
        </Dialog>
        
        {/* Rejection Reason Dialog */}
        <Dialog open={!!rejectingOrder} onOpenChange={(open) => !open && setRejectingOrder(null)}>
           <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
              <DialogHeader className="bg-black text-white p-8">
                 <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Decline Order</DialogTitle>
                 <DialogDescription className="text-gray-400">Please provide a reason for declining this order. This will be sent to the buyer.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rejection Reason</Label>
                    <Textarea 
                      placeholder="e.g. Out of stock, price error, etc." 
                      value={rejectionReason} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                      className="rounded-xl border-2 min-h-[100px]"
                    />
                 </div>
                 <Button 
                   variant="destructive" 
                   className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-xs"
                   disabled={!rejectionReason || updateOrderApprovalMutation.isPending}
                   onClick={() => updateOrderApprovalMutation.mutate({ 
                     orderId: rejectingOrder!.id, 
                     approval: 'rejected', 
                     rejectionReason 
                   })}
                 >
                    {updateOrderApprovalMutation.isPending ? <Loader2 className="animate-spin" /> : "Decline Permanently"}
                 </Button>
              </div>
           </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StoreSettingsForm({ store, user }: { store: Store, user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description || '');
  const [city, setCity] = useState(store.city || '');
  const [university, setUniversity] = useState(store.university || '');
  
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAcc, setBankAcc] = useState(user?.bankAccountNumber || '');
  const [momo, setMomo] = useState(user?.mobileMoneyPhone || '');

  const handleUpdateStore = async () => {
    setIsUpdating(true);
    try {
      // 1. Update Store Details
      await apiRequest('PUT', `/api/stores/${store.id}`, {
        name, description, city, university
      });

      // 2. Update User Payment Details
      await apiRequest('PUT', `/api/users/${user.id}`, {
        bankName, bankAccountNumber: bankAcc, mobileMoneyPhone: momo
      });

      queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: "Updated", description: "Your store and profile settings have been saved." });
    } catch (err) {
      toast({ title: "Update Failed", description: "Please check your information and try again.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoChange = async (file: File) => {
    setIsUpdatingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await apiRequest('POST', `/api/stores/${store.id}/request-logo-change`, formData);
      const data = await res.json();
      toast({ title: "Request Sent", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
    } catch (err) {
      toast({ title: "Upload Failed", description: "Could not submit logo change request.", variant: "destructive" });
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
       <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-gray-50/50 p-8">
             <div className="text-center space-y-4">
                <div className="relative group w-32 h-32 mx-auto">
                   <img src={store.logoUrl || '/placeholder-logo.png'} className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-[2rem] flex items-center justify-center">
                      <ImageIcon className="text-white w-6 h-6" />
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleLogoChange(e.target.files[0])} accept="image/*" />
                   </div>
                </div>
                {isUpdatingLogo && <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />}
                {store.pendingLogoUrl && <Badge variant="outline" className="text-[8px] uppercase border-amber-200 text-amber-600 bg-amber-50">Logo Change Pending</Badge>}
                <div>
                   <h3 className="font-black text-xl uppercase tracking-tighter">{store.name}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.email}</p>
                </div>
             </div>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-sm p-8 space-y-4">
             <h4 className="font-black uppercase text-xs tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Account Health
             </h4>
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-400">Merchant Status</span><span className="text-green-600">Active</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-400">Verification</span><span className="text-blue-600">Verified</span></div>
             </div>
          </Card>
       </div>

       <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                   <StoreIcon className="w-5 h-5 text-primary" /> Store Profile
                </h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Display Name</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl border-2" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bio / Description</Label>
                      <Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} className="rounded-xl border-2 min-h-[100px]" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">City</Label>
                         <Input value={city} onChange={e => setCity(e.target.value)} className="h-12 rounded-xl border-2" />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">University</Label>
                         <Input value={university} onChange={e => setUniversity(e.target.value)} className="h-12 rounded-xl border-2" />
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                   <CreditCard className="w-5 h-5 text-green-600" /> Payout Settings
                </h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Name (GHS)</Label>
                      <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GCB, Ecobank, Stanbic" className="h-12 rounded-xl border-2" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</Label>
                      <Input value={bankAcc} onChange={e => setBankAcc(e.target.value)} className="h-12 rounded-xl border-2" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mobile Money Phone</Label>
                      <Input value={momo} onChange={e => setMomo(e.target.value)} placeholder="024XXXXXXX" className="h-12 rounded-xl border-2" />
                   </div>
                   <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                      <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase">
                         Ensure your payment details are accurate. Earnings are disbursed within 24-48 hours of successful delivery.
                      </p>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t">
             <Button 
                className="w-full md:w-auto px-10 h-14 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs"
                onClick={handleUpdateStore}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save Changes
             </Button>
          </div>
       </div>
    </div>
  );
}



