import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Store as StoreIcon, Star, CreditCard, User as UserIcon, Building2, Upload, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductForm from '@/components/modals/product-form';
import MagicImportModal from '@/components/modals/magic-import-modal';
import InboxComponent from '@/components/chat/InboxComponent';
import ProductCard from '@/components/product/product-card';
import { IdScanCapture, FacialCapture } from '@/components/verification';
import type { ProductWithStore, Store, OrderWithDetails, User as UserType } from '@shared/schema';

export default function Dashboard() {
  const { user, countryCode } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingTracking, setViewingTracking] = useState<OrderWithDetails | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [initialMagicUrl, setInitialMagicUrl] = useState('');
  const [reviewOrder, setReviewOrder] = useState<OrderWithDetails | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Checklist / Limited Access states
  const [idFileFront, setIdFileFront] = useState<File | null>(null);
  const [idFileBack, setIdFileBack] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccountNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  // Handle magic_url query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicUrl = params.get('magic_url');
    if (magicUrl) {
      setInitialMagicUrl(magicUrl);
      setIsMagicImportOpen(true);
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

  const { data: userStores = [], isLoading: storesLoading, refetch: refetchStores } = useQuery<Store[]>({
    queryKey: ['/api/stores/user'],
    enabled: !!user,
  });

  const primaryStore = userStores[0];

  // Auto-create store for admins
  useEffect(() => {
    if (!storesLoading && userStores.length === 0 && user?.isAdmin) {
      apiRequest('POST', '/api/stores', {
        name: "University Hub Official",
        description: "Official store for The University Hub",
        city: "Accra", university: "All Universities", address: "HQ"
      }).then(() => refetchStores());
    }
  }, [userStores.length, storesLoading, user, refetchStores]);

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

  const updateOrderApprovalMutation = useMutation({
    mutationFn: async ({ orderId, approval }: { orderId: number, approval: string }) => {
      return apiRequest('PUT', `/api/orders/${orderId}/seller-approval`, { approval });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/seller'] });
      toast({ title: "Confirmed", description: "Order sent for admin review." });
    },
  });

  if (storesLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';
  const needsCorrection = user?.verificationStatus === 'needs_correction';

  // If no store, redirect or show "Start Selling"
  if (!primaryStore) {
    return (
      <div className="min-h-screen bg-white py-24 flex items-center justify-center">
         <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl p-12 text-center">
            <StoreIcon className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Almost a Seller.</h2>
            <p className="text-gray-500 mb-8 font-medium">Click below to finish your profile setup.</p>
            <Link href="/seller-auth"><Button className="w-full h-14 rounded-2xl bg-black font-black uppercase">Finish Profile</Button></Link>
         </Card>
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMagicImportOpen(true)} className="rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] h-12 px-6"><Sparkles className="w-4 h-4 mr-2" /> Magic Import</Button>
            <Button onClick={() => setIsProductFormOpen(true)} className="rounded-xl bg-black text-white font-black uppercase tracking-widest text-[10px] h-12 px-6"><Plus className="w-4 h-4 mr-2" /> New Listing</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="inline-flex h-14 bg-gray-50 p-1 border rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px]">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px]">Inventory</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px]">Orders</TabsTrigger>
            <TabsTrigger value="inbox" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px]">Inbox</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Sales', val: orders.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Products', val: storeProducts.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Views', val: storeProducts.reduce((s, p) => s + (p.viewCount || 0), 0), icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Rating', val: `${parseFloat(primaryStore.rating).toFixed(1)}/5`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
              ].map((stat, i) => (
                <Card key={i} className="rounded-3xl border-none shadow-sm">
                  <CardContent className="p-8">
                    <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.val}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Recent Orders List */}
            <div className="space-y-4">
               {orders.slice(0, 5).map(o => (
                  <Card key={o.id} className="p-6 rounded-[2rem] border-none shadow-sm bg-gray-50/50">
                     <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                           <img src={o.product.images?.[0]} className="w-12 h-12 rounded-xl object-cover" />
                           <div><p className="font-black text-sm uppercase">{o.product.title}</p><p className="text-xs font-bold text-gray-400">#{o.id} • {new Date(o.createdAt!).toLocaleDateString()}</p></div>
                        </div>
                        <p className="font-black text-lg text-primary">GH₵{parseFloat(o.totalAmount).toFixed(2)}</p>
                     </div>
                  </Card>
               ))}
            </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {storeProducts.map(p => <ProductCard key={p.id} product={p} />)}
                {storeProducts.length === 0 && <p className="col-span-full py-20 text-center text-gray-400 font-bold uppercase text-xs">No listings yet.</p>}
             </div>
          </TabsContent>

          <TabsContent value="sales" className="mt-0 space-y-4">
             {orders.map(o => (
               <div key={o.id} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-xl">
                  <div className="flex items-center gap-6">
                     <img src={o.product.images?.[0]} className="w-16 h-16 rounded-2xl object-cover" />
                     <div><h4 className="font-black text-lg uppercase">{o.product.title}</h4><p className="text-sm font-bold text-gray-500">Buyer: {o.buyer.firstName} • {o.deliveryStatus?.toUpperCase()}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                     <p className="font-black text-2xl">GH₵{parseFloat(o.totalAmount).toFixed(2)}</p>
                     {o.sellerApproval === 'pending' && <Button className="rounded-xl bg-green-500 font-black text-[10px] h-10 px-6 uppercase" onClick={() => updateOrderApprovalMutation.mutate({ orderId: o.id, approval: 'approved' })}>Confirm</Button>}
                  </div>
               </div>
             ))}
          </TabsContent>
          <TabsContent value="inbox" className="mt-0"><InboxComponent /></TabsContent>
        </Tabs>

        <ProductForm isOpen={isProductFormOpen} onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} userStores={userStores} initialData={editingProduct} />
        <MagicImportModal isOpen={isMagicImportOpen} onClose={() => {setIsMagicImportOpen(false); setInitialMagicUrl('');}} userStores={userStores} initialUrl={initialMagicUrl} />
      </div>
    </div>
  );
}
