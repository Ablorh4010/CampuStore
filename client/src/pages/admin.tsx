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
  Video, Users as UsersIcon, DollarSign, Activity, Zap, Globe, Newspaper
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProductWithStore, StoreWithUser, Category, User, WeeklyDealWithProduct, CampusActivityWithUser } from '@shared/schema';

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
            <TabsTrigger value="app-mgmt" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2">
              <Settings className="w-4 h-4" /> App Management
            </TabsTrigger>
          </TabsList>

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
                             <SelectItem key={p.id} value={p.id.toString()}>{p.title} (${p.price})</SelectItem>
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
