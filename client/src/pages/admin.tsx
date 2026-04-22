import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Trash2, Store as StoreIcon, Package, User as UserIcon, Phone, MapPin, Eye, ExternalLink, Settings, Plus, Tag, Mail, Loader2, RefreshCcw, ShieldAlert, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProductWithStore, StoreWithUser, Category } from '@shared/schema';

export default function AdminDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('pending-products');

  // Category management state
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', color: '#6366f1' });

  // Deletion/Suspension feedback state
  const [modModalOpen, setModModalOpen] = useState(false);
  const [modItem, setModItem] = useState<{ id: number; type: 'product' | 'store'; action: 'delete' | 'reject' | 'suspend'; title: string } | null>(null);
  const [adminFeedback, setAdminFeedback] = useState('');

  // Redirect if not admin (ensuring session is loaded first)
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

  const updateStoreActiveMutation = useMutation({
    mutationFn: ({ storeId, isActive, feedback }: { storeId: number; isActive: boolean; feedback?: string }) =>
      apiRequest('PUT', `/api/admin/stores/${storeId}`, { isActive, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: 'Status Updated', description: 'Store active status changed.' });
      setModModalOpen(false);
      setModItem(null);
      setAdminFeedback('');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type, feedback }: { id: number; type: 'product' | 'store'; feedback: string }) => {
      return apiRequest('DELETE', `/api/admin/${type}s/${id}`, { feedback });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: 'Item Deleted', description: 'The owner has been notified via email.' });
      setModModalOpen(false);
      setModItem(null);
      setAdminFeedback('');
    },
  });

  const handleModeration = () => {
    if (!modItem) return;
    
    if (modItem.action === 'delete') {
      deleteItemMutation.mutate({ id: modItem.id, type: modItem.type, feedback: adminFeedback });
    } else if (modItem.action === 'reject') {
      if (modItem.type === 'store') {
        updateStoreStatusMutation.mutate({ storeId: modItem.id, status: 'rejected', feedback: adminFeedback });
      } else {
        updateProductStatusMutation.mutate({ productId: modItem.id, status: 'rejected', feedback: adminFeedback });
      }
      setModModalOpen(false);
      setModItem(null);
      setAdminFeedback('');
    } else if (modItem.action === 'suspend') {
      updateStoreActiveMutation.mutate({ storeId: modItem.id, isActive: false, feedback: adminFeedback });
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  
  if (!user || !user.isAdmin) return null;

  const renderProductCard = (product: ProductWithStore) => (
    <Card key={product.id} className="mb-4 overflow-hidden border-l-4 border-l-primary/20 bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={product.approvalStatus === 'approved' ? 'default' : product.approvalStatus === 'rejected' ? 'destructive' : 'secondary'}>
                {product.approvalStatus.toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-500">ID: #{product.id}</span>
            </div>
            <CardTitle className="text-lg font-bold">{product.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 font-medium">
              <StoreIcon className="w-3 h-3" /> {product.store?.name || 'Unknown Store'} 
              <span className="mx-1">•</span>
              <UserIcon className="w-3 h-3" /> {product.store?.user?.firstName || 'Unknown Seller'}
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
             {product.mediaGifUrl && (
               <div className="relative group/vid overflow-hidden rounded-lg w-24 h-24 border-2 border-primary/10">
                  <img src={product.mediaGifUrl} className="w-full h-full object-cover" alt="Showcase" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                     <Video className="w-6 h-6 text-white" />
                  </div>
               </div>
             )}
             {product.images?.[0] && (
               <img src={product.images[0]} className="w-24 h-24 object-cover rounded-lg shadow-sm border" alt="" />
             )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm italic border border-gray-100">
          {product.description.substring(0, 150)}{product.description.length > 150 ? '...' : ''}
        </div>
        <div className="flex flex-wrap gap-2">
          {product.approvalStatus === 'pending' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'approved' })}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          )}
          <Button size="sm" variant="outline" className="font-bold" onClick={() => setLocation(`/product/${product.id}`)}>View Listing</Button>
          <Button size="sm" variant="destructive" className="ml-auto shadow-sm font-bold" onClick={() => {
            setModItem({ id: product.id, type: 'product', action: 'delete', title: product.title });
            setModModalOpen(true);
          }}>
            <Trash2 className="w-4 h-4 mr-1" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStoreCard = (store: StoreWithUser) => (
    <Card key={store.id} className={`mb-6 overflow-hidden shadow-lg bg-white ${store.approvalStatus === 'pending' ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-primary/20'}`}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={store.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {store.approvalStatus.toUpperCase()}
              </Badge>
              {!store.isActive && (
                <Badge variant="destructive">SUSPENDED</Badge>
              )}
              <span className="text-xs text-gray-500 font-mono">Store ID: #{store.id}</span>
            </div>
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-gray-900">
              <StoreIcon className="w-6 h-6 text-primary" />
              {store.name}
            </CardTitle>
            <CardDescription className="font-bold text-gray-700 mt-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              {store.user?.firstName || 'Unknown'} {store.user?.lastName || ''} 
              <span className="text-gray-300 mx-1">|</span>
              {store.university}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-5 rounded-2xl mb-6 border border-gray-100">
          <Label className="text-xs font-black uppercase text-gray-400 mb-2 block tracking-widest">Store Description</Label>
          <p className="text-gray-800 leading-relaxed font-medium">{store.description}</p>
        </div>

        <div className="space-y-6">
           <div>
              <Label className="text-xs font-black uppercase text-gray-400 mb-3 block tracking-widest">Identity & Live Evidence</Label>
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="group relative">
                    <img src={store.user?.idScanUrl || ''} className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-md transition-transform group-hover:scale-[1.02]" alt="ID" />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-sm">Student ID</div>
                 </div>
                 <div className="group relative">
                    <img src={store.user?.faceScanUrl || ''} className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-md transition-transform group-hover:scale-[1.02]" alt="Face" />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-sm">Face Capture</div>
                 </div>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3">
                 <Phone className="w-5 h-5 text-primary" />
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Mobile Money</p>
                    <p className="font-bold text-gray-900">{store.user?.phoneNumber || 'None'}</p>
                 </div>
              </div>
              <div className="bg-accent/5 p-4 rounded-2xl flex items-center gap-3">
                 <MapPin className="w-5 h-5 text-accent" />
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Location Pin</p>
                    <p className="font-bold text-gray-900">{store.latitude ? 'GPS Capture ✓' : 'No Pin'}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-10">
          {store.approvalStatus === 'pending' && (
            <Button size="lg" className="flex-1 bg-green-600 hover:bg-green-700 h-14 rounded-2xl font-black shadow-xl transition-all" onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'approved' })}>
              <CheckCircle2 className="w-5 h-5 mr-2" /> Approve Store
            </Button>
          )}
          
          <Button size="lg" variant="outline" className="flex-1 h-14 rounded-2xl font-black border-2 transition-all" onClick={() => {
            setModItem({ id: store.id, type: 'store', action: 'reject', title: store.name });
            setModModalOpen(true);
          }}>
            <RefreshCcw className="w-5 h-5 mr-2" /> Send Back
          </Button>

          <Button size="lg" variant="secondary" className="flex-1 h-14 rounded-2xl font-black transition-all" onClick={() => {
            setModItem({ id: store.id, type: 'store', action: 'suspend', title: store.name });
            setModModalOpen(true);
          }}>
            <ShieldAlert className="w-5 h-5 mr-2" /> Suspend
          </Button>

          <Button size="lg" variant="destructive" className="flex-1 h-14 rounded-2xl font-black transition-all" onClick={() => {
            setModItem({ id: store.id, type: 'store', action: 'delete', title: store.name });
            setModModalOpen(true);
          }}>
            <Trash2 className="w-5 h-5 mr-2" /> Permanent Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Admin Portal</h1>
            <p className="text-xl text-gray-500 font-medium">Marketplace Moderation Engine</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="rounded-xl border-2 font-black text-red-500 border-red-100 hover:bg-red-50" onClick={handleLogout}>
              Logout
            </Button>
            <div className="flex gap-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
                 <div className="bg-primary/10 p-2 rounded-full"><Package className="w-6 h-6 text-primary" /></div>
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Products</p>
                   <p className="text-xl font-black">{allProducts.length}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
                 <div className="bg-yellow-100 p-2 rounded-full"><StoreIcon className="w-6 h-6 text-yellow-600" /></div>
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">All Stores</p>
                   <p className="text-xl font-black">{allStores.length}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border overflow-x-auto w-full md:w-auto">
            <TabsTrigger value="pending-products" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              Pending Products
              {allProducts.filter(p => p.approvalStatus === 'pending').length > 0 && (
                <Badge className="ml-2 bg-red-500 border-none">{allProducts.filter(p => p.approvalStatus === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending-stores" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              Pending Stores
              {pendingStores.length > 0 && (
                <Badge className="ml-2 bg-yellow-500 border-none">{pendingStores.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all-stores" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              All Stores
            </TabsTrigger>
            <TabsTrigger value="app-mgmt" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap flex items-center gap-2">
              <Settings className="w-4 h-4" /> App Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-products" className="mt-0">
            {allProducts.filter(p => p.approvalStatus === 'pending').length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 shadow-inner">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">All Products Reviewed</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">The product queue is empty.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {allProducts.filter(p => p.approvalStatus === 'pending').map(renderProductCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-stores" className="mt-0">
            {pendingStores.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 shadow-inner">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <StoreIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">No Pending Stores</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">All student stores have been reviewed.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {pendingStores.map(renderStoreCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-stores" className="mt-0">
             <div className="max-w-4xl mx-auto space-y-6">
                {allStores.map(renderStoreCard)}
              </div>
          </TabsContent>

          <TabsContent value="app-mgmt" className="mt-0">
             <div className="grid lg:grid-cols-3 gap-8">
                {/* Categories Management */}
                <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-lg bg-white overflow-hidden">
                   <CardHeader className="bg-primary/5 pb-8">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-white rounded-2xl shadow-sm"><Tag className="w-6 h-6 text-primary" /></div>
                         <div>
                            <CardTitle className="text-2xl font-black">Marketplace Categories</CardTitle>
                            <CardDescription className="font-bold">Add or remove product categories</CardDescription>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-8">
                      <div className="flex gap-4 mb-10 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                         <div className="flex-1 space-y-2">
                            <Label className="text-xs font-black uppercase text-gray-400 ml-1">New Category Name</Label>
                            <Input placeholder="E.g., Academics, Housing..." className="h-12 rounded-xl border-2" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} />
                         </div>
                         <div className="self-end pb-0.5">
                            <Button className="h-12 px-6 rounded-xl font-black shadow-lg" disabled={!newCategory.name || createCategoryMutation.isPending} onClick={() => createCategoryMutation.mutate(newCategory)}>
                               <Plus className="w-5 h-5 mr-2" /> Add
                            </Button>
                         </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                         {categories.map(cat => (
                            <div key={cat.id} className="p-4 rounded-2xl border-2 flex items-center justify-between group hover:border-primary/20 transition-all">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border" style={{ backgroundColor: `${cat.color}20`, borderColor: cat.color }}>
                                     <span>{cat.icon === 'fas fa-book' ? '📚' : cat.icon === 'fas fa-laptop' ? '💻' : '📦'}</span>
                                  </div>
                                  <span className="font-bold text-gray-700">{cat.name}</span>
                               </div>
                               <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 rounded-full" onClick={() => { if(confirm('Delete category?')) deleteCategoryMutation.mutate(cat.id); }}>
                                  <Trash2 className="w-4 h-4" />
                               </Button>
                            </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>

                <div className="space-y-8">
                   <Card className="rounded-[2rem] border-none shadow-lg bg-black text-white p-8">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> System Healthy
                      </h3>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center py-3 border-b border-white/10">
                            <span className="text-gray-400 font-bold">Resend API</span>
                            <Badge className="bg-green-500/20 text-green-400 border-none">ACTIVE</Badge>
                         </div>
                         <div className="flex justify-between items-center py-3">
                            <span className="text-gray-400 font-bold">Cloud SQL</span>
                            <Badge className="bg-green-500/20 text-green-400 border-none">CONNECTED</Badge>
                         </div>
                      </div>
                   </Card>
                </div>
             </div>
          </TabsContent>
        </Tabs>

        {/* Unified Moderation Modal */}
        <Dialog open={modModalOpen} onOpenChange={setModModalOpen}>
          <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
            <div className="paylater-hero p-8 text-white">
              <DialogTitle className="text-3xl font-black flex items-center gap-3 tracking-tighter uppercase">
                {modItem?.action === 'delete' ? <Trash2 className="w-8 h-8 text-secondary" /> : <ShieldAlert className="w-8 h-8 text-yellow-400" />}
                {modItem?.action} {modItem?.type}
              </DialogTitle>
              <DialogDescription className="text-white/70 font-bold mt-2 text-lg">
                Target: {modItem?.title}
              </DialogDescription>
            </div>
            
            <div className="p-8">
              <Label htmlFor="feedback" className="text-xs font-black uppercase text-gray-400 mb-3 block tracking-widest">
                Official Feedback (Required)
              </Label>
              <Textarea 
                id="feedback" 
                placeholder="Explain the reason for this action. This will be sent to the owner's email..."
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                className="rounded-2xl border-2 focus:ring-primary min-h-[150px] p-4 text-base font-medium shadow-inner bg-gray-50"
              />
            </div>

            <DialogFooter className="p-8 pt-0 gap-3">
              <Button variant="ghost" className="rounded-xl font-bold h-14 flex-1 hover:bg-gray-100" onClick={() => setModModalOpen(false)}>Cancel</Button>
              <Button 
                variant={modItem?.action === 'delete' ? 'destructive' : 'secondary'}
                className="rounded-2xl font-black h-14 px-8 flex-[2] shadow-xl transition-all hover:scale-105 active:scale-95"
                onClick={handleModeration}
                disabled={!adminFeedback || deleteItemMutation.isPending || updateStoreActiveMutation.isPending}
              >
                {deleteItemMutation.isPending || updateStoreActiveMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </span>
                ) : `Confirm ${modItem?.action}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
