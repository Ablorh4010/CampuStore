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
  Sparkles, Wallet, Smartphone, ChevronRight, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProductForm from '@/components/modals/product-form';
import InboxComponent from '@/components/chat/InboxComponent';
import type { ProductWithStore, Store, OrderWithDetails, CampusActivity } from '@shared/schema';

export default function Dashboard() {
  const { user, countryCode } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingTracking, setViewingTracking] = useState<OrderWithDetails | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);

  const fetchAiInsight = async (orderId: number) => {
    setIsGeneratingInsight(true);
    try {
      const response = await apiRequest('POST', `/api/ai/generate-tracking-insights/${orderId}`, {});
      const data = await response.json();
      setAiInsight(data.summary);
    } catch (error) {
      console.error("AI Insight Error:", error);
      setAiInsight("Unable to load AI tracking insights at this time.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const { data: userStores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores/user'],
    enabled: !!user,
  });

  const primaryStore = userStores[0];

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

  // Redirect to seller auth if no store
  useEffect(() => {
    if (!storesLoading && userStores.length === 0) {
      setLocation('/seller-auth');
    }
  }, [userStores.length, storesLoading, setLocation]);

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('DELETE', `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      toast({ title: "Product Deleted", description: "Listing has been removed from your store." });
    },
  });

  const updateOrderApprovalMutation = useMutation({
    mutationFn: async ({ orderId, approval }: { orderId: number, approval: string }) => {
      return apiRequest('PUT', `/api/orders/${orderId}/seller-approval`, { approval });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/seller'] });
      toast({ title: "Order Confirmed", description: "Sent to admin for final approval." });
    },
  });

  const updateBuyerConfirmationMutation = useMutation({
    mutationFn: async ({ orderId, confirmation }: { orderId: number, confirmation: string }) => {
      return apiRequest('PUT', `/api/orders/${orderId}/buyer-confirmation`, { confirmation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/buyer'] });
      toast({ title: "Success", description: "Order status updated." });
    },
  });

  if (storesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!primaryStore) return null;

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';
  const needsCorrection = user?.verificationStatus === 'needs_correction';

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Verification Status Banner */}
        {!isVerified && (
          <div className="mb-10">
            {isPending && (
              <Alert className="rounded-3xl border-blue-200 bg-blue-50 py-6">
                <Clock className="h-5 w-5 text-blue-600" />
                <AlertTitle className="font-black uppercase tracking-widest text-[10px] text-blue-600 mb-1">Application Under Review</AlertTitle>
                <AlertDescription className="font-bold text-blue-800">
                  Your seller identity is currently being verified. You have limited access until your account is approved.
                </AlertDescription>
              </Alert>
            )}
            {needsCorrection && (
              <Alert className="rounded-3xl border-amber-200 bg-amber-50 py-6">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="font-black uppercase tracking-widest text-[10px] text-amber-600 mb-1">Action Required: Correction Needed</AlertTitle>
                <AlertDescription className="font-bold text-amber-800 space-y-3">
                  <p>Admin feedback: "{user?.verificationNotes || 'Please review your uploaded documents.'}"</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-300 hover:bg-amber-100 h-9 rounded-xl font-black uppercase text-[10px]"
                    onClick={() => setLocation('/seller-auth')}
                  >
                    <RefreshCcw className="w-3 h-3 mr-2" /> Update Information & Resubmit
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-6 animate-reveal-up">
            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-xl flex-shrink-0">
               <img 
                 src={primaryStore.logoUrl || '/placeholder-logo.png'} 
                 className="w-full h-full object-cover" 
                 alt={primaryStore.name} 
               />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                  Store Dashboard
                </Badge>
                {isPending && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                    Approval Pending
                  </Badge>
                )}
                {needsCorrection && (
                  <Badge className="bg-amber-100 text-amber-700 border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                    Needs Correction
                  </Badge>
                )}
                {isVerified && (
                  <Badge className="bg-green-100 text-green-700 border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                    Verified Merchant
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                {primaryStore.name}
              </h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
                Managed by {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/seller-settings">
               <Button variant="outline" className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] h-12 px-6">
                 <Settings className="w-4 h-4 mr-2" /> Store Settings
               </Button>
             </Link>
             <Button 
               onClick={() => setIsProductFormOpen(true)}
               disabled={!isVerified}
               className={`rounded-xl bg-black text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-xl shadow-black/10 ${!isVerified ? 'opacity-50' : ''}`}
             >
               <Plus className="w-4 h-4 mr-2" /> 
               {isVerified ? 'New Listing' : 'Locked'}
             </Button>
          </div>
        </div>

        {/* Weekly Stock Reminder */}
        <Alert className="mb-8 rounded-[2rem] border-primary/20 bg-primary/5 py-6">
          <Clock className="h-5 w-5 text-primary" />
          <AlertTitle className="font-black uppercase tracking-widest text-[10px] text-primary mb-1">Weekly Stock Update</AlertTitle>
          <AlertDescription className="font-bold text-gray-700">
            Please ensure all your product quantities are accurate. Regular updates help avoid order cancellations.
          </AlertDescription>
        </Alert>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Sales', val: orders.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Inventory', val: storeProducts.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Profile Views', val: storeProducts.reduce((s, p) => s + (p.viewCount || 0), 0), icon: Eye, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Rating', val: `${parseFloat(primaryStore.rating).toFixed(1)}/5`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' }
          ].map((stat, i) => (
            <Card key={i} className="rounded-[2rem] border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.val}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-gray-50 p-1 border">
            <TabsTrigger value="overview" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Inventory</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Orders Received</TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm">My Purchases</TabsTrigger>
            <TabsTrigger value="inbox" className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Inbox</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
             <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-gray-50/50">
                   <CardHeader className="p-8 pb-0">
                      <CardTitle className="text-xl font-black uppercase tracking-tighter">Recent Orders.</CardTitle>
                   </CardHeader>
                   <CardContent className="p-8">
                      {orders.length === 0 ? (
                        <div className="text-center py-20">
                           <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                           <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No orders yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {orders.slice(0, 5).map(order => (
                             <div key={order.id} className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-sm border border-gray-100 group hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-4">
                                   <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50">
                                      <img src={order.product.images?.[0] || '/placeholder-product.png'} className="w-full h-full object-cover" alt="" />
                                   </div>
                                   <div>
                                      <h4 className="font-black text-sm uppercase tracking-tight">{order.product.title}</h4>
                                      <p className="text-sm font-medium text-gray-500">Seller: {order.seller.firstName} • {new Date(order.createdAt!).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="text-right">
                                      <p className="font-black text-xl">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                                      <div className="flex flex-col items-end gap-1">
                                        <Badge className="bg-blue-100 text-blue-700 border-none font-bold">{order.deliveryStatus?.toUpperCase() || 'PENDING'}</Badge>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{order.shippingMode?.replace(/_/g, ' ')}</span>
                                      </div>
                                   </div>
                                   <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setViewingTracking(order); fetchAiInsight(order.id); }}>
                                      <ChevronRight className="w-5 h-5 text-gray-300" />
                                   </Button>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </CardContent>
                </Card>

                <div className="space-y-8">
                   <Card className="rounded-[2.5rem] bg-black text-white p-10 border-none shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Quick <br />Promote.</h3>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">Feature your top items on the home page for only GH₵5/day.</p>
                      <Button 
                        className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all"
                        onClick={() => {
                          setActiveTab('listings');
                          toast({ title: "Promotion", description: "Select an item from your inventory to promote." });
                        }}
                      >
                        Select Listing
                      </Button>
                   </Card>

                   <Card className="rounded-[2.5rem] border-2 border-dashed border-gray-100 p-8 text-center bg-white">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                         <MessageCircle className="w-8 h-8 text-gray-200" />
                      </div>
                      <h4 className="font-black uppercase tracking-widest text-xs mb-2">Campus Inbox</h4>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Connect with buyers directly on hub chat.</p>
                      <Button 
                        variant="outline" 
                        className="w-full h-10 rounded-xl border-2 font-black uppercase tracking-widest text-[10px]"
                        onClick={() => setActiveTab('inbox')}
                      >
                        Open Inbox
                      </Button>
                   </Card>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeProducts.map(product => (
                  <Card key={product.id} className="rounded-3xl border-none shadow-sm overflow-hidden group">
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                       <img src={product.images?.[0] || '/placeholder-product.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                       <div className="absolute top-4 right-4 flex gap-2">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg shadow-xl"
                            onClick={() => deleteProductMutation.mutate(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>
                    </div>
                    <CardContent className="p-6">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-black text-sm uppercase tracking-tight">{product.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <Badge className="bg-gray-100 text-gray-700 border-none text-[9px] font-bold uppercase tracking-widest">Stock: {product.stockQuantity}</Badge>
                               {!product.isAvailable && (
                                  <Badge variant="destructive" className="text-[9px] font-bold">SOLD OUT</Badge>
                               )}
                            </div>
                            {product.approvalStatus === 'pending' && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[9px] font-bold mt-1">
                                 PENDING Hub APPROVAL
                              </Badge>
                            )}
                          </div>
                          <p className="text-primary font-black">GH₵{parseFloat(product.price).toFixed(2)}</p>
                       </div>
                       <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="rounded-lg font-bold border-2 text-[9px]">{product.condition.toUpperCase()}</Badge>
                          {product.sizes && <Badge variant="outline" className="rounded-lg font-bold border-2 text-[9px]">SIZES: {product.sizes}</Badge>}
                       </div>
                    </CardContent>
                  </Card>
                ))}
                {storeProducts.length === 0 && (
                   <div className="col-span-full text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No listings yet.</p>
                   </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="sales" className="mt-0 space-y-8">
             {/* Fulfillment Guide */}
             <Card className="rounded-[2.5rem] border-none bg-black text-white p-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="relative">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/10 rounded-2xl"><Info className="w-6 h-6 text-primary" /></div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Fulfillment Protocol.</h3>
                   </div>
                   <div className="grid md:grid-cols-4 gap-6">
                      {[
                        { step: "01", title: "Order Received", desc: "Buyer places order and pays hub." },
                        { step: "02", title: "Seller Approval", desc: "You confirm stock and readiness." },
                        { step: "03", title: "Admin Review", desc: "Final check & logistics prep." },
                        { step: "04", title: "Kaydem Logistics", desc: "Agent picks up & delivers to buyer." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-2">
                           <p className="text-primary font-black text-xs tracking-widest">{item.step}</p>
                           <h4 className="font-bold text-sm uppercase">{item.title}</h4>
                           <p className="text-white/40 text-[10px] font-medium leading-relaxed uppercase tracking-wider">{item.desc}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </Card>

             <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-primary/5 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                             <img src={order.product.images?.[0] || '/placeholder-product.png'} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>

                            <div className="flex items-center gap-2 mb-1">
                               <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase">{order.product.category.name}</Badge>
                               <span className="text-[10px] font-bold text-gray-400">Order #{order.id}</span>
                            </div>
                            <h4 className="font-black text-lg uppercase tracking-tight">{order.product.title}</h4>
                            <p className="text-sm font-medium text-gray-500">Buyer: {order.buyer.firstName} • {new Date(order.createdAt!).toLocaleDateString()}</p>
                            <div className="flex items-center gap-3 mt-2">
                               <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${order.sellerApproval === 'approved' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                  <span className="text-[10px] font-black uppercase text-gray-400">Seller: {order.sellerApproval}</span>
                               </div>
                               <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${order.adminApproval === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                  <span className="text-[10px] font-black uppercase text-gray-400">Admin: {order.adminApproval}</span>
                               </div>
                            </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <p className="font-black text-2xl">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                             {order.payoutStatus && (
                               <Badge className={order.payoutStatus === 'processed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                                 PAYOUT: {order.payoutStatus.toUpperCase()}
                               </Badge>
                             )}
                          </div>
                          <div className="flex flex-col gap-2">
                             {order.sellerApproval === 'pending' && (
                                <Button 
                                  className="rounded-xl bg-green-500 hover:bg-green-600 h-10 px-6 font-black uppercase tracking-widest text-[10px]"
                                  onClick={() => updateOrderApprovalMutation.mutate({ orderId: order.id, approval: 'approved' })}
                                >
                                  Confirm Order
                                </Button>
                             )}
                             <Button variant="outline" className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]" onClick={() => { setViewingTracking(order); fetchAiInsight(order.id); }}>Details</Button>
                          </div>
                       </div>
                  </div>
                ))}
                {orders.length === 0 && (
                   <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No sales yet.</p>
                   </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="purchases" className="mt-0">
             <div className="space-y-4">
                {purchases.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem] group hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all border border-transparent hover:border-primary/10">
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                             <img src={order.product.images?.[0] || '/placeholder-product.png'} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>

                            <div className="flex items-center gap-2 mb-1">
                               <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase">{order.product.category.name}</Badge>
                               <span className="text-[10px] font-bold text-gray-400">Order #{order.id}</span>
                            </div>
                            <h4 className="font-black text-lg uppercase tracking-tight">{order.product.title}</h4>
                            <p className="text-sm font-medium text-gray-500">Buyer: {order.buyer.firstName} • {new Date(order.createdAt!).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <p className="font-black text-xl">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                             <div className="flex flex-col items-end gap-1">
                               <Badge className="bg-primary/10 text-primary border-none font-bold">{order.status.toUpperCase()}</Badge>
                               <Badge variant="outline" className="text-[10px]">{order.deliveryStatus?.toUpperCase() || 'PENDING'}</Badge>
                             </div>
                          </div>
                          <div className="flex flex-col gap-2">
                             <Button className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]" onClick={() => { setViewingTracking(order); fetchAiInsight(order.id); }}>Track</Button>
                             {order.deliveryStatus === 'delivered' && order.status === 'confirmed' && (
                               <div className="flex gap-2 mt-2">
                                  <Button 
                                    className="bg-green-500 hover:bg-green-600 h-8 px-4 text-[9px] font-black uppercase rounded-lg"
                                    onClick={() => updateBuyerConfirmationMutation.mutate({ orderId: order.id, confirmation: 'received' })}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    className="h-8 px-4 text-[9px] font-black uppercase rounded-lg"
                                    onClick={() => updateBuyerConfirmationMutation.mutate({ orderId: order.id, confirmation: 'rejected' })}
                                  >
                                    Reject
                                  </Button>
                               </div>
                             )}
                          </div>
                       </div>
                  </div>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="inbox" className="mt-0">
             <InboxComponent />
          </TabsContent>
        </Tabs>

        {/* Tracking Dialog */}
        <Dialog open={!!viewingTracking} onOpenChange={(open) => !open && setViewingTracking(null)}>
           <DialogContent className="max-w-2xl rounded-[2.5rem] border-none p-10">
              <DialogHeader>
                 <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Order Tracking.</DialogTitle>
                 <DialogDescription className="font-bold text-gray-400">Stay updated on your item's journey.</DialogDescription>
              </DialogHeader>
              
              <div className="bg-gray-50 rounded-3xl p-8 mb-8">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                       <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Smart Status</p>
                       <h4 className="font-black uppercase tracking-tight">AI Generated Tracking Insight</h4>
                    </div>
                 </div>
                 
                 {isGeneratingInsight ? (
                    <div className="flex items-center gap-3 text-primary animate-pulse">
                       <Sparkles className="w-4 h-4" />
                       <p className="text-xs font-black uppercase tracking-widest">Analyzing shipment patterns...</p>
                    </div>
                 ) : (
                    <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                       "{aiInsight || 'No insight available for this order status.'}"
                    </p>
                 )}
              </div>

              <Separator />

              <div className="space-y-6 pl-4 border-l-4 border-primary/20">
                 <div className="relative">
                    <div className={`absolute -left-[1.35rem] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${viewingTracking?.deliveryStatus === 'delivered' ? 'bg-green-500' : 'bg-primary'}`}></div>
                    <p className="font-black text-sm uppercase tracking-wider">{viewingTracking?.deliveryStatus?.replace(/_/g, ' ') || 'ORDER PLACED'}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                       {viewingTracking?.trackingHistory || 'Your order has been received and is being processed by the seller.'}
                    </p>
                 </div>
                 <div className="relative opacity-40">
                    <div className="absolute -left-[1.35rem] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm bg-gray-200"></div>
                    <p className="font-black text-sm uppercase tracking-wider">Out for Delivery</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">The item will be delivered to your campus location soon.</p>
                 </div>
              </div>
           </DialogContent>
        </Dialog>

        <ProductForm 
          isOpen={isProductFormOpen} 
          onClose={() => setIsProductFormOpen(false)} 
          userStores={userStores} 
        />
      </div>
    </div>
  );
}
