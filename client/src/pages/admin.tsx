import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import type { ProductWithStore } from '@shared/schema';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('pending');

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

  const updateStatusMutation = useMutation({
    mutationFn: ({ productId, status }: { productId: number; status: string }) =>
      apiRequest(`/api/admin/products/${productId}/approval`, 'PUT', { userId: user?.id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products', user?.id] });
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
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="admin-tabs">
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
        </Tabs>
      </div>
    </div>
  );
}
