import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Edit, Upload, Link as LinkIcon, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProductWithStore, Category, Store } from '@shared/schema';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('pending');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importApiKey, setImportApiKey] = useState('');
  const [importPlatform, setImportPlatform] = useState('csv');
  const [selectedStore, setSelectedStore] = useState<string>('');

  // Redirect if not admin (using useEffect to avoid render-time side effects)
  useEffect(() => {
    if (!user || !user.isAdmin) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Show loading while redirecting
  if (!user || !user.isAdmin) {
    return null;
  }

  const { data: allProducts = [], isLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/admin/products', user?.id],
    queryFn: () => fetch(`/api/admin/products?userId=${user?.id}`).then(res => res.json()),
  });

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ productId, status }: { productId: number; status: string }) =>
      apiRequest('PUT', `/api/admin/products/${productId}/approval`, { userId: user?.id, status }),
    onSuccess: () => {
      // Invalidate admin products list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products', user?.id] });
      // Invalidate public product listings (featured, browse, etc.)
      queryClient.invalidateQueries({ queryKey: ['/api/products/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: 'Success',
        description: 'Product status updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (productId: number) => {
    updateStatusMutation.mutate({ productId, status: 'approved' });
  };

  const handleReject = (productId: number) => {
    updateStatusMutation.mutate({ productId, status: 'rejected' });
  };

  const importProductsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/products/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Import failed');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products', user?.id] });
      toast({
        title: 'Success',
        description: `Imported ${data.count} products successfully`,
      });
      setCsvFile(null);
      setImportUrl('');
      setImportApiKey('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import products',
        variant: 'destructive',
      });
    },
  });

  const handleCsvImport = () => {
    if (!csvFile || !selectedStore) {
      toast({
        title: 'Missing Information',
        description: 'Please select a CSV file and choose a store',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('storeId', selectedStore);
    formData.append('userId', user?.id.toString() || '');

    importProductsMutation.mutate(formData);
  };

  const handleUrlImport = () => {
    if (!importUrl || !selectedStore) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a URL and choose a store',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('url', importUrl);
    formData.append('platform', importPlatform);
    formData.append('apiKey', importApiKey);
    formData.append('storeId', selectedStore);
    formData.append('userId', user?.id.toString() || '');

    importProductsMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csvContent = 'title,description,price,originalPrice,condition,categoryId,images\n' +
      'Example Product,Product description here,29.99,39.99,new,1,https://example.com/image.jpg\n' +
      'Used Textbook,Biology textbook in good condition,15.00,50.00,used,1,https://example.com/book.jpg';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const pendingProducts = allProducts.filter(p => p.approvalStatus === 'pending');
  const approvedProducts = allProducts.filter(p => p.approvalStatus === 'approved');
  const rejectedProducts = allProducts.filter(p => p.approvalStatus === 'rejected');

  const renderProductCard = (product: ProductWithStore, showActions = true) => (
    <Card key={product.id} className="mb-4" data-testid={`product-card-${product.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid={`product-title-${product.id}`}>{product.title}</CardTitle>
            <CardDescription>
              Store: {product.store.name} | Category: {product.category.name}
            </CardDescription>
            <div className="mt-2 flex gap-2 items-center">
              <span className="text-xl font-bold text-primary">${product.price}</span>
              <Badge 
                variant={product.approvalStatus === 'approved' ? 'default' : 
                        product.approvalStatus === 'rejected' ? 'destructive' : 'secondary'}
                data-testid={`status-badge-${product.id}`}
              >
                {product.approvalStatus}
              </Badge>
            </div>
          </div>
          {product.images && product.images.length > 0 && (
            <img 
              src={product.images[0]} 
              alt={product.title}
              className="w-24 h-24 object-cover rounded ml-4"
              data-testid={`product-image-${product.id}`}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4" data-testid={`product-description-${product.id}`}>
          {product.description}
        </p>
        <div className="flex gap-2 text-sm text-muted-foreground mb-4">
          <span>Condition: {product.condition}</span>
          <span>•</span>
          <span>Seller: {product.store.user.firstName} {product.store.user.lastName}</span>
        </div>
        {showActions && (
          <div className="flex gap-2">
            {product.approvalStatus !== 'approved' && (
              <Button 
                onClick={() => handleApprove(product.id)}
                disabled={updateStatusMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid={`button-approve-${product.id}`}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            )}
            {product.approvalStatus !== 'rejected' && (
              <Button 
                onClick={() => handleReject(product.id)}
                disabled={updateStatusMutation.isPending}
                variant="destructive"
                data-testid={`button-reject-${product.id}`}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            )}
            <Button 
              onClick={() => setLocation(`/product/${product.id}`)}
              variant="outline"
              data-testid={`button-view-${product.id}`}
            >
              <Edit className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p data-testid="loading-text">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="admin-title">Admin Dashboard</h1>
          <p className="text-gray-600" data-testid="admin-subtitle">Manage and approve seller product listings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8" data-testid="admin-tabs">
            <TabsTrigger value="pending" className="relative" data-testid="tab-pending">
              Pending
              {pendingProducts.length > 0 && (
                <Badge className="ml-2 bg-yellow-500" data-testid="pending-count">
                  {pendingProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" data-testid="content-pending">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Pending Approval
                </CardTitle>
                <CardDescription>
                  Review and approve or reject new product listings from sellers
                </CardDescription>
              </CardHeader>
            </Card>
            
            {pendingProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="no-pending">
                    No pending products to review
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingProducts.map(product => renderProductCard(product))
            )}
          </TabsContent>

          <TabsContent value="approved" data-testid="content-approved">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approved Products
                </CardTitle>
                <CardDescription>
                  Products that are currently live on the marketplace
                </CardDescription>
              </CardHeader>
            </Card>

            {approvedProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="no-approved">
                    No approved products
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedProducts.map(product => renderProductCard(product))
            )}
          </TabsContent>

          <TabsContent value="rejected" data-testid="content-rejected">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejected Products
                </CardTitle>
                <CardDescription>
                  Products that did not meet marketplace guidelines
                </CardDescription>
              </CardHeader>
            </Card>

            {rejectedProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="no-rejected">
                    No rejected products
                  </p>
                </CardContent>
              </Card>
            ) : (
              rejectedProducts.map(product => renderProductCard(product))
            )}
          </TabsContent>

          <TabsContent value="import" data-testid="content-import">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    CSV Import
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file to import products in bulk
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-select">Select Store</Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger id="store-select" data-testid="select-store">
                        <SelectValue placeholder="Choose a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map(store => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      data-testid="input-csv-file"
                    />
                    {csvFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {csvFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-download-template"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      onClick={handleCsvImport}
                      disabled={!csvFile || !selectedStore || importProductsMutation.isPending}
                      className="flex-1"
                      data-testid="button-import-csv"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {importProductsMutation.isPending ? 'Importing...' : 'Import CSV'}
                    </Button>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-sm mb-2">CSV Format:</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Your CSV should include: title, description, price, originalPrice, condition, categoryId, images
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Category IDs:</strong> {categories.map(c => `${c.name} (${c.id})`).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    Import from Store URL
                  </CardTitle>
                  <CardDescription>
                    Sync products from Shopify, WooCommerce, or other ecommerce platforms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-select-url">Select Store</Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger id="store-select-url" data-testid="select-store-url">
                        <SelectValue placeholder="Choose a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map(store => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={importPlatform} onValueChange={setImportPlatform}>
                      <SelectTrigger id="platform" data-testid="select-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shopify">Shopify</SelectItem>
                        <SelectItem value="woocommerce">WooCommerce</SelectItem>
                        <SelectItem value="generic">Generic URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-url">Store URL</Label>
                    <Input
                      id="store-url"
                      type="url"
                      placeholder="https://your-store.myshopify.com"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      data-testid="input-store-url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key / Access Token (Optional)</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key"
                      value={importApiKey}
                      onChange={(e) => setImportApiKey(e.target.value)}
                      data-testid="input-api-key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for private stores or API access
                    </p>
                  </div>

                  <Button
                    onClick={handleUrlImport}
                    disabled={!importUrl || !selectedStore || importProductsMutation.isPending}
                    className="w-full"
                    data-testid="button-import-url"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {importProductsMutation.isPending ? 'Importing...' : 'Import from URL'}
                  </Button>

                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-sm mb-2">Platform Setup:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li><strong>Shopify:</strong> Use Admin API and create a private app</li>
                      <li><strong>WooCommerce:</strong> Generate API keys in WooCommerce settings</li>
                      <li><strong>Generic:</strong> Provide a public product feed URL</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
