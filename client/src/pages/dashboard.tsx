import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Plus, 
  Store as StoreIcon, 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Settings,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Camera,
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StoreForm from '@/components/modals/store-form';
import ProductForm from '@/components/modals/product-form';
import { IdScanCapture, FacialCapture } from '@/components/verification';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import type { Store, Product, OrderWithDetails } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  // Verification state
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [idScanFile, setIdScanFile] = useState<File | null>(null);
  const [faceScanFile, setFaceScanFile] = useState<File | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: userStores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: storeProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products/store', userStores[0]?.id],
    enabled: !!userStores[0]?.id,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/seller', user?.id],
    enabled: !!user?.id,
  });

  // Auto-open store form if onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'true' && userStores.length === 0 && !storesLoading) {
      setShowStoreForm(true);
    }
  }, [userStores.length, storesLoading]);

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('DELETE', `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      toast({ title: "Product Deleted", description: "Listing has been removed from your store." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      if (!idScanFile || !faceScanFile) throw new Error("Please capture both ID and Face");
      
      const formData = new FormData();
      formData.append('idScan', idScanFile);
      formData.append('faceScan', faceScanFile);
      formData.append('phoneNumber', phoneNumber);
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      if (address) formData.append('address', address);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/seller-verification', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit verification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ 
        title: "Application Received!", 
        description: "The University Hub team will review your application and send a notification soon on the status of your store.",
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast({ title: "Geolocation error", description: "Browser doesn't support geolocation", variant: "destructive" });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setAddress("Current Location Captured");
        setIsGettingLocation(false);
        toast({ title: "Location Captured", description: "Your live location has been pinned." });
      },
      () => {
        toast({ title: "Location Denied", description: "Please allow location access to continue.", variant: "destructive" });
        setIsGettingLocation(false);
      }
    );
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
         <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
         <p className="mt-4 text-gray-500 font-medium">Checking session...</p>
      </div>
    );
  }

  const primaryStore = userStores[0];
  const needsVerification = primaryStore && (primaryStore.approvalStatus === 'waiting_verification' || user.verificationStatus === 'unverified' || user.verificationStatus === 'rejected');
  const isPendingAdmin = primaryStore && primaryStore.approvalStatus === 'pending';
  const isApproved = primaryStore && primaryStore.approvalStatus === 'approved';

  if (storesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
         <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
         <p className="mt-4 text-gray-500 font-medium">Loading store details...</p>
      </div>
    );
  }

  if (userStores.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <StoreIcon className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Become a Seller</h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            Ready to turn your campus gear into cash? Create your student store today.
          </p>
          <Button size="lg" className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105" onClick={() => setShowStoreForm(true)}>
            <Plus className="mr-2 h-6 w-6" /> Create My Store
          </Button>
        </div>
        <StoreForm isOpen={showStoreForm} onClose={() => setShowStoreForm(false)} />
      </div>
    );
  }

  // Multi-step Onboarding UI
  if (needsVerification) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
           <Badge className="mb-4 bg-yellow-500 hover:bg-yellow-600 border-none px-4 py-1 rounded-full uppercase tracking-wider font-bold">Step 2: Verification</Badge>
           <h1 className="text-4xl font-black text-gray-900 tracking-tight">Verify Your Identity</h1>
           <p className="text-gray-500 mt-2">To protect our campus community, all sellers must complete a one-time identity verification.</p>
        </div>

        {user.verificationStatus === 'rejected' && (
          <Alert variant="destructive" className="mb-8 rounded-2xl border-2">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Verification Correction Needed</AlertTitle>
            <AlertDescription className="mt-2 text-sm italic">
              <strong>Admin Feedback:</strong> {user.verificationNotes || "Please re-upload clearer images of your ID and face."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8">
           {/* Section 1: Contact & Location */}
           <Card className="rounded-3xl shadow-sm border-2">
             <CardHeader>
               <CardTitle className="text-xl font-bold flex items-center gap-2">
                 <Phone className="w-5 h-5 text-primary" /> 
                 1. Contact & Location
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-bold">Phone Number (MTN/Telecel)</Label>
                  <Input 
                    id="phone" 
                    placeholder="+233..." 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="h-12 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Current Live Location</Label>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleGetLocation} 
                      disabled={isGettingLocation}
                      className="h-12 rounded-xl flex-1 border-2 font-bold"
                    >
                      {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                      {latitude ? "Location Pinned ✓" : "Capture Live Location"}
                    </Button>
                    {latitude && (
                      <div className="flex-1 bg-green-50 text-green-700 rounded-xl px-4 flex items-center text-xs font-mono font-bold border border-green-200">
                        {latitude.substring(0,8)}, {longitude?.substring(0,8)}
                      </div>
                    )}
                  </div>
                </div>
             </CardContent>
           </Card>

           {/* Section 2: Visual Evidence */}
           <div className="grid md:grid-cols-2 gap-8">
              <IdScanCapture 
                onCapture={setIdScanFile} 
                onRemove={() => setIdScanFile(null)} 
                title="2. ID Document"
                description="Snap a clear live photo of your Student ID or National ID card."
              />
              <FacialCapture 
                onCapture={setFaceScanFile} 
                onRemove={() => setFaceScanFile(null)} 
                title="3. Face Capture"
                description="Take a live selfie holding your ID if possible for faster approval."
              />
           </div>

           <div className="mt-8">
              <Button 
                size="lg" 
                className="w-full h-16 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]"
                disabled={!idScanFile || !faceScanFile || !latitude || !phoneNumber || verificationMutation.isPending}
                onClick={() => verificationMutation.mutate()}
              >
                {verificationMutation.isPending ? (
                  <><Loader2 className="w-6 h-6 animate-spin mr-2" /> Submitting Documents...</>
                ) : (
                  <><ShieldCheck className="w-6 h-6 mr-2" /> Submit for Admin Approval</>
                )}
              </Button>
              <p className="text-center text-xs text-gray-400 mt-4 font-medium uppercase tracking-widest">Secure encrypted verification powered by The University Hub</p>
           </div>
        </div>
      </div>
    );
  }

  // Waiting for Admin UI
  if (isPendingAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
         <div className="bg-primary/5 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10 relative">
            <Loader2 className="w-16 h-16 text-primary animate-[spin_3s_linear_infinite]" />
            <ShieldCheck className="w-8 h-8 text-primary absolute" />
         </div>
         <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">Pending Admin Review</h1>
         <p className="text-xl text-gray-500 leading-relaxed">
           University Hub has received your application! Our team is reviewing your store <strong>"{primaryStore.name}"</strong> and will send you a notification soon on the success of your application.
         </p>
         <div className="mt-12 p-6 bg-white rounded-3xl border-2 border-gray-100 shadow-sm flex items-center justify-center gap-4">
            <Badge className="bg-yellow-500 font-bold px-3 py-1">TIMELINE</Badge>
            <p className="text-sm font-bold text-gray-400">Approval usually takes 12-24 hours</p>
         </div>
         <Button variant="ghost" className="mt-8 font-bold" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] })}>
           Refresh Status
         </Button>
      </div>
    );
  }

  // Full Dashboard (Approved)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Store Dashboard
            </h1>
            <Badge className="bg-green-500 px-3 font-bold border-none shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> VERIFIED
            </Badge>
          </div>
          <p className="text-lg text-gray-500 font-medium">{primaryStore.name} • {primaryStore.university}</p>
        </div>
        
        <div className="flex gap-3">
          <Button size="lg" className="h-12 rounded-xl font-bold px-6 shadow-lg shadow-primary/10" onClick={() => setShowProductForm(true)}>
            <Plus className="mr-2 h-5 w-5" /> Add New Product
          </Button>
          <Link href="/seller-settings">
            <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-2">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

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

      <Tabs defaultValue="products" className="space-y-8">
        <TabsList className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 h-14 inline-flex items-center">
          <TabsTrigger value="products" className="rounded-xl px-8 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Products</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl px-8 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
          <TabsTrigger value="store" className="rounded-xl px-8 h-10 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             <Card className="rounded-[2.5rem] border-4 border-dashed border-gray-100 bg-transparent flex flex-col items-center justify-center py-20 cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => setShowProductForm(true)}>
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-400 group-hover:text-primary">Add Product</p>
             </Card>
             {storeProducts.map(product => (
               <Card key={product.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-sm hover:shadow-xl transition-all group">
                  <div className="relative h-56 overflow-hidden">
                    <img src={product.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10"><Edit className="w-4 h-4" /></Button>
                       <Button 
                         size="icon" 
                         variant="destructive" 
                         className="rounded-full shadow-lg h-10 w-10"
                         onClick={(e) => {
                           e.preventDefault();
                           if (confirm('Are you sure you want to delete this product?')) {
                             deleteProductMutation.mutate(product.id);
                           }
                         }}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex-1 min-w-0 mr-2">
                          <h3 className="font-black text-xl line-clamp-1">{product.title}</h3>
                          {product.approvalStatus === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] mt-1">
                               PENDING APPROVAL
                            </Badge>
                          )}
                       </div>
                       <p className="text-primary font-black">${parseFloat(product.price).toFixed(2)}</p>
                    </div>
                    <Badge variant="outline" className="rounded-lg font-bold border-2">{product.condition.toUpperCase()}</Badge>
                  </CardContent>
               </Card>
             ))}
           </div>
        </TabsContent>

        <TabsContent value="store">
           <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
             <CardContent className="p-10">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-3xl font-black text-gray-900">{primaryStore.name}</h3>
                      <p className="text-gray-500 font-medium mt-1">{primaryStore.description}</p>
                   </div>
                   <Button variant="outline" className="rounded-xl border-2 font-bold h-12 px-6" onClick={() => setShowStoreForm(true)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Store Profile
                   </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                   <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Campus & Location</p>
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-gray-700 font-bold">
                            <MapPin className="w-4 h-4 text-primary" /> {primaryStore.university}
                         </div>
                         <p className="text-sm text-gray-500 ml-6">{primaryStore.campus || 'Main Campus'}</p>
                      </div>
                   </div>
                   <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Store Status</p>
                      <div className="flex items-center gap-3">
                         <Badge className={primaryStore.approvalStatus === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {primaryStore.approvalStatus.toUpperCase()}
                         </Badge>
                         {primaryStore.isActive ? (
                            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                               <CheckCircle className="w-4 h-4" /> Active
                            </span>
                         ) : (
                            <span className="text-sm font-bold text-red-600 flex items-center gap-1">
                               <XCircle className="w-4 h-4" /> Paused
                            </span>
                         )}
                      </div>
                   </div>
                   <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Store Identity</p>
                      <div className="flex items-center gap-3">
                         <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarImage src={primaryStore.logoUrl || ''} />
                            <AvatarFallback>{primaryStore.name[0]}</AvatarFallback>
                         </Avatar>
                         <p className="font-bold text-gray-800">Store Profile Picture</p>
                      </div>
                   </div>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-4">
             {orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border">
                   <ShoppingCart className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                   <h3 className="text-xl font-bold">No Sales Yet</h3>
                   <p className="text-gray-500">Your orders will appear here when customers buy your products.</p>
                </div>
             ) : (
                orders.map(order => (
                  <Card key={order.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-gray-400">#ORD</div>
                          <div>
                            <h4 className="font-black text-lg">{order.product.title}</h4>
                            <p className="text-sm font-medium text-gray-500">Buyer: {order.buyer.firstName} • {new Date(order.createdAt!).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <p className="font-black text-xl">${parseFloat(order.totalAmount).toFixed(2)}</p>
                             <Badge className="bg-primary/10 text-primary border-none font-bold">{order.status.toUpperCase()}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12"><ArrowRight className="w-5 h-5" /></Button>
                       </div>
                    </CardContent>
                  </Card>
                ))
             )}
          </div>
        </TabsContent>
      </Tabs>

      <StoreForm 
        isOpen={showStoreForm} 
        onClose={() => setShowStoreForm(false)} 
        store={primaryStore}
      />
      <ProductForm 
        isOpen={showProductForm} 
        onClose={() => setShowProductForm(false)}
        userStores={userStores}
      />
    </div>
  );
}
