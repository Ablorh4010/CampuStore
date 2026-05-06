import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, XCircle, AlertCircle, Trash2, Store as StoreIcon, 
  Package, User as UserIcon, Phone, MapPin, Eye, ExternalLink, 
  Settings, Plus, Tag, Mail, Loader2, RefreshCcw, ShieldAlert, 
  Video, Users as UsersIcon, DollarSign, Activity, Zap, Globe, Newspaper, Smartphone, Sparkles, MessageCircle, Menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InboxComponent from '@/components/chat/InboxComponent';
import ProductForm from '@/components/modals/product-form';
import MagicImportModal from '@/components/modals/magic-import-modal';
import type { ProductWithStore, StoreWithUser, Category, User, WeeklyDealWithProduct, CampusActivityWithUser, OrderWithDetails, Store } from '@shared/schema';

export default function AdminDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStore | null>(null);
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [initialMagicUrl, setInitialMagicUrl] = useState('');

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
  const [newDeal, setNewDeal] = useState({ productId: 0, discountPercentage: 10, dealLabel: 'Flash Deal', isActive: true, displayOrder: 0 });

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
    mutationFn: ({ orderId, status, estimatedDeliveryDate }: { orderId: number; status: string; estimatedDeliveryDate: string }) =>
      apiRequest('PUT', `/api/admin/orders/${orderId}/approval`, { status, estimatedDeliveryDate }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/pending'] }); toast({ title: 'Success' }); },
  });

  const updateSellerApprovalMutation = useMutation({
    mutationFn: async ({ orderId, approval }: { orderId: number, approval: string }) => {
      await apiRequest('PUT', `/api/orders/${orderId}/seller-approval`, { approval });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/pending'] }); toast({ title: 'Seller Approved' }); },
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

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type, feedback }: { id: number; type: 'product' | 'store' | 'user'; feedback: string }) => {
      return apiRequest('DELETE', `/api/admin/${type}s/${id}`, { feedback });
    },
    onSuccess: () => {
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
            
            <div className="grid lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                  <h3 className="text-xl font-black uppercase mb-6 tracking-tight">Recent Onboarding</h3>
                  <div className="space-y-4">
                     {allUsers.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                           <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-black text-primary text-sm uppercase">{u.username[0]}</div><div><p className="font-black text-sm uppercase leading-none mb-1">{u.username}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{u.email}</p></div></div>
                           <Badge className="rounded-lg text-[9px] font-black uppercase tracking-widest">{u.userType}</Badge>
                        </div>
                     ))}
                  </div>
               </Card>
               <Card className="rounded-[3rem] bg-primary p-8 border-none shadow-2xl relative overflow-hidden text-white flex flex-col justify-end min-h-[300px]">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-40 h-42" /></div>
                  <h3 className="text-3xl font-black uppercase leading-none mb-4">System <br />Status.</h3>
                  <div className="space-y-3 relative z-10">
                     <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl p-3"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div><p className="text-[10px] font-black uppercase tracking-widest">GCP Instance Live</p></div>
                     <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl p-3"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div><p className="text-[10px] font-black uppercase tracking-widest">Neon DB Connected</p></div>
                  </div>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="pending-products" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.filter(p => p.approvalStatus === 'pending').map(product => (
                  <Card key={product.id} className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                    <div className="aspect-[4/3] bg-gray-100 relative"><img src={(product.images?.[0] && product.images[0] !== 'uploaded') ? product.images[0] : '/placeholder-product.png'} className="w-full h-full object-cover" alt="" /></div>
                    <CardContent className="p-8">
                       <h4 className="font-black text-sm uppercase mb-2 truncate">{product.title}</h4>
                       <div className="flex gap-2">
                          <Button className="flex-grow rounded-xl bg-green-500 hover:bg-green-600 font-black uppercase text-[10px]" onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'approved' })}>Approve</Button>
                          <Button variant="destructive" className="flex-grow rounded-xl font-black uppercase text-[10px]" onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'rejected' })}>Reject</Button>
                       </div>
                    </CardContent>
                  </Card>
                ))}
                {allProducts.filter(p => p.approvalStatus === 'pending').length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending items.</p>}
             </div>
          </TabsContent>

          <TabsContent value="pending-verifications" className="mt-0">
             <div className="space-y-6">
                {pendingUsers.map(u => (
                  <Card key={u.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <div><h4 className="font-black text-2xl tracking-tighter uppercase">{u.firstName} {u.lastName}</h4><p className="text-sm font-bold text-primary uppercase tracking-widest">{u.sellerVerificationType || 'STUDENT'} VERIFICATION</p></div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="space-y-1"><p className="font-black text-gray-400 uppercase">Email</p><p className="font-bold">{u.email}</p></div>
                             <div className="space-y-1"><p className="font-black text-gray-400 uppercase">WhatsApp</p><p className="font-bold text-green-600">{u.phoneNumber}</p></div>
                             <div className="space-y-1"><p className="font-black text-gray-400 uppercase">ID Type</p><p className="font-bold uppercase">{u.idType?.replace(/_/g, ' ') || 'NATIONAL ID'}</p></div>
                             <div className="space-y-1"><p className="font-black text-gray-400 uppercase">DOB</p><p className="font-bold">{u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : 'N/A'}</p></div>
                          </div>
                          <div className="flex gap-2 pt-4">
                             <Button className="flex-grow rounded-xl bg-green-600 hover:bg-green-700 font-bold" onClick={() => updateUserVerificationMutation.mutate({ userId: u.id, status: 'verified' })}>Approve</Button>
                             <Button variant="outline" className="flex-grow rounded-xl border-amber-200 text-amber-700 font-bold" onClick={() => { setModItem({ id: u.id, type: 'user', action: 'needs_correction', title: u.username }); setModModalOpen(true); }}>Correction</Button>
                             <Button variant="destructive" className="flex-grow rounded-xl font-bold" onClick={() => { setModItem({ id: u.id, type: 'user', action: 'reject', title: u.username }); setModModalOpen(true); }}>Reject</Button>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center">ID Photo</p><img src={u.idScanUrl!} className="aspect-[4/3] rounded-xl object-cover cursor-pointer" onClick={() => window.open(u.idScanUrl!, '_blank')} alt="" /></div>
                          <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center">Face Scan</p><img src={u.faceScanUrl!} className="aspect-[4/3] rounded-xl object-cover cursor-pointer" onClick={() => window.open(u.faceScanUrl!, '_blank')} alt="" /></div>
                       </div>
                    </div>
                  </Card>
                ))}
                {pendingUsers.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending verifications.</p>}
             </div>
          </TabsContent>

          <TabsContent value="pending-stores" className="mt-0">
             <div className="space-y-6">
                {pendingStores.map(store => (
                  <Card key={store.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                       <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                             {store.logoUrl ? <img src={store.logoUrl} className="w-full h-full object-cover" alt="" /> : <StoreIcon className="w-10 h-10 text-gray-200" />}
                          </div>
                          <div>
                             <h4 className="font-black text-2xl uppercase tracking-tighter">{store.name}</h4>
                             <p className="text-sm font-bold text-gray-400 mb-2 uppercase">{store.university} • {store.city}</p>
                             <p className="text-sm font-medium text-gray-600 max-w-xl">{store.description}</p>
                          </div>
                       </div>
                       <div className="flex flex-col gap-2 w-full md:w-auto">
                          <Button className="rounded-xl bg-green-500 hover:bg-green-600 font-bold" onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'approved' })}>Approve Store</Button>
                          <Button variant="outline" className="rounded-xl border-amber-200 text-amber-700 font-bold" onClick={() => { setModItem({ id: store.id, type: 'store', action: 'reject', title: store.name }); setModModalOpen(true); }}>Needs Info</Button>
                          <Button variant="destructive" className="rounded-xl font-bold" onClick={() => { if(confirm(`Permanently delete store ${store.name}?`)) deleteItemMutation.mutate({ id: store.id, type: 'store', feedback: 'Store removed by admin' }); }}>Delete Store</Button>
                       </div>
                    </div>
                  </Card>
                ))}
                {pendingStores.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending store reviews.</p>}
             </div>
          </TabsContent>

          <TabsContent value="product-mgmt" className="mt-0">
             <div className="flex justify-between items-center mb-8">
                <div><h3 className="text-3xl font-black uppercase tracking-tighter">Live Catalog.</h3><p className="font-bold text-gray-400">Manage all items across the platform.</p></div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest" onClick={() => setIsMagicImportOpen(true)}><Sparkles className="w-6 h-6 mr-2" /> Magic Import</Button>
                  <Button className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest" onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}><Plus className="w-6 h-6 mr-2" /> Launch Official</Button>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.filter(p => ['approved', 'archived'].includes(p.approvalStatus)).map(product => (
                  <Card key={product.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                    <div className="aspect-[4/3] bg-gray-100 relative"><img src={(product.images?.[0] && product.images[0] !== 'uploaded') ? product.images[0] : '/placeholder-product.png'} className="w-full h-full object-cover" alt="" /></div>
                    <CardContent className="p-6">
                       <h4 className="font-black text-sm uppercase mb-1">{product.title}</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Store: {product.store.name}</p>
                       <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="rounded-lg h-9 font-black text-[9px] uppercase" onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}>Edit</Button>
                          <Button variant="destructive" className="rounded-lg h-9 font-black text-[9px] uppercase" onClick={() => { setModItem({ id: product.id, type: 'product', action: 'delete', title: product.title }); setModModalOpen(true); }}>Delete</Button>
                       </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="app-mgmt" className="mt-0 space-y-12">
             <div className="grid lg:grid-cols-2 gap-10">
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden flex flex-col">
                   <CardHeader className="bg-primary/5 p-8 border-b"><CardTitle className="text-2xl font-black uppercase">Category Hub</CardTitle></CardHeader>
                   <CardContent className="p-8 flex-1">
                      <div className="space-y-6">
                         <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-gray-100">
                            <Input className="rounded-xl border-2 font-bold" placeholder="New Category Name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} />
                            <Button className="w-full h-12 rounded-xl font-black shadow-lg" disabled={!newCategory.name} onClick={() => createCategoryMutation.mutate(newCategory)}>Create Category</Button>
                         </div>
                         <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                               {categories.filter(c => !c.parentId).map(c => (
                                  <div key={c.id} className="flex justify-between items-center p-3 bg-white border-2 border-primary/5 rounded-xl">
                                     <span className="font-black text-xs uppercase">{c.name}</span>
                                     <Button variant="ghost" size="icon" onClick={() => deleteCategoryMutation.mutate(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                                  </div>
                               ))}
                            </div>
                         </ScrollArea>
                      </div>
                   </CardContent>
                </Card>
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden flex flex-col">
                   <CardHeader className="bg-primary/5 p-8 border-b"><CardTitle className="text-2xl font-black uppercase">Campus Pulse</CardTitle></CardHeader>
                   <CardContent className="p-8 flex-1">
                      <div className="space-y-6">
                         <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-gray-100">
                            <Input className="rounded-xl border-2 font-bold" placeholder="Title" value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} />
                            <Textarea className="rounded-xl border-2 font-medium" placeholder="Content" value={newActivity.content} onChange={e => setNewActivity({...newActivity, content: e.target.value})} />
                            <Button className="w-full h-12 rounded-xl font-black shadow-lg" onClick={() => createActivityMutation.mutate(newActivity)}>Publish to Pulse</Button>
                         </div>
                         <ScrollArea className="h-[240px] pr-4">
                            <div className="space-y-2">
                               {campusActivities.map(act => (
                                  <div key={act.id} className="p-3 border-2 border-gray-50 rounded-xl flex justify-between items-center">
                                     <span className="font-black text-[10px] uppercase truncate pr-4">{act.title}</span>
                                     <Button variant="ghost" size="icon" onClick={() => deleteActivityMutation.mutate(act.id)}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                               ))}
                            </div>
                         </ScrollArea>
                      </div>
                   </CardContent>
                </Card>
             </div>
             <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-primary/5 p-8 border-b"><CardTitle className="text-2xl font-black uppercase">Weekly Flash Deals</CardTitle></CardHeader>
                <CardContent className="p-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {weeklyDeals.map(deal => (
                         <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                            <div className="flex items-center gap-4"><img src={deal.product.images[0]} className="w-12 h-12 rounded-lg object-cover" alt="" /><p className="font-black text-xs uppercase truncate">{deal.product.title}</p></div>
                            <Button variant="ghost" size="icon" onClick={() => deleteDealMutation.mutate(deal.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                         </div>
                      ))}
                      <Button variant="outline" className="aspect-[2/1] rounded-2xl border-2 border-dashed flex flex-col gap-2 font-black uppercase text-[10px] text-gray-400" onClick={() => setDealModalOpen(true)}><Plus className="w-6 h-6" /> Add Deal</Button>
                   </div>
                </CardContent>
             </Card>
          </TabsContent>
          
          <TabsContent value="users-mgmt" className="mt-0">
             <div className="flex justify-between items-center mb-8">
                <div><h3 className="text-3xl font-black uppercase tracking-tighter">User Base.</h3><p className="font-bold text-gray-400">Total verified and registered members.</p></div>
             </div>
             <div className="space-y-4">
                {allUsers.map(u => (
                  <Card key={u.id} className="rounded-3xl border-none shadow-sm bg-white p-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-primary uppercase">{u.username[0]}</div>
                          <div>
                             <p className="font-black text-sm uppercase leading-none mb-1">{u.firstName} {u.lastName} ({u.username})</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{u.email} • {u.userType}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          {u.id !== user.id && (
                             <Button 
                               variant="destructive" 
                               className="rounded-xl h-10 font-black text-[9px] uppercase"
                               onClick={() => { if(confirm(`Delete user ${u.username}?`)) deleteItemMutation.mutate({ id: u.id, type: 'user', feedback: 'Account removed by admin' }); }}
                             >
                               Delete Account
                             </Button>
                          )}
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="pending-orders" className="mt-0 space-y-6">
             {pendingOrders.map(order => (
               <Card key={order.id} className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="flex items-start gap-6">
                        <img src={order.product.images?.[0] || '/placeholder.png'} className="w-24 h-24 rounded-[2rem] object-cover shadow-md" alt="" />
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
                             <Button className="w-full rounded-2xl bg-black text-white font-black uppercase text-[10px] h-14 shadow-xl" onClick={() => updateSellerApprovalMutation.mutate({ orderId: order.id, approval: 'approved' })}>Hub Store Approval</Button>
                           ) : (
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <Label className="text-[9px] font-black uppercase text-gray-400">Est. Delivery Date</Label>
                                   <Input type="date" className="h-12 rounded-xl border-2 font-bold" onChange={(e) => (order as any).tempDate = e.target.value} />
                                </div>
                                <Button className="w-full bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-200" onClick={() => updateAdminOrderApprovalMutation.mutate({ orderId: order.id, status: 'approved', estimatedDeliveryDate: (order as any).tempDate })}>Final Release</Button>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingOrders.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase text-xs">No pending orders.</p>}
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
          
          <TabsContent value="installment-approvals" className="mt-0 space-y-6">
             {pendingBuyerVerifications.map(u => (
               <Card key={u.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div><h4 className="font-black text-2xl tracking-tighter uppercase">{u.firstName} {u.lastName}</h4><p className="text-sm font-bold text-primary uppercase tracking-widest">BUYER INSTALLMENT VERIFICATION</p></div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                           <div className="space-y-1"><p className="font-black text-gray-400 uppercase">Email</p><p className="font-bold">{u.email}</p></div>
                           <div className="space-y-1"><p className="font-black text-gray-400 uppercase">Phone</p><p className="font-bold">{u.phoneNumber}</p></div>
                        </div>
                        <div className="flex gap-2 pt-4">
                           <Button className="flex-grow rounded-xl bg-black text-white font-bold h-12 shadow-lg shadow-black/10" onClick={() => approveBuyerMutation.mutate(u.id)} disabled={approveBuyerMutation.isPending}>{approveBuyerMutation.isPending ? <Loader2 className="animate-spin" /> : "Approve Plan"}</Button>
                           <Button variant="outline" className="flex-grow rounded-xl font-bold border-2 h-12">Reject</Button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" /> Buyer ID Scan</p><div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group"><img src={u.buyerIdScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerIdScanUrl!, '_blank')} alt="" /></div></div>
                        <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center flex items-center justify-center gap-1"><Video className="w-3 h-3" /> Live Face Scan</p><div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group"><img src={u.buyerFaceScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerFaceScanUrl!, '_blank')} alt="" /></div></div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingBuyerVerifications.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending installment approvals.</p>}
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
          </TabsContent>
          
          <TabsContent value="installment-approvals" className="mt-0 space-y-6">
             {pendingBuyerVerifications.map(u => (
               <Card key={u.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div><h4 className="font-black text-2xl tracking-tighter uppercase">{u.firstName} {u.lastName}</h4><p className="text-sm font-bold text-primary uppercase tracking-widest">BUYER INSTALLMENT VERIFICATION</p></div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                           <div className="space-y-1"><p className="font-black text-gray-400 uppercase">Email</p><p className="font-bold">{u.email}</p></div>
                           <div className="space-y-1"><p className="font-black text-gray-400 uppercase">Phone</p><p className="font-bold">{u.phoneNumber}</p></div>
                        </div>
                        <div className="flex gap-2 pt-4">
                           <Button className="flex-grow rounded-xl bg-black text-white font-bold h-12 shadow-lg shadow-black/10" onClick={() => approveBuyerMutation.mutate(u.id)} disabled={approveBuyerMutation.isPending}>{approveBuyerMutation.isPending ? <Loader2 className="animate-spin" /> : "Approve Plan"}</Button>
                           <Button variant="outline" className="flex-grow rounded-xl font-bold border-2 h-12">Reject</Button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" /> Buyer ID Scan</p><div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group"><img src={u.buyerIdScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerIdScanUrl!, '_blank')} alt="" /></div></div>
                        <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 text-center flex items-center justify-center gap-1"><Video className="w-3 h-3" /> Live Face Scan</p><div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group"><img src={u.buyerFaceScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerFaceScanUrl!, '_blank')} alt="" /></div></div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingBuyerVerifications.length === 0 && <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending installment approvals.</p>}
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

          <TabsContent value="inbox" className="mt-0"><InboxComponent /></TabsContent>
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
      <MagicImportModal isOpen={isMagicImportOpen} onClose={() => { setIsMagicImportOpen(false); setInitialMagicUrl(''); }} userStores={[]} initialUrl={initialMagicUrl} />
    </div>
  );
}
