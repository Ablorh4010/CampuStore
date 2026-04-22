import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Trash2, Store as StoreIcon, Package, User as UserIcon, Phone, MapPin, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProductWithStore, StoreWithUser } from '@shared/schema';

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('pending-products');

  // Redirect if not admin (ensuring session is loaded first)
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/admin/products'],
    enabled: !!user?.isAdmin
  });

  const { data: pendingStores = [], isLoading: storesLoading } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/admin/stores/pending'],
    enabled: !!user?.isAdmin
  });

  const { data: allStores = [] } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isAdmin
  });

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  
  if (!user || !user.isAdmin) return null;

  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', color: '#6366f1' });

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
      toast({ title: 'Success', description: 'Store status updated' });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type, feedback }: { id: number; type: 'product' | 'store'; feedback: string }) => {
      return apiRequest('DELETE', `/api/admin/${type}s/${id}`, { feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: 'Item Deleted', description: 'The owner has been notified via email.' });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setAdminFeedback('');
    },
  });

  const confirmDelete = () => {
    if (!itemToDelete) return;
    deleteItemMutation.mutate({ 
      id: itemToDelete.id, 
      type: itemToDelete.type, 
      feedback: adminFeedback 
    });
  };

  const renderProductCard = (product: ProductWithStore) => (
    <Card key={product.id} className="mb-4 overflow-hidden border-l-4 border-l-primary/20">
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
            <CardDescription className="flex items-center gap-1 mt-1">
              <StoreIcon className="w-3 h-3" /> {product.store?.name || 'Unknown Store'} 
              <span className="mx-1">•</span>
              <UserIcon className="w-3 h-3" /> {product.store?.user?.firstName || 'Unknown Seller'}
            </CardDescription>
          </div>
          {product.images?.[0] && (
            <img src={product.images[0]} className="w-20 h-20 object-cover rounded-lg shadow-sm" alt="" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm italic border border-gray-100">
          {product.description.substring(0, 150)}{product.description.length > 150 ? '...' : ''}
        </div>
        <div className="flex flex-wrap gap-2">
          {product.approvalStatus === 'pending' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => updateProductStatusMutation.mutate({ productId: product.id, status: 'approved' })}>
              <CheckCircle className="w-4 h-4 mr-1" /> Approve
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setLocation(`/product/${product.id}`)}>View Listing</Button>
          <Button size="sm" variant="destructive" className="ml-auto shadow-sm" onClick={() => {
            setItemToDelete({ id: product.id, type: 'product', title: product.title });
            setDeleteModalOpen(true);
          }}>
            <Trash2 className="w-4 h-4 mr-1" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStoreCard = (store: StoreWithUser) => (
    <Card key={store.id} className={`mb-6 overflow-hidden shadow-lg ${store.approvalStatus === 'pending' ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-primary/20'}`}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={store.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {store.approvalStatus.toUpperCase()}
              </Badge>
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
            </CardDescription>          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-5 rounded-2xl mb-6 border border-gray-100">
          <Label className="text-xs font-black uppercase text-gray-400 mb-2 block tracking-widest">Store Description</Label>
          <p className="text-gray-800 leading-relaxed font-medium">{store.description}</p>
        </div>

        {/* Verification Evidence */}
        <div className="space-y-6">
           <div>
              <Label className="text-xs font-black uppercase text-gray-400 mb-3 block tracking-widest">Identity & Live Evidence</Label>
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="group relative">
                    <img 
                      src={store.user.idScanUrl || ''} 
                      className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-md transition-transform group-hover:scale-[1.02]" 
                      alt="ID Document"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-sm">Student ID / National ID</div>
                    <a href={store.user.idScanUrl || '#'} target="_blank" className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                       <ExternalLink className="w-4 h-4 text-gray-900" />
                    </a>
                 </div>
                 <div className="group relative">
                    <img 
                      src={store.user.faceScanUrl || ''} 
                      className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-md transition-transform group-hover:scale-[1.02]" 
                      alt="Face Capture"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-sm">Live Face Capture</div>
                    <a href={store.user.faceScanUrl || '#'} target="_blank" className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                       <ExternalLink className="w-4 h-4 text-gray-900" />
                    </a>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3 border border-primary/10">
                 <div className="bg-primary/10 p-2 rounded-xl text-primary"><Phone className="w-5 h-5" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Mobile Money / Phone</p>
                    <p className="font-bold text-gray-900">{store.user.phoneNumber || 'Not Provided'}</p>
                 </div>
              </div>
              <div className="bg-accent/5 p-4 rounded-2xl flex items-center gap-3 border border-accent/10">
                 <div className="bg-accent/10 p-2 rounded-xl text-accent"><MapPin className="w-5 h-5" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Live Location Pin</p>
                    <p className="font-bold text-gray-900">
                       {store.latitude ? `${parseFloat(store.latitude).toFixed(4)}, ${parseFloat(store.longitude || '0').toFixed(4)}` : 'No Pin'}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex gap-3 mt-10">
          {store.approvalStatus === 'pending' && (
            <Button size="lg" className="flex-1 bg-green-600 hover:bg-green-700 h-14 rounded-2xl font-black shadow-xl shadow-green-100" onClick={() => updateStoreStatusMutation.mutate({ storeId: store.id, status: 'approved' })}>
              <CheckCircle className="w-5 h-5 mr-2" /> Approve Store
            </Button>
          )}
          <Button size="lg" variant="destructive" className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-red-100" onClick={() => {
            setItemToDelete({ id: store.id, type: 'store', title: store.name });
            setDeleteModalOpen(true);
          }}>
            <Trash2 className="w-5 h-5 mr-2" /> {store.approvalStatus === 'approved' ? 'Delete Store' : 'Reject Submission'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Admin Portal</h1>
            <p className="text-xl text-gray-500 font-medium">Marketplace Moderation Engine</p>
          </div>
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
            <TabsTrigger value="all-products" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="app-mgmt" className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap flex items-center gap-2">
              <Settings className="w-4 h-4" /> App Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-products" className="mt-0">
            {allProducts.filter(p => p.approvalStatus === 'pending').length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">All Products Reviewed</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">The product queue is empty. You've approved all current submissions.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                {allProducts.filter(p => p.approvalStatus === 'pending').map(renderProductCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-stores" className="mt-0">
            {pendingStores.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <StoreIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">No Pending Stores</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">There are no new student stores waiting for verification right now.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {pendingStores.map(renderStoreCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-stores" className="mt-0">
             <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {allStores.map(renderStoreCard)}
              </div>
          </TabsContent>

          <TabsContent value="all-products" className="mt-0">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.map(renderProductCard)}
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
                            <Input 
                              placeholder="E.g., Academics, Housing..." 
                              className="h-12 rounded-xl border-2" 
                              value={newCategory.name}
                              onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                            />
                         </div>
                         <div className="w-24 space-y-2">
                            <Label className="text-xs font-black uppercase text-gray-400 ml-1">Color</Label>
                            <Input 
                               type="color" 
                               className="h-12 w-full p-1 rounded-xl cursor-pointer" 
                               value={newCategory.color}
                               onChange={e => setNewCategory({...newCategory, color: e.target.value})}
                            />
                         </div>
                         <div className="self-end pb-0.5">
                            <Button 
                              className="h-12 px-6 rounded-xl font-black shadow-lg"
                              disabled={!newCategory.name || createCategoryMutation.isPending}
                              onClick={() => createCategoryMutation.mutate(newCategory)}
                            >
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
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="text-gray-300 hover:text-red-500 rounded-full"
                                 onClick={() => {
                                   if(confirm('Delete this category? Products in this category will become unassigned.')) {
                                      deleteCategoryMutation.mutate(cat.id);
                                   }
                                 }}
                               >
                                  <Trash2 className="w-4 h-4" />
                               </Button>
                            </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>

                {/* System Stats */}
                <div className="space-y-8">
                   <Card className="rounded-[2rem] border-none shadow-lg bg-black text-white p-8">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" /> System Healthy
                      </h3>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center py-3 border-b border-white/10">
                            <span className="text-gray-400 font-bold">Resend API</span>
                            <Badge className="bg-green-500/20 text-green-400 border-none">ACTIVE</Badge>
                         </div>
                         <div className="flex justify-between items-center py-3 border-b border-white/10">
                            <span className="text-gray-400 font-bold">Stripe</span>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-none">TEST MODE</Badge>
                         </div>
                         <div className="flex justify-between items-center py-3">
                            <span className="text-gray-400 font-bold">Cloud SQL</span>
                            <Badge className="bg-green-500/20 text-green-400 border-none">CONNECTED</Badge>
                         </div>
                      </div>
                   </Card>

                   <Card className="rounded-[2rem] border-none shadow-lg p-8 bg-primary text-white text-center">
                      <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6">
                         <Settings className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-black mb-2">Need a Token?</h3>
                      <p className="text-white/70 text-sm font-medium mb-6 leading-relaxed">Generated new invite tokens for additional team members.</p>
                      <Button className="w-full bg-white text-primary hover:bg-gray-100 font-black rounded-2xl h-12 shadow-xl shadow-black/10">
                         Create Admin Link
                      </Button>
                   </Card>
                </div>
             </div>
          </TabsContent>
        </Tabs>

        {/* Delete with Feedback Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-red-600 flex items-center gap-2">
                <Trash2 className="w-6 h-6" />
                Confirm Removal
              </DialogTitle>
              <DialogDescription className="text-gray-600 font-medium">
                You are about to remove <strong>{itemToDelete?.title}</strong> from the platform. 
                Please provide feedback for the {itemToDelete?.type} owner.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Label htmlFor="feedback" className="text-sm font-black uppercase text-gray-400 mb-2 block">
                Feedback for Owner (Will be emailed)
              </Label>
              <Textarea 
                id="feedback" 
                placeholder="Ex: This product violates our safety guidelines regarding prohibited items. / This store name contains inappropriate language..."
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                className="rounded-2xl border-2 focus:ring-red-500 focus:border-red-500 min-h-[150px] p-4 text-base"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" className="rounded-xl font-bold h-12" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                className="rounded-xl font-bold h-12 px-8"
                onClick={confirmDelete}
                disabled={!adminFeedback || deleteItemMutation.isPending}
              >
                {deleteItemMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending Email...
                  </span>
                ) : `Delete ${itemToDelete?.type === 'product' ? 'Listing' : 'Store'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
