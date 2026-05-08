import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Users as UsersIcon, Package, Store as StoreIcon, DollarSign, Activity,
  Settings, Plus, Tag, Mail, Loader2, RefreshCcw, ShieldAlert,
  ShieldCheck, XCircle, CheckCircle2, Clock, Eye, Zap, Newspaper, Menu, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link, useLocation } from 'wouter';
import type { User, Store, Product, Category, Order, WeeklyDeal, CampusActivity, ProductWithStore, StoreWithUser, OrderWithDetails, WeeklyDealWithProduct, CampusActivityWithUser } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductForm from '@/components/modals/product-form';
import MagicImportModal from '@/components/modals/magic-import-modal';
import InboxComponent from '@/components/chat/InboxComponent';

export default function AdminDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStore | null>(null);
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [initialMagicUrl, setInitialMagicUrl] = useState('');
  const [rejectingOrder, setRejectingOrder] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  // Category management state
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', color: '#6366f1', parentId: null as number | null });

  // Weekly Deals management state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ 
    productId: 0, 
    discountPercentage: 10, 
    dealLabel: 'Flash Deal', 
    isActive: true, 
    displayOrder: 0,
    flyerHeadline: '',
    flyerSubtext: ''
  });

  // Campus Activity state
  const [newActivity, setNewActivity] = useState({ title: '', content: '', source: 'internal', activityType: 'news', imageUrl: '' });

  // Deletion/Suspension feedback state
  const [modModalOpen, setModModalOpen] = useState(false);
  const [modItem, setModItem] = useState<{ id: number; type: 'product' | 'store' | 'user' | 'deal' | 'activity'; action: 'delete' | 'reject' | 'suspend' | 'needs_correction'; title: string } | null>(null);
  
  const [adminMomoNumber, setAdminMomoNumber] = useState('');
  const [adminAlertEmail, setAdminAlertEmail] = useState('');
  const [whatsappSupport1, setWhatsappSupport1] = useState('');
  const [whatsappSupport2, setWhatsappSupport2] = useState('');
  const [whatsappSupport3, setWhatsappSupport3] = useState('');

  // Queries
  const { data: configData, refetch: refetchMomo } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_momo_number'],
    enabled: !!user?.isAdmin,
  });

  const { data: alertEmailData, refetch: refetchAlertEmail } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_alert_email'],
    enabled: !!user?.isAdmin,
  });

  const { data: ws1Data, refetch: refetchWs1 } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/whatsapp_support_1'],
    enabled: !!user?.isAdmin,
  });
  
  const { data: ws2Data, refetch: refetchWs2 } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/whatsapp_support_2'],
    enabled: !!user?.isAdmin,
  });

  const { data: ws3Data, refetch: refetchWs3 } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/whatsapp_support_3'],
    enabled: !!user?.isAdmin,
  });

  useEffect(() => {
    if (configData?.value && !adminMomoNumber) setAdminMomoNumber(configData.value);
    if (alertEmailData?.value && !adminAlertEmail) setAdminAlertEmail(alertEmailData.value);
    if (ws1Data?.value && !whatsappSupport1) setWhatsappSupport1(ws1Data.value);
    if (ws2Data?.value && !whatsappSupport2) setWhatsappSupport2(ws2Data.value);
    if (ws3Data?.value && !whatsappSupport3) setWhatsappSupport3(ws3Data.value);
  }, [configData, alertEmailData, ws1Data, ws2Data, ws3Data]);

  const { data: analytics } = useQuery<{
    totalUsers: number; totalStores: number; totalProducts: number; totalOrders: number; totalRevenue: number;
  }>({ queryKey: ['/api/admin/analytics'], enabled: !!user?.isAdmin });

  const { data: allUsers = [] } = useQuery<User[]>({ queryKey: ['/api/admin/users'], enabled: !!user?.isAdmin });
  const { data: allProducts = [] } = useQuery<ProductWithStore[]>({ queryKey: ['/api/admin/products'], enabled: !!user?.isAdmin });
  const { data: pendingStores = [] } = useQuery<StoreWithUser[]>({ queryKey: ['/api/admin/stores/pending'], enabled: !!user?.isAdmin });
  const { data: pendingUsers = [] } = useQuery<User[]>({ queryKey: ['/api/admin/users/pending-verification'], enabled: !!user?.isAdmin });
  const { data: pendingLogos = [] } = useQuery<StoreWithUser[]>({ queryKey: ['/api/admin/logo-changes'], enabled: !!user?.isAdmin });
  const { data: pendingOrders = [] } = useQuery<OrderWithDetails[]>({ queryKey: ['/api/admin/orders/pending'], enabled: !!user?.isAdmin });
  const { data: pendingPayouts = [] } = useQuery<OrderWithDetails[]>({ queryKey: ['/api/admin/payouts/pending'], enabled: !!user?.isAdmin });
  const { data: pendingBuyerVerifications = [] } = useQuery<User[]>({ queryKey: ['/api/admin/users/pending-buyer-verification'], enabled: !!user?.isAdmin });
  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({ queryKey: ['/api/categories'], enabled: !!user?.isAdmin });
  const { data: weeklyDeals = [], refetch: refetchDeals } = useQuery<WeeklyDealWithProduct[]>({ queryKey: ['/api/admin/weekly-deals'], enabled: !!user?.isAdmin });
  const { data: campusActivities = [], refetch: refetchActivities } = useQuery<CampusActivityWithUser[]>({ queryKey: ['/api/admin/campus-activity'], enabled: !!user?.isAdmin });

  const { data: healthData } = useQuery<{
    database: { status: string; message: string };
    gcp: { status: string; project: string };
    resend: { status: string };
  }>({ queryKey: ['/api/admin/health'], enabled: !!user?.isAdmin, refetchInterval: 30000 });

  const { data: aiInsights, refetch: refetchInsights, isFetching: insightsFetching } = useQuery<{ summary: string }>({
    queryKey: ['/api/admin/ai-insights'],
    enabled: !!user?.isAdmin,
  });

  const { toast } = useToast();

  // Mutations
  const saveConfigMutation = useMutation({
    mutationFn: (data: { key: string, value: string }) => apiRequest('POST', '/api/admin/config', data),
    onSuccess: () => { refetchMomo(); refetchAlertEmail(); refetchWs1(); refetchWs2(); refetchWs3(); toast({ title: 'Success', description: 'Configuration saved' }); },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/categories', data),
    onSuccess: () => { refetchCategories(); setNewCategory({ name: '', icon: '📦', color: '#6366f1', parentId: null }); toast({ title: 'Category Created' }); }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/categories/${id}`),
    onSuccess: () => { refetchCategories(); toast({ title: 'Category Removed' }); }
  });

  const updateProductStatusMutation = useMutation({
    mutationFn: ({ productId, status, feedback }: { productId: number; status: string; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/products/${productId}/approval`, { status, feedback }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] }); toast({ title: 'Success' }); },
  });

  const updateAdminOrderApprovalMutation = useMutation({
    mutationFn: ({ orderId, status, estimatedDeliveryDate, rejectionReason }: { orderId: number; status: string; estimatedDeliveryDate?: string; rejectionReason?: string }) =>
      apiRequest('PUT', `/api/admin/orders/${orderId}/approval`, { status, estimatedDeliveryDate, rejectionReason }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/pending'] }); 
      toast({ title: 'Success' }); 
      setRejectingOrder(null);
      setRejectionReason('');
    },
  });

  const updateSellerApprovalMutation = useMutation({
    mutationFn: async ({ orderId, approval, rejectionReason }: { orderId: number, approval: string, rejectionReason?: string }) => {
      await apiRequest('PUT', `/api/orders/${orderId}/seller-approval`, { approval, rejectionReason });
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/pending'] }); 
      toast({ title: 'Success' }); 
      setRejectingOrder(null);
      setRejectionReason('');
    },
  });

  const approveBuyerMutation = useMutation({
    mutationFn: (userId: number) => apiRequest('PUT', `/api/admin/users/${userId}/approve-buyer`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending-buyer-verification'] }); toast({ title: 'Success' }); },
  });

  const updateUserVerificationMutation = useMutation({
    mutationFn: ({ userId, status, feedback }: { userId: number; status: string; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/users/${userId}/verify`, { status, feedback }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending-verification'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'Verification status updated.' }); 
    },
  });

  const updateStoreStatusMutation = useMutation({
    mutationFn: ({ storeId, status }: { storeId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/stores/${storeId}/approval`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] }); toast({ title: 'Success' }); },
  });

  const updateLogoStatusMutation = useMutation({
    mutationFn: ({ storeId, status }: { storeId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/stores/${storeId}/logo-approval`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/logo-changes'] }); toast({ title: 'Success' }); },
  });

  const processPayoutMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/orders/${orderId}/payout`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts/pending'] }); toast({ title: 'Success' }); },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/campus-activity', data),
    onSuccess: () => { refetchActivities(); setNewActivity({ title: '', content: '', source: 'internal', activityType: 'news', imageUrl: '' }); toast({ title: 'Success' }); },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/campus-activity/${id}`),
    onSuccess: () => { refetchActivities(); toast({ title: 'Removed' }); },
  });

  const createDealMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/weekly-deals', data),
    onSuccess: () => { refetchDeals(); setDealModalOpen(false); toast({ title: 'Deal Activated' }); },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/weekly-deals/${id}`),
    onSuccess: () => { refetchDeals(); toast({ title: 'Deal Removed' }); },
  });

  const generateFlyerMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest('POST', '/api/admin/weekly-deals/generate-flyer', { productId });
      return await res.json();
    },
    onSuccess: (data) => {
      setNewDeal(prev => ({ ...prev, flyerHeadline: data.headline, flyerSubtext: data.subtext }));
      toast({ title: 'Flyer Content Generated' });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: number, data: any }) => {
      return apiRequest('PUT', `/api/products/${productId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({ title: "Product Updated" });
    },
  });

   const deleteItemMutation = useMutation({
     mutationFn: async ({ id, type, feedback }: { id: number; type: 'product' | 'store' | 'user'; feedback: string }) => {
       const res = await apiRequest('DELETE', `/api/admin/${type}s/${id}`, { feedback });
       return await res.json();
     },
     onSuccess: (data: any) => {
       if (data.success === false) {
         toast({ 
           title: "Deletion Failed", 
           description: "This item could not be removed. It may have active dependencies or orders.",
           variant: "destructive"
         });
         return;
       }
       queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
       queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] });
       queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
       toast({ title: 'Item Deleted' });
       setModModalOpen(false);
       setModItem(null);
     },
   });

  const handleModAction = (feedback: string) => {
    if (!modItem) return;
    if (modItem.type === 'user' && (modItem.action === 'reject' || modItem.action === 'needs_correction')) {
      const status = modItem.action === 'reject' ? 'rejected' : 'needs_correction';
      updateUserVerificationMutation.mutate({ userId: modItem.id, status, feedback });
    } else if (modItem.action === 'delete' || modItem.action === 'reject') {
      deleteItemMutation.mutate({ id: modItem.id, type: modItem.type as any, feedback });
    }
    setModModalOpen(false);
  };

  const handleLogout = async () => { await logout(); setLocation('/'); };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user || !user.isAdmin) return null;

  const NavItem = ({ value, label, icon: Icon, badge, onClick }: { value: string, label: string, icon: any, badge?: number, onClick?: () => void }) => (
    <button 
      onClick={() => { setActiveTab(value); onClick?.(); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === value ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${activeTab === value ? 'text-white' : 'text-gray-400'}`} />
        <span className="font-bold text-[11px] uppercase tracking-widest">{label}</span>
      </div>
      {badge ? <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === value ? 'bg-white text-black' : 'bg-primary text-white'}`}>{badge}</span> : null}
    </button>
  );

  const NavSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1.5 mb-6">
      <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-2">{title}</h3>
      {children}
    </div>
  );

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 overflow-y-auto scrollbar-hide py-8">
      <div className="px-8 mb-10">
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic leading-none">The Hub.</h1>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">Platform Control</p>
      </div>
      <nav className="px-3 flex-1">
        <NavSection title="Dashboard"><NavItem value="overview" label="Overview" icon={Activity} onClick={onNavClick} /><NavItem value="inbox" label="Inbox" icon={Mail} onClick={onNavClick} /></NavSection>
        <NavSection title="Approvals">
          <NavItem value="pending-products" label="Products" icon={Zap} badge={allProducts.filter(p => p.approvalStatus === 'pending').length} onClick={onNavClick} />
          <NavItem value="weekly-deals" label="Weekly Deals" icon={Tag} badge={weeklyDeals.length} onClick={onNavClick} />
          <NavItem value="pending-verifications" label="Sellers" icon={ShieldAlert} badge={pendingUsers.length} onClick={onNavClick} />
          <NavItem value="installment-approvals" label="Installments" icon={DollarSign} badge={pendingBuyerVerifications.length} onClick={onNavClick} />
          <NavItem value="pending-stores" label="Stores" icon={StoreIcon} badge={pendingStores.length} onClick={onNavClick} />
        </NavSection>
        <NavSection title="Inventory"><NavItem value="product-mgmt" label="Catalog" icon={Package} onClick={onNavClick} /><NavItem value="pending-logos" label="Logos" icon={Eye} badge={pendingLogos.length} onClick={onNavClick} /></NavSection>
        <NavSection title="Commerce"><NavItem value="pending-orders" label="Orders" icon={Newspaper} badge={pendingOrders.length} onClick={onNavClick} /><NavItem value="payouts" label="Payouts" icon={DollarSign} badge={pendingPayouts.length} onClick={onNavClick} /></NavSection>
        <NavSection title="System">
          <NavItem value="users-mgmt" label="Users" icon={UsersIcon} onClick={onNavClick} />
          <NavItem value="settings" label="Settings" icon={Settings} onClick={onNavClick} />
          <NavItem value="app-mgmt" label="App Mgmt" icon={Zap} onClick={onNavClick} />
        </NavSection>
      </nav>
      <div className="px-6 mt-auto pt-6 border-t border-gray-50 space-y-3">
        <Link href="/dashboard"><Button variant="outline" className="w-full rounded-xl border-2 font-black text-[10px] uppercase tracking-widest h-11">Store Hub</Button></Link>
        <Button variant="outline" className="w-full rounded-xl border-2 font-black text-red-500 border-red-50 border-none bg-red-50 hover:bg-red-100 text-[10px] uppercase tracking-widest h-11" onClick={handleLogout}>Logout</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-body">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-0 h-screen"><SidebarContent /></aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-50 flex items-center justify-between">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">Admin Hub.</h1>
        <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl"><Menu className="h-6 w-6" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72 border-none"><SidebarContent onNavClick={() => {}} /></SheetContent></Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 min-w-0 overflow-x-hidden">
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div><h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">{activeTab.replace('-', ' ')}</h2><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Real-time platform insights</p></div>
           <Badge variant="secondary" className="h-9 rounded-full px-5 font-black uppercase text-[10px] tracking-widest bg-white border shadow-sm">{user.username}</Badge>
        </div>

        <Tabs value={activeTab} className="space-y-8">
          <TabsContent value="overview" className="mt-0 space-y-10">
            {/* System Health Indicators */}
            <div className="flex flex-wrap gap-4 mb-8">
               <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-50">
                  <div className={`w-2 h-2 rounded-full ${healthData?.database?.status === 'up' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Neon DB:</span>
                  <span className="text-[10px] font-bold uppercase">{healthData?.database?.status === 'up' ? 'Online' : 'Offline'}</span>
               </div>
               <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-50">
                  <div className={`w-2 h-2 rounded-full ${healthData?.gcp?.status === 'configured' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">GCP:</span>
                  <span className="text-[10px] font-bold uppercase">{healthData?.gcp?.project}</span>
               </div>
               <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-50">
                  <div className={`w-2 h-2 rounded-full ${healthData?.resend?.status === 'configured' ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resend:</span>
                  <span className="text-[10px] font-bold uppercase">{healthData?.resend?.status === 'configured' ? 'Active' : 'Missing API Key'}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Users', val: analytics?.totalUsers || 0, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Stores', val: analytics?.totalStores || 0, icon: StoreIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Listings', val: analytics?.totalProducts || 0, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Revenue', val: `GH₵${analytics?.totalRevenue || 0}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' }
              ].map((stat, i) => (
                <Card key={i} className="rounded-3xl border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6 md:p-8">
                    <div className={`${stat.bg} w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4`}><stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} /></div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{stat.val}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* AI Insights Panel */}
            <div className="grid lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-black to-gray-800 text-white p-8 md:p-12 relative overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                             <Sparkles className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">AI Platform Insights</h3>
                       </div>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="rounded-full bg-white/5 border-white/10 text-white font-black uppercase text-[9px] hover:bg-white/10"
                         onClick={() => refetchInsights()}
                         disabled={insightsFetching}
                       >
                          {insightsFetching ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCcw className="w-3 h-3 mr-2" />}
                          Refresh Report
                       </Button>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-lg font-medium leading-relaxed text-gray-200 italic">
                          "{aiInsights?.summary || "Analyzing platform activity data for patterns and trends..."}"
                       </p>
                       <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                          <div>
                             <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Growth Index</p>
                             <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-primary">+12.4%</span>
                                <Zap className="w-4 h-4 text-primary" />
                             </div>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Active Hubs</p>
                             <span className="text-xl font-black">24 Universities</span>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                 <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Quick Actions</h4>
                 <div className="space-y-3">
                    <Button className="w-full h-14 rounded-2xl bg-black text-white font-bold text-xs uppercase shadow-xl" onClick={() => setIsProductModalOpen(true)}>Create Listing</Button>
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-bold text-xs uppercase" onClick={() => setActiveTab('settings')}>Platform Config</Button>
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-bold text-xs uppercase" onClick={() => window.open('/clear-cache', '_blank')}>Clear Cache</Button>
                 </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weekly-deals" className="mt-0 space-y-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">Active Weekly Deals</h3>
                <Button onClick={() => { setNewDeal({ productId: 0, discountPercentage: 10, dealLabel: 'Flash Deal', isActive: true, displayOrder: 0, flyerHeadline: '', flyerSubtext: '' }); setDealModalOpen(true); }} className="rounded-xl bg-primary text-black font-black uppercase text-[10px] h-10 px-6">Create New Deal</Button>
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
                {weeklyDeals.map(deal => (
                  <Card key={deal.id} className="rounded-3xl border-none shadow-sm bg-white p-6 overflow-hidden flex gap-6">
                     <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                        <img src={deal.product.images[0]} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                           <div>
                              <Badge className="bg-primary/20 text-primary-foreground border-none text-[8px] font-black uppercase mb-1">{deal.dealLabel}</Badge>
                              <h4 className="font-black uppercase text-sm leading-none">{deal.product.title}</h4>
                           </div>
                           <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteDealMutation.mutate(deal.id)}><XCircle className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-black text-primary">-{deal.discountPercentage}%</span>
                           <span className="text-[10px] font-bold text-gray-400">Order: {deal.displayOrder}</span>
                        </div>
                        
                        {/* Flyer Preview Placeholder */}
                        <div className="pt-2">
                           <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
                              <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Flyer Text</p>
                              <p className="text-[11px] font-bold leading-tight">{deal.flyerHeadline || "No custom headline yet"}</p>
                           </div>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {weeklyDeals.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No active deals.</p>}
          </TabsContent>

          <TabsContent value="pending-orders" className="mt-0 space-y-6">
             {pendingOrders.map(order => (
               <Card key={order.id} className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 md:p-10 overflow-hidden">
                  <div className="flex flex-col lg:flex-row gap-10">
                     <div className="flex-1 flex gap-8">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-gray-50 flex-shrink-0">
                           <img src={order.product.images?.[0]} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-4">
                           <div>
                              <h4 className="font-black text-2xl uppercase tracking-tighter leading-none">{order.product.title}</h4>
                              <p className="text-sm font-bold text-primary uppercase tracking-widest mt-2">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-50">
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Buyer Details</p>
                                 <p className="text-xs font-black uppercase">{order.buyer.firstName} {order.buyer.lastName}</p>
                                 <p className="text-[10px] font-bold text-gray-500 uppercase">{order.buyerPhone || order.buyer.phoneNumber}</p>
                                 <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{order.buyerUniversity || 'Main Campus'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Delivery Address</p>
                                 <p className="text-[10px] font-bold text-gray-700 uppercase leading-relaxed max-w-[200px]">{order.buyerAddress || 'Address not provided'}</p>
                                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{order.buyerCity || 'Accra'}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-4 min-w-[300px] bg-gray-50/50 p-6 rounded-3xl">
                        <div className="flex flex-col gap-2">
                           <p className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-widest">Order Processing</p>
                           {order.sellerApproval === 'pending' ? (
                             <div className="space-y-2">
                               <Button className="w-full rounded-2xl bg-black text-white font-black uppercase text-[10px] h-14 shadow-xl" onClick={() => updateSellerApprovalMutation.mutate({ orderId: order.id, approval: 'approved' })}>Hub Store Approval</Button>
                               <Button variant="outline" className="w-full rounded-2xl border-2 border-red-100 text-red-500 font-black uppercase text-[10px] h-12" onClick={() => setRejectingOrder({ ...order, rejectionType: 'seller' })}>Decline Order</Button>
                             </div>
                           ) : (
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <Label className="text-[9px] font-black uppercase text-gray-400">Est. Delivery Date</Label>
                                   <Input type="date" className="h-12 rounded-xl border-2 font-bold" onChange={(e) => (order as any).tempDate = e.target.value} />
                                </div>
                                <div className="space-y-2">
                                  <Button className="w-full bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-200" onClick={() => updateAdminOrderApprovalMutation.mutate({ orderId: order.id, status: 'approved', estimatedDeliveryDate: (order as any).tempDate })}>Final Release</Button>
                                  <Button variant="ghost" className="w-full text-red-500 font-black uppercase text-[10px]" onClick={() => setRejectingOrder({ ...order, rejectionType: 'admin' })}>Decline Order</Button>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingOrders.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending orders.</p>}
          </TabsContent>

          <TabsContent value="payouts" className="mt-0 space-y-6">
             {pendingPayouts.map(order => (
               <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8 border-l-4 border-green-500">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="space-y-4">
                        <div><h4 className="font-black text-lg uppercase">Payout for Order #{order.id}</h4><p className="text-sm font-bold text-gray-500">{order.seller.firstName} {order.seller.lastName} • {order.seller.email}</p></div>
                        <div className="bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400 mb-2">Seller Payment Info</p><p className="text-xs font-bold">Bank: {(order as any).seller.bankName || 'N/A'}</p><p className="text-xs font-bold">Acc: {(order as any).seller.bankAccountNumber || 'N/A'}</p><p className="text-xs font-bold">Momo: {(order as any).seller.mobileMoneyPhone || 'N/A'}</p></div>
                     </div>
                     <div className="text-right space-y-4">
                        <div><p className="text-[10px] font-black uppercase text-gray-400">Payout Amount</p><p className="text-3xl font-black text-green-600">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p></div>
                        <div className="flex gap-2 justify-end"><Button className="rounded-xl bg-black text-white font-bold px-8 h-12" onClick={() => processPayoutMutation.mutate({ orderId: order.id, status: 'processed' })}>Mark as Processed</Button></div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingPayouts.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending payouts.</p>}
          </TabsContent>

          <TabsContent value="product-mgmt" className="mt-0">
             <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <div className="p-0">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="border-b bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Product</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Store</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Price</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         {allProducts.map(product => (
                           <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50/30 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border bg-gray-50 shrink-0"><img src={product.images[0]} className="w-full h-full object-cover" /></div>
                                    <span className="font-bold text-sm uppercase truncate max-w-[200px]">{product.title}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5"><span className="text-xs font-bold text-gray-500 uppercase">{product.store.name}</span></td>
                              <td className="px-8 py-5"><span className="text-sm font-black">GH₵{product.price}</span></td>
                              <td className="px-8 py-5">
                                 <Badge className={`${product.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : product.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} border-none text-[8px] font-black uppercase`}>
                                    {product.approvalStatus}
                                 </Badge>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500" onClick={() => { setModItem({ id: product.id, type: 'product', action: 'delete', title: product.title }); setModModalOpen(true); }}><XCircle className="h-4 w-4" /></Button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="users-mgmt" className="mt-0">
             <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <div className="p-0">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="border-b bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">User</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Type</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Merchant</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         {allUsers.map(user => (
                           <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50/30 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs uppercase">{user.firstName?.[0]}{user.lastName?.[0]}</div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-sm uppercase">{user.firstName} {user.lastName}</span>
                                       <span className="text-[10px] font-medium text-gray-400 lowercase">{user.email}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <Badge className={`${user.userType === 'admin' ? 'bg-purple-100 text-purple-700' : user.userType === 'seller' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} border-none text-[8px] font-black uppercase`}>
                                    {user.userType}
                                 </Badge>
                              </td>
                              <td className="px-8 py-5"><span className="text-[10px] font-bold text-gray-500 uppercase">{user.phoneNumber || 'No phone'}</span></td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.isMerchant ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className="text-[10px] font-bold uppercase">{user.isMerchant ? 'Yes' : 'No'}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500" onClick={() => { setModItem({ id: user.id, type: 'user', action: 'delete', title: `${user.firstName} ${user.lastName}` }); setModModalOpen(true); }}><XCircle className="h-4 w-4" /></Button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="pending-logos" className="mt-0 space-y-6">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingLogos.map(store => (
                  <Card key={store.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                     <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <h4 className="font-black uppercase text-sm">{store.name}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.user.firstName} {store.user.lastName}</p>
                           </div>
                           <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">Pending Approval</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Current Logo</p>
                              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                 <img src={store.logoUrl || '/placeholder-logo.png'} className="w-full h-full object-cover" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-primary">New Logo</p>
                              <div className="aspect-square rounded-2xl overflow-hidden border-4 border-primary/20 bg-primary/5">
                                 <img src={store.pendingLogoUrl!} className="w-full h-full object-cover" />
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <Button className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl font-black uppercase text-[10px] h-11" onClick={() => updateLogoStatusMutation.mutate({ storeId: store.id, status: 'approved' })}>Approve</Button>
                           <Button variant="outline" className="flex-1 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black uppercase text-[10px] h-11" onClick={() => updateLogoStatusMutation.mutate({ storeId: store.id, status: 'rejected' })}>Reject</Button>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {pendingLogos.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending logo changes.</p>}
          </TabsContent>

          <TabsContent value="pending-stores" className="mt-0 space-y-6">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingStores.map(store => (
                  <Card key={store.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                     <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <h4 className="font-black uppercase text-sm">{store.name}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.university} • {store.city}</p>
                           </div>
                           <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">Pending Review</Badge>
                        </div>

                        <div className="space-y-2">
                           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Store Description</p>
                           <p className="text-xs font-medium text-gray-600 line-clamp-3">{store.description}</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <Button className="flex-1 bg-black text-white rounded-xl font-black uppercase text-[10px] h-11" onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'approved' })}>Approve Store</Button>
                           <Button variant="outline" className="flex-1 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black uppercase text-[10px] h-11" onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'rejected' })}>Reject</Button>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {pendingStores.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending stores.</p>}
          </TabsContent>

          <TabsContent value="pending-products" className="mt-0 space-y-6">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.filter(p => p.approvalStatus === 'pending').map(product => (
                  <Card key={product.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                     <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <h4 className="font-black uppercase text-sm">{product.title}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.store.name} • GH₵{product.price}</p>
                           </div>
                           <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">Pending Approval</Badge>
                        </div>

                        <div className="aspect-video rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                           <img src={product.images[0]} className="w-full h-full object-cover" />
                        </div>

                        <div className="space-y-2">
                           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Description</p>
                           <p className="text-xs font-medium text-gray-600 line-clamp-2">{product.description}</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <Button className="flex-1 bg-black text-white rounded-xl font-black uppercase text-[10px] h-11" onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'approved' })}>Approve</Button>
                           <Button variant="outline" className="flex-1 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black uppercase text-[10px] h-11" onClick={() => { setModItem({ id: product.id, type: 'product', action: 'reject', title: product.title }); setModModalOpen(true); }}>Reject</Button>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {allProducts.filter(p => p.approvalStatus === 'pending').length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending products.</p>}
          </TabsContent>

          <TabsContent value="installment-approvals" className="mt-0 space-y-6">
             <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingBuyerVerifications.map(user => (
                  <Card key={user.id} className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                     <div className="p-8 space-y-8">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-white shadow-sm font-black text-primary uppercase">{user.firstName?.[0]}{user.lastName?.[0]}</div>
                              <div>
                                 <h4 className="font-black uppercase text-lg leading-tight">{user.firstName} {user.lastName}</h4>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</p>
                              </div>
                           </div>
                           <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-black uppercase">Buyer Installment Request</Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ghana Card (Front)</p>
                              <div className="aspect-[3/2] rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                 <img src={user.buyerIdScanUrl!} className="w-full h-full object-cover" />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Selfie Verification</p>
                              <div className="aspect-[3/2] rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                 <img src={user.buyerFaceScanUrl!} className="w-full h-full object-cover" />
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                           <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100" onClick={() => approveBuyerMutation.mutate(user.id)}>Approve for Installments</Button>
                           <Button variant="outline" className="flex-1 border-2 border-red-100 text-red-500 hover:bg-red-50 h-14 rounded-2xl font-black uppercase text-xs" onClick={() => { setModItem({ id: user.id, type: 'user', action: 'reject', title: `${user.firstName} ${user.lastName}` }); setModModalOpen(true); }}>Reject</Button>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {pendingBuyerVerifications.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending buyer installment verifications.</p>}
          </TabsContent>

          <TabsContent value="pending-verifications" className="mt-0 space-y-6">
             <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingUsers.map(user => (
                  <Card key={user.id} className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                     <div className="p-8 space-y-8">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-white shadow-sm font-black text-primary uppercase">{user.firstName?.[0]}{user.lastName?.[0]}</div>
                              <div>
                                 <h4 className="font-black uppercase text-lg leading-tight">{user.firstName} {user.lastName}</h4>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</p>
                              </div>
                           </div>
                           <Badge className="bg-primary/20 text-primary-foreground border-none text-[8px] font-black uppercase">Seller ID Verification</Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ghana Card (Front)</p>
                              <div className="aspect-[3/2] rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                 <img src={user.idScanUrl!} className="w-full h-full object-cover" />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Selfie Verification</p>
                              <div className="aspect-[3/2] rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                 <img src={user.faceScanUrl!} className="w-full h-full object-cover" />
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                           <Button className="flex-1 bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-100" onClick={() => updateUserVerificationMutation.mutate({ userId: user.id, status: 'verified' })}>Approve Verification</Button>
                           <Button variant="outline" className="flex-1 border-2 border-red-100 text-red-500 hover:bg-red-50 h-14 rounded-2xl font-black uppercase text-xs" onClick={() => { setModItem({ id: user.id, type: 'user', action: 'reject', title: `${user.firstName} ${user.lastName}` }); setModModalOpen(true); }}>Reject</Button>
                        </div>
                     </div>
                  </Card>
                ))}
             </div>
             {pendingUsers.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending verifications.</p>}
          </TabsContent>

          <TabsContent value="inbox" className="mt-0"><InboxComponent /></TabsContent>
          
          {/* Other TabsContent items should go here if needed */}
          <TabsContent value="app-mgmt" className="mt-0 space-y-6">
             <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black uppercase tracking-tight italic">Campus Activity Feed</h3>
                   <div className="flex gap-2">
                      {/* Form for new activity would go here, for now just a list and simple inputs if state exists */}
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-100">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Post New Activity</h4>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                         <Input placeholder="Title" value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} className="h-12 rounded-xl border-2" />
                         <Input placeholder="Image URL (Optional)" value={newActivity.imageUrl} onChange={e => setNewActivity({...newActivity, imageUrl: e.target.value})} className="h-12 rounded-xl border-2" />
                      </div>
                      <Textarea placeholder="Content" value={newActivity.content} onChange={e => setNewActivity({...newActivity, content: e.target.value})} className="rounded-xl border-2 mb-4 min-h-[100px]" />
                      <div className="flex justify-end">
                         <Button className="bg-black text-white rounded-xl font-black uppercase text-[10px] px-8 h-12" onClick={() => createActivityMutation.mutate(newActivity)} disabled={!newActivity.title || !newActivity.content}>Post to Feed</Button>
                      </div>
                   </div>

                   <div className="grid gap-4">
                      {campusActivities.map(activity => (
                        <Card key={activity.id} className="rounded-2xl border-none bg-gray-50/50 p-6 flex justify-between items-center">
                           <div className="flex items-center gap-4">
                              {activity.imageUrl && <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"><img src={activity.imageUrl} className="w-full h-full object-cover" /></div>}
                              <div>
                                 <h5 className="font-black text-sm uppercase">{activity.title}</h5>
                                 <p className="text-xs text-gray-500 line-clamp-1">{activity.content}</p>
                              </div>
                           </div>
                           <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteActivityMutation.mutate(activity.id)}><XCircle className="w-4 h-4" /></Button>
                        </Card>
                      ))}
                   </div>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
             <div className="max-w-2xl">
                <Card className="rounded-[3rem] p-10 border-none shadow-sm bg-white">
                   <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">System Config.</h3>
                   <div className="space-y-8">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Admin MoMo Number</Label><Input value={adminMomoNumber} onChange={e => setAdminMomoNumber(e.target.value)} className="h-14 rounded-2xl border-2 text-xl font-black" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Admin Alert Email</Label><Input value={adminAlertEmail} onChange={e => setAdminAlertEmail(e.target.value)} className="h-14 rounded-2xl border-2 font-bold" /></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Support 1</Label><Input value={whatsappSupport1} onChange={e => setWhatsappSupport1(e.target.value)} className="h-12 rounded-xl border-2" /></div>
                         <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Support 2</Label><Input value={whatsappSupport2} onChange={e => setWhatsappSupport2(e.target.value)} className="h-12 rounded-xl border-2" /></div>
                      </div>
                      <Button className="w-full h-16 rounded-2xl font-black uppercase shadow-xl shadow-primary/20" onClick={() => {
                        saveConfigMutation.mutate({ key: 'admin_momo_number', value: adminMomoNumber });
                        saveConfigMutation.mutate({ key: 'admin_alert_email', value: adminAlertEmail });
                        saveConfigMutation.mutate({ key: 'whatsapp_support_1', value: whatsappSupport1 });
                        saveConfigMutation.mutate({ key: 'whatsapp_support_2', value: whatsappSupport2 });
                      }}>Save All Settings</Button>
                   </div>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={modModalOpen} onOpenChange={setModModalOpen}>
         <DialogContent className="max-w-md rounded-3xl border-none p-8">
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Review Hub</DialogTitle><DialogDescription className="font-bold">Provide feedback for {modItem?.title}</DialogDescription></DialogHeader>
            <div className="py-4 space-y-4">
               <Label className="text-[10px] font-black uppercase text-gray-400">Reason / Feedback</Label>
               <Textarea id="mod-feedback" placeholder="Detailed notes for the user..." className="rounded-2xl border-2 min-h-[100px]" />
            </div>
            <DialogFooter className="gap-2"><Button variant="outline" className="rounded-xl font-bold" onClick={() => setModModalOpen(false)}>Cancel</Button><Button variant="destructive" className="rounded-xl font-bold px-8" onClick={() => handleModAction((document.getElementById('mod-feedback') as HTMLTextAreaElement)?.value)}>Confirm Action</Button></DialogFooter>
         </DialogContent>
      </Dialog>
      
      <ProductForm isOpen={isProductModalOpen} onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }} userStores={[]} initialData={editingProduct} />

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
                 disabled={!rejectionReason || updateAdminOrderApprovalMutation.isPending || updateSellerApprovalMutation.isPending}
                 onClick={() => {
                   if (rejectingOrder.rejectionType === 'seller') {
                     updateSellerApprovalMutation.mutate({ 
                       orderId: rejectingOrder.id, 
                       approval: 'rejected', 
                       rejectionReason 
                     });
                   } else {
                     updateAdminOrderApprovalMutation.mutate({ 
                       orderId: rejectingOrder.id, 
                       status: 'rejected', 
                       rejectionReason 
                     });
                   }
                 }}
               >
                  {(updateAdminOrderApprovalMutation.isPending || updateSellerApprovalMutation.isPending) ? <Loader2 className="animate-spin" /> : "Decline Permanently"}
               </Button>
            </div>
         </DialogContent>
      </Dialog>

      <MagicImportModal isOpen={isMagicImportOpen} onClose={() => { setIsMagicImportOpen(false); setInitialMagicUrl(''); }} userStores={[]} initialUrl={initialMagicUrl} />

      {/* Weekly Deal / Flyer Creator Dialog */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
         <DialogContent className="max-w-4xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="grid lg:grid-cols-2">
               {/* Form Side */}
               <div className="p-10 space-y-8">
                  <DialogHeader>
                     <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic leading-none">Flyer Creator.</DialogTitle>
                     <DialogDescription className="font-bold text-gray-400">Design an AI-powered deal for the homepage carousel.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Product</Label>
                        <Select onValueChange={(val) => {
                          const id = parseInt(val);
                          setNewDeal({ ...newDeal, productId: id });
                          generateFlyerMutation.mutate(id);
                        }}>
                           <SelectTrigger className="h-12 rounded-xl border-2 font-bold"><SelectValue placeholder="Select a product" /></SelectTrigger>
                           <SelectContent className="rounded-xl border-none shadow-2xl">
                              {allProducts.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()} className="font-bold">{p.title}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount %</Label>
                           <Input type="number" value={newDeal.discountPercentage} onChange={e => setNewDeal({ ...newDeal, discountPercentage: parseInt(e.target.value) })} className="h-12 rounded-xl border-2 font-black" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Label</Label>
                           <Input value={newDeal.dealLabel} onChange={e => setNewDeal({ ...newDeal, dealLabel: e.target.value })} className="h-12 rounded-xl border-2 font-bold" />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Flyer Headline (AI Generated)</Label>
                        <Input value={(newDeal as any).flyerHeadline || ''} onChange={e => setNewDeal({ ...newDeal, flyerHeadline: e.target.value } as any)} className="h-12 rounded-xl border-2 font-black text-primary" placeholder="e.g. ULTIMATE GAMING SETUP" />
                     </div>

                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Flyer Subtext</Label>
                        <Textarea value={(newDeal as any).flyerSubtext || ''} onChange={e => setNewDeal({ ...newDeal, flyerSubtext: e.target.value } as any)} className="rounded-xl border-2 font-medium" placeholder="Short energy text..." />
                     </div>
                  </div>

                  <DialogFooter className="pt-4 gap-2">
                     <Button variant="outline" className="rounded-xl font-bold h-12" onClick={() => setDealModalOpen(false)}>Cancel</Button>
                     <Button className="flex-1 rounded-xl bg-black text-white font-black uppercase h-12 shadow-xl" onClick={() => createDealMutation.mutate(newDeal)}>Activate Flyer</Button>
                  </DialogFooter>
               </div>

               {/* Preview Side */}
               <div className="bg-gray-100 p-10 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)] opacity-50" />
                  
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 relative z-10">Live Preview (Homepage Carousel)</p>
                  
                  {/* Phone Shell for Preview */}
                  <div className="relative w-full max-w-[280px] aspect-[9/16] bg-[#1a1a1a] rounded-[3rem] p-2 shadow-2xl border-[8px] border-[#222] overflow-hidden z-10">
                     <div className="relative h-full w-full bg-white rounded-[2.4rem] overflow-hidden flex flex-col">
                        <div className="h-full w-full relative">
                           {/* Background Image */}
                           {newDeal.productId ? (
                             <>
                               <img src={allProducts.find(p => p.id === newDeal.productId)?.images?.[0]} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                               
                               <div className="absolute bottom-0 left-0 w-full p-6 text-white text-left">
                                  <Badge className="bg-primary text-black font-black text-[7px] uppercase px-2 py-0.5 rounded-full mb-3">{newDeal.dealLabel}</Badge>
                                  <h4 className="text-xl font-black uppercase leading-tight mb-2 tracking-tighter">{(newDeal as any).flyerHeadline || "Ready for Headline"}</h4>
                                  <p className="text-[10px] font-bold text-gray-300 leading-snug mb-4">{(newDeal as any).flyerSubtext || "Select a product to generate AI promotional text."}</p>
                                  <div className="flex items-center gap-2 mb-4">
                                     <span className="text-2xl font-black text-primary">GH₵{Math.round(parseFloat(allProducts.find(p => p.id === newDeal.productId)?.price || '0') * (1 - newDeal.discountPercentage/100))}</span>
                                     <span className="text-white/40 line-through text-xs">GH₵{allProducts.find(p => p.id === newDeal.productId)?.price}</span>
                                  </div>
                                  <Button className="w-full h-11 rounded-xl bg-white text-black font-black uppercase text-[9px] tracking-widest pointer-events-none">Grab Deal Now</Button>
                               </div>
                             </>
                           ) : (
                             <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300 font-bold text-xs uppercase px-10 text-center">
                                Select a product to see the flyer preview
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
