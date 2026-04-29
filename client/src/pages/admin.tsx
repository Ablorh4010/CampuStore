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
  Video, Users as UsersIcon, DollarSign, Activity, Zap, Globe, Newspaper, Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProductWithStore, StoreWithUser, Category, User, WeeklyDealWithProduct, CampusActivityWithUser, OrderWithDetails } from '@shared/schema';

export default function AdminDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Category management state
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', color: '#6366f1' });

  // Weekly Deals management state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ productId: 0, discountPercentage: 10, dealLabel: 'Flash Deal', isActive: true, displayOrder: 0 });

  // Campus Activity state
  const [newActivity, setNewActivity] = useState({ title: '', content: '', source: 'internal', activityType: 'news', imageUrl: '' });

  // Deletion/Suspension feedback state
  const [modModalOpen, setModModalOpen] = useState(false);
  const [modItem, setModItem] = useState<{ id: number; type: 'product' | 'store' | 'user' | 'deal' | 'activity'; action: 'delete' | 'reject' | 'suspend'; title: string } | null>(null);
  const [adminMomoNumber, setAdminMomoNumber] = useState('');

  const { data: configData } = useQuery<{ value: string }>({
    queryKey: ['/api/admin/config/admin_momo_number'],
    enabled: !!user?.isAdmin,
  });

  useEffect(() => {
    if (configData?.value) {
      setAdminMomoNumber(configData.value);
    }
  }, [configData]);

  const saveConfigMutation = useMutation({
    mutationFn: (data: { key: string, value: string }) =>
      apiRequest('POST', '/api/admin/config', data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Configuration saved' });
    },
  });
  const [adminFeedback, setAdminFeedback] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const handleLogout = async () => {
    await logout();
    setLocation('/admin-portal');
  };

  // Queries
  const { data: analytics } = useQuery<{
    totalUsers: number;
    totalStores: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  }>({
    queryKey: ['/api/admin/analytics'],
    enabled: !!user?.isAdmin
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user?.isAdmin
  });

  const { data: allProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/admin/products'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingStores = [] } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/admin/stores/pending'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users/pending-verification'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingLogos = [] } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/admin/logo-changes'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingOrders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/admin/orders/pending'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingPayouts = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/admin/payouts/pending'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingBuyerVerifications = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users/pending-buyer-verification'],
    enabled: !!user?.isAdmin
  });

  const { data: allStores = [] } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isAdmin
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user?.isAdmin
  });

  const { data: weeklyDeals = [], refetch: refetchDeals } = useQuery<WeeklyDealWithProduct[]>({
    queryKey: ['/api/admin/weekly-deals'],
    enabled: !!user?.isAdmin
  });

  const { data: campusActivities = [], refetch: refetchActivities } = useQuery<CampusActivityWithUser[]>({
    queryKey: ['/api/admin/campus-activity'],
    enabled: !!user?.isAdmin
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      refetchCategories();
      setNewCategory({ name: '', icon: '📦', color: '#6366f1' });
      toast({ title: 'Category Created' });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/categories/${id}`),
    onSuccess: () => {
      refetchCategories();
      toast({ title: 'Category Removed' });
    }
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/admin/weekly-deals', data),
    onSuccess: () => {
      refetchDeals();
      setDealModalOpen(false);
      toast({ title: 'Weekly Deal Created' });
    }
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/weekly-deals/${id}`),
    onSuccess: () => {
      refetchDeals();
      toast({ title: 'Deal Removed' });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/admin/campus-activity', data),
    onSuccess: () => {
      refetchActivities();
      setNewActivity({ title: '', content: '', source: 'internal', activityType: 'news', imageUrl: '' });
      toast({ title: 'Activity Post Published' });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/campus-activity/${id}`),
    onSuccess: () => {
      refetchActivities();
      toast({ title: 'Activity Post Removed' });
    }
  });

  const updateProductStatusMutation = useMutation({
    mutationFn: ({ productId, status, feedback }: { productId: number; status: string; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/products/${productId}/approval`, { status, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Success', description: 'Product status updated' });
    },
  });

  const updateStoreStatusMutation = useMutation({
    mutationFn: ({ storeId, status, feedback }: { storeId: number; status: string; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/stores/${storeId}/approval`, { status, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: 'Success', description: 'Store status updated' });
    },
  });

  const updateUserVerificationMutation = useMutation({
    mutationFn: ({ userId, status, feedback }: { userId: number; status: string; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/users/${userId}/verify`, { status, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending-verification'] });
      toast({ title: 'Success', description: 'User verification updated' });
    },
  });

  const approveBuyerMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest('PUT', `/api/admin/users/${userId}/approve-buyer`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending-buyer-verification'] });
      toast({ title: 'Success', description: 'Buyer installment plan approved' });
    },
  });

  const updateLogoStatusMutation = useMutation({
    mutationFn: ({ storeId, status }: { storeId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/stores/${storeId}/logo-approval`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/logo-changes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: 'Success', description: 'Logo status updated' });
    },
  });

  const updateAdminOrderApprovalMutation = useMutation({
    mutationFn: ({ orderId, status, estimatedDeliveryDate }: { orderId: number; status: string; estimatedDeliveryDate: string }) =>
      apiRequest('PUT', `/api/admin/orders/${orderId}/approval`, { status, estimatedDeliveryDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/pending'] });
      toast({ title: 'Success', description: 'Order approved and notifications sent' });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/orders/${orderId}/payout`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts/pending'] });
      toast({ title: 'Success', description: 'Payout processed' });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type, feedback }: { id: number; type: 'product' | 'store' | 'user'; feedback: string }) => {
      return apiRequest('DELETE', `/api/admin/${type}s/${id}`, { feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: 'Item Deleted' });
      setModModalOpen(false);
      setModItem(null);
    },
  });

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  
  if (!user || !user.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Admin Portal</h1>
            <p className="text-xl text-gray-500 font-medium">Platform Management Hub</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="rounded-xl border-2 font-black text-red-500 border-red-100 hover:bg-red-50" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border overflow-x-auto w-full md:w-auto">
            <TabsTrigger value="overview" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="pending-products" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Pending Items
            </TabsTrigger>
            <TabsTrigger value="pending-stores" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Pending Stores
            </TabsTrigger>
            <TabsTrigger value="pending-verifications" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Sellers Verification
            </TabsTrigger>
            <TabsTrigger value="pending-logos" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Logo Changes
            </TabsTrigger>
            <TabsTrigger value="pending-orders" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Pending Orders
            </TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Payouts
            </TabsTrigger>
            <TabsTrigger value="installment-approvals" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              Installment Approvals
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              App Settings
            </TabsTrigger>
            <TabsTrigger value="app-mgmt" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2">
              <Settings className="w-4 h-4" /> App Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', val: analytics?.totalUsers || 0, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'Live Stores', val: analytics?.totalStores || 0, icon: StoreIcon, color: 'text-purple-600', bg: 'bg-purple-100' },
                { label: 'Listings', val: analytics?.totalProducts || 0, icon: Package, color: 'text-amber-600', bg: 'bg-amber-100' },
                { label: 'Revenue', val: `GH₵${analytics?.totalRevenue || 0}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' }
              ].map((stat, i) => (
                <Card key={i} className="rounded-3xl border-none shadow-sm overflow-hidden">
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

            <div className="grid lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                <CardTitle className="text-xl font-black uppercase mb-6">Recent Users</CardTitle>
                <div className="space-y-4">
                  {allUsers.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <Badge variant={u.isAdmin ? "default" : "outline"}>
                        {u.isAdmin ? 'Admin' : 'User'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[2.5rem] bg-black text-white p-8 border-none shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">System Alerts</h3>
                <div className="space-y-4 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <p className="text-xs font-bold uppercase tracking-widest">{pendingUsers.length} Pending Verifications</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <p className="text-xs font-bold uppercase tracking-widest">{pendingStores.length} Pending Stores</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pending-products" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.filter(p => p.approvalStatus === 'pending').map(product => (
                  <Card key={product.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                    <div className="aspect-[4/3] bg-gray-100 relative">
                       <img src={product.images[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <CardContent className="p-6">
                       <h4 className="font-black text-sm uppercase mb-2">{product.title}</h4>
                       <p className="text-xs text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                       <div className="flex gap-2">
                          <Button 
                            className="flex-grow rounded-xl bg-green-500 hover:bg-green-600 font-bold" 
                            onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="flex-grow rounded-xl font-bold"
                            onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'rejected' })}
                          >
                            Reject
                          </Button>
                       </div>
                    </CardContent>
                  </Card>
                ))}
                {allProducts.filter(p => p.approvalStatus === 'pending').length === 0 && (
                   <p className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending items.</p>
                )}
             </div>
          </TabsContent>

          <TabsContent value="pending-stores" className="mt-0">
             <div className="space-y-6">
                {pendingStores.map(store => (
                  <Card key={store.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                       <div className="flex gap-6">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                             <img src={store.logoUrl || '/placeholder-logo.png'} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>
                             <h4 className="font-black text-xl uppercase tracking-tighter">{store.name}</h4>
                             <p className="text-sm font-medium text-gray-500 mb-2">{store.university} • {store.city}</p>
                             <p className="text-xs text-gray-400 line-clamp-2 max-w-xl">{store.description}</p>
                          </div>
                       </div>
                       <div className="flex flex-col gap-2 min-w-[200px]">
                          <Button 
                            className="w-full rounded-xl bg-green-500 hover:bg-green-600 font-bold" 
                            onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'approved' })}
                          >
                            Approve Store
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="w-full rounded-xl font-bold"
                            onClick={() => {
                              setModItem({ id: store.id, type: 'store', action: 'reject', title: store.name });
                              setModModalOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                       </div>
                    </div>
                  </Card>
                ))}
                {pendingStores.length === 0 && (
                   <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending stores.</p>
                )}
             </div>
          </TabsContent>

          <TabsContent value="pending-verifications" className="mt-0">
             <div className="space-y-6">
                {pendingUsers.map(u => (
                  <Card key={u.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <div>
                             <h4 className="font-black text-2xl tracking-tighter uppercase">{u.firstName} {u.lastName}</h4>
                             <p className="text-sm font-bold text-primary uppercase tracking-widest">{u.sellerVerificationType || 'STUDENT'} VERIFICATION</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="space-y-1">
                                <p className="font-black text-gray-400 uppercase">Email</p>
                                <p className="font-bold">{u.email}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="font-black text-gray-400 uppercase">WhatsApp</p>
                                <p className="font-bold text-green-600">{u.whatsappBusinessNumber || u.phoneNumber}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="font-black text-gray-400 uppercase">ID Type</p>
                                <p className="font-bold uppercase">{u.idType?.replace(/_/g, ' ') || 'NATIONAL ID'}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="font-black text-gray-400 uppercase">Location</p>
                                <p className="font-bold">{u.sellerLatitude}, {u.sellerLongitude}</p>
                             </div>
                          </div>
                          
                          <div className="space-y-1">
                             <p className="text-xs font-black text-gray-400 uppercase">Address</p>
                             <p className="text-sm font-medium">{u.sellerAddress || 'Not provided'}</p>
                          </div>

                          <div className="flex gap-2 pt-4">
                             <Button 
                               className="flex-grow rounded-xl bg-green-500 hover:bg-green-600 font-bold" 
                               onClick={() => updateUserVerificationMutation.mutate({ userId: u.id, status: 'verified' })}
                             >
                               Approve Seller
                             </Button>
                             <Button 
                               variant="destructive" 
                               className="flex-grow rounded-xl font-bold"
                               onClick={() => {
                                 setModItem({ id: u.id, type: 'user', action: 'reject', title: `${u.firstName} ${u.lastName}` });
                                 setModModalOpen(true);
                               }}
                             >
                               Reject
                             </Button>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">ID Front</p>
                             <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                <img src={u.idScanUrl!} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(u.idScanUrl!, '_blank')} alt="" />
                             </div>
                          </div>
                          {u.idScanUrlBack && (
                            <div className="space-y-2">
                               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">ID Back</p>
                               <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                  <img src={u.idScanUrlBack} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(u.idScanUrlBack!, '_blank')} alt="" />
                               </div>
                            </div>
                          )}
                          <div className="space-y-2">
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Face Scan</p>
                             <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                                <img src={u.faceScanUrl!} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(u.faceScanUrl!, '_blank')} alt="" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </Card>
                ))}
                {pendingUsers.length === 0 && (
                   <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending verifications.</p>
                )}
             </div>
          </TabsContent>

          <TabsContent value="pending-logos" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingLogos.map(store => (
                  <Card key={store.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                    <CardContent className="p-6 space-y-4">
                       <h4 className="font-black text-sm uppercase text-center">{store.name}</h4>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-gray-400 text-center">Current</p>
                             <div className="aspect-square rounded-xl overflow-hidden border">
                                <img src={store.logoUrl || '/placeholder-logo.png'} className="w-full h-full object-cover" alt="" />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-primary text-center">New Request</p>
                             <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary/20">
                                <img src={store.pendingLogoUrl!} className="w-full h-full object-cover" alt="" />
                             </div>
                          </div>
                       </div>

                       <div className="flex gap-2">
                          <Button 
                            className="flex-grow rounded-xl bg-green-500 hover:bg-green-600 font-bold" 
                            onClick={() => updateLogoStatusMutation.mutate({ storeId: store.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="flex-grow rounded-xl font-bold"
                            onClick={() => updateLogoStatusMutation.mutate({ storeId: store.id, status: 'rejected' })}
                          >
                            Reject
                          </Button>
                       </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingLogos.length === 0 && (
                   <p className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending logo changes.</p>
                )}
             </div>
          </TabsContent>

          <TabsContent value="pending-orders" className="mt-0 space-y-6">
             {pendingOrders.map(order => (
               <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="flex gap-6">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border">
                           <img src={order.product.images[0]} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                           <h4 className="font-black text-lg uppercase">{order.product.title}</h4>
                           <p className="text-sm font-bold text-primary">Seller: {order.seller.firstName} • Buyer: {order.buyer.firstName}</p>
                           <p className="text-xs text-gray-400 mt-1">Amount: GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="space-y-4 min-w-[300px]">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Expected Delivery Date</label>
                           <Input 
                             type="date" 
                             className="h-10 rounded-xl" 
                             onChange={(e) => (order as any).tempDeliveryDate = e.target.value}
                           />
                        </div>
                        <div className="flex gap-2">
                           <Button 
                             className="flex-grow rounded-xl bg-green-500 font-bold"
                             onClick={() => {
                               const date = (order as any).tempDeliveryDate;
                               if (!date) {
                                 toast({ title: "Date Required", description: "Please set an expected delivery date.", variant: "destructive" });
                                 return;
                               }
                               updateAdminOrderApprovalMutation.mutate({ orderId: order.id, status: 'approved', estimatedDeliveryDate: date });
                             }}
                           >
                             Final Approve
                           </Button>
                           <Button variant="destructive" className="flex-grow rounded-xl font-bold">Reject</Button>
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingOrders.length === 0 && (
                <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending order approvals.</p>
             )}
          </TabsContent>

          <TabsContent value="payouts" className="mt-0 space-y-6">
             {pendingPayouts.map(order => (
               <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8 border-l-4 border-green-500">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="space-y-4">
                        <div>
                           <h4 className="font-black text-lg uppercase">Payout for Order #{order.id}</h4>
                           <p className="text-sm font-bold text-gray-500">{order.seller.firstName} {order.seller.lastName} • {order.seller.email}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                           <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Seller Payment Info</p>
                           {/* Using type casting here as User model fields are mapped differently in schema */}
                           <p className="text-xs font-bold">Bank: {(order as any).seller.bankName || 'N/A'}</p>
                           <p className="text-xs font-bold">Acc: {(order as any).seller.bankAccountNumber || 'N/A'}</p>
                           <p className="text-xs font-bold">Momo: {(order as any).seller.mobileMoneyPhone || 'N/A'}</p>
                        </div>
                     </div>
                     <div className="text-right space-y-4">
                        <div>
                           <p className="text-[10px] font-black uppercase text-gray-400">Payout Amount</p>
                           <p className="text-3xl font-black text-green-600">GH₵{parseFloat(order.totalAmount).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                           <Button 
                             className="rounded-xl bg-black text-white font-bold px-8 h-12"
                             onClick={() => processPayoutMutation.mutate({ orderId: order.id, status: 'processed' })}
                           >
                             Mark as Processed
                           </Button>
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingPayouts.length === 0 && (
                <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending payouts.</p>
             )}
          </TabsContent>

          <TabsContent value="installment-approvals" className="mt-0 space-y-6">
             {pendingBuyerVerifications.map(u => (
               <Card key={u.id} className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div>
                           <h4 className="font-black text-2xl tracking-tighter uppercase">{u.firstName} {u.lastName}</h4>
                           <p className="text-sm font-bold text-primary uppercase tracking-widest">BUYER INSTALLMENT VERIFICATION</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                           <div className="space-y-1">
                              <p className="font-black text-gray-400 uppercase">Email</p>
                              <p className="font-bold">{u.email}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-black text-gray-400 uppercase">Phone</p>
                              <p className="font-bold">{u.phoneNumber}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-black text-gray-400 uppercase">University</p>
                              <p className="font-bold uppercase">{u.university || 'N/A'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-black text-gray-400 uppercase">Campus</p>
                              <p className="font-bold uppercase">{u.campus || 'N/A'}</p>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                           <Button 
                             className="flex-grow rounded-xl bg-black text-white font-bold h-12 shadow-lg shadow-black/10"
                             onClick={() => approveBuyerMutation.mutate(u.id)}
                             disabled={approveBuyerMutation.isPending}
                           >
                             {approveBuyerMutation.isPending ? <Loader2 className="animate-spin" /> : "Approve Installment Plan"}
                           </Button>
                           <Button variant="outline" className="flex-grow rounded-xl font-bold border-2 h-12">Reject</Button>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center flex items-center justify-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Buyer ID Scan
                           </p>
                           <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group">
                              <img src={u.buyerIdScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerIdScanUrl!, '_blank')} alt="" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center flex items-center justify-center gap-1">
                              <Video className="w-3 h-3" /> Live Face Scan
                           </p>
                           <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group">
                              <img src={u.buyerFaceScanUrl!} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => window.open(u.buyerFaceScanUrl!, '_blank')} alt="" />
                           </div>
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {pendingBuyerVerifications.length === 0 && (
                <p className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No pending installment approvals.</p>
             )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
             <div className="max-w-2xl">
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-10">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-primary/10 rounded-[1.5rem]"><Smartphone className="w-8 h-8 text-primary" /></div>
                      <div>
                         <h3 className="text-3xl font-black uppercase tracking-tighter">App Settings.</h3>
                         <p className="font-bold text-gray-400">Configure global payment and system rules.</p>
                      </div>
                   </div>
                   
                   <div className="space-y-8">
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <Label className="font-black uppercase tracking-widest text-[10px] text-gray-400">Admin MoMo Number</Label>
                            <Badge variant="outline" className="rounded-lg font-black text-[9px] uppercase border-2 text-green-600 border-green-100">Live for Payments</Badge>
                         </div>
                         <Input 
                            value={adminMomoNumber} 
                            onChange={e => setAdminMomoNumber(e.target.value)} 
                            placeholder="e.g. 0244000000"
                            className="h-14 rounded-2xl border-2 text-xl font-black tracking-widest"
                         />
                         <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
                            All buyer payments via Mobile Money will be directed to this account. Ensure this number is correct and has a high transaction limit.
                         </p>
                      </div>

                      <Separator />

                      <Button 
                        className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
                        onClick={() => saveConfigMutation.mutate({ key: 'admin_momo_number', value: adminMomoNumber })}
                        disabled={saveConfigMutation.isPending}
                      >
                         {saveConfigMutation.isPending ? 'Saving...' : 'Save All Changes'}
                      </Button>
                   </div>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="app-mgmt" className="space-y-10 mt-0">
             <div className="grid lg:grid-cols-2 gap-10">
                {/* Weekly Deals Management */}
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                   <CardHeader className="bg-primary/5 p-8 border-b">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><Zap className="w-6 h-6 text-secondary" /></div>
                            <div>
                               <CardTitle className="text-2xl font-black">Weekly Flash Deals</CardTitle>
                               <CardDescription className="font-bold">Manage the front-page phone carousel</CardDescription>
                            </div>
                         </div>
                         <Button className="rounded-xl font-black" onClick={() => setDealModalOpen(true)}>
                            <Plus className="w-5 h-5 mr-2" /> New Deal
                         </Button>
                      </div>
                   </CardHeader>
                   <CardContent className="p-8">
                      <div className="space-y-4">
                         {weeklyDeals.map(deal => (
                            <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                               <div className="flex items-center gap-4">
                                  <img src={deal.product.images[0]} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                  <div>
                                     <p className="font-black text-sm">{deal.product.title}</p>
                                     <Badge className="bg-secondary text-white text-[10px]">{deal.dealLabel}</Badge>
                                  </div>
                               </div>
                               <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 rounded-full" onClick={() => deleteDealMutation.mutate(deal.id)}>
                                  <Trash2 className="w-4 h-4" />
                               </Button>
                            </div>
                         ))}
                         {weeklyDeals.length === 0 && <p className="text-center py-10 text-gray-400 font-bold italic">No active deals. Add one to show on home page.</p>}
                      </div>
                   </CardContent>
                </Card>

                {/* Campus Pulse Management */}
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                   <CardHeader className="bg-primary/5 p-8 border-b">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-white rounded-2xl shadow-sm"><Activity className="w-6 h-6 text-primary" /></div>
                         <div>
                            <CardTitle className="text-2xl font-black">Campus Pulse Feed</CardTitle>
                            <CardDescription className="font-bold">Education news & campus activities</CardDescription>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-8">
                      <div className="space-y-6">
                         <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase text-gray-400">Post Title</Label>
                                  <Input className="rounded-xl border-2" placeholder="KNUST SRC Week..." value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} />
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase text-gray-400">Source</Label>
                                  <Select value={newActivity.source} onValueChange={v => setNewActivity({...newActivity, source: v})}>
                                     <SelectTrigger className="rounded-xl border-2"><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="internal">Internal Hub</SelectItem>
                                        <SelectItem value="google">Google News</SelectItem>
                                        <SelectItem value="facebook">Facebook Activity</SelectItem>
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            <div className="space-y-2">
                               <Label className="text-xs font-black uppercase text-gray-400">Content</Label>
                               <Textarea className="rounded-xl border-2 min-h-[80px]" placeholder="Brief update about what's happening..." value={newActivity.content} onChange={e => setNewActivity({...newActivity, content: e.target.value})} />
                            </div>
                            <Button className="w-full h-12 rounded-xl font-black shadow-lg" disabled={!newActivity.title || !newActivity.content} onClick={() => createActivityMutation.mutate(newActivity)}>
                               Publish to Pulse
                            </Button>
                         </div>

                         <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {campusActivities.map(act => (
                               <div key={act.id} className="p-4 border-2 border-gray-50 rounded-2xl flex items-center justify-between">
                                  <div>
                                     <p className="font-black text-sm">{act.title}</p>
                                     <p className="text-xs text-gray-400 font-medium">{act.source} • {act.activityType}</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 rounded-full" onClick={() => deleteActivityMutation.mutate(act.id)}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>
                            ))}
                         </div>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </TabsContent>
        </Tabs>

        {/* New Deal Modal */}
        <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
           <DialogContent className="max-w-md rounded-3xl border-none p-8">
              <DialogHeader>
                 <DialogTitle className="text-2xl font-black">Add Weekly Deal</DialogTitle>
                 <DialogDescription className="font-bold">Select a product to feature on the home page phone mockup.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                 <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Target Product</Label>
                    <Select onValueChange={(v) => setNewDeal({...newDeal, productId: parseInt(v)})}>
                       <SelectTrigger className="rounded-xl border-2 h-12">
                          <SelectValue placeholder="Select from approved products" />
                       </SelectTrigger>
                       <SelectContent className="max-h-[300px]">
                          {allProducts.filter(p => p.approvalStatus === 'approved').map(p => (
                             <SelectItem key={p.id} value={p.id.toString()}>{p.title} (GH₵{p.price})</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-gray-400">Discount %</Label>
                       <Input type="number" className="rounded-xl border-2" value={newDeal.discountPercentage} onChange={e => setNewDeal({...newDeal, discountPercentage: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-gray-400">Label</Label>
                       <Input className="rounded-xl border-2" value={newDeal.dealLabel} onChange={e => setNewDeal({...newDeal, dealLabel: e.target.value})} />
                    </div>
                 </div>
              </div>
              <DialogFooter>
                 <Button className="w-full h-14 rounded-2xl font-black shadow-xl" disabled={!newDeal.productId} onClick={() => createDealMutation.mutate(newDeal)}>
                    Activate Deal
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}