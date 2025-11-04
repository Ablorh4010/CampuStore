import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import StoreForm from '@/components/modals/store-form';
import ProductForm from '@/components/modals/product-form';
import { useAuth } from '@/lib/auth-context';
import { Link, useLocation } from 'wouter';
import type { Store, Product, OrderWithDetails } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

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

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to access the dashboard.</p>
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalProducts = storeProducts.length;
  const totalViews = storeProducts.reduce((sum, product) => sum + (product.viewCount || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600">Manage your stores and products</p>
        </div>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Link href="/seller-settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          {userStores.length === 0 ? (
            <Button onClick={() => setShowStoreForm(true)}>
              <StoreIcon className="mr-2 h-4 w-4" />
              Create Store
            </Button>
          ) : (
            <Button onClick={() => setShowProductForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {userStores.length === 0 ? (
        /* No Store State */
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <StoreIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Create Your First Store
            </h3>
            <p className="text-gray-600 mb-6">
              Start selling by creating your student store. It's quick and easy!
            </p>
            <Button size="lg" onClick={() => setShowStoreForm(true)}>
              <StoreIcon className="mr-2 h-5 w-5" />
              Create Store
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders}</div>
                {pendingOrders > 0 && (
                  <Badge variant="secondary" className="mt-1">Needs attention</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="store">Store Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Products</h2>
                <Button onClick={() => setShowProductForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : storeProducts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding your first product to your store.</p>
                    <Button onClick={() => setShowProductForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Product
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {storeProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="relative">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 space-x-1">
                          <Button size="icon" variant="secondary" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="secondary" className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={product.isAvailable ? 'secondary' : 'outline'}>
                            {product.isAvailable ? 'Available' : 'Sold'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {product.viewCount || 0} views
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                          {product.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{product.condition}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            ${parseFloat(product.price).toFixed(2)}
                          </span>
                          <Link href={`/product/${product.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <h2 className="text-xl font-semibold">Orders</h2>
              
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600">Orders will appear here when customers buy your products.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {order.product.title}
                              </h3>
                              <Badge 
                                variant={order.status === 'pending' ? 'secondary' : 'outline'}
                                className={
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Buyer: {order.buyer.firstName} {order.buyer.lastName}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {order.quantity} • Total: ${parseFloat(order.totalAmount).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {order.status === 'pending' && (
                            <div className="space-x-2">
                              <Button size="sm" variant="outline">
                                Confirm
                              </Button>
                              <Button size="sm" variant="outline">
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="store" className="space-y-6">
              <h2 className="text-xl font-semibold">Store Settings</h2>
              
              {storesLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{userStores[0]?.name}</h3>
                        <p className="text-gray-600">{userStores[0]?.description}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>University: {userStores[0]?.university}</span>
                        <span>•</span>
                        <span>Rating: {parseFloat(userStores[0]?.rating || '0').toFixed(1)}/5</span>
                        <span>•</span>
                        <span>{userStores[0]?.reviewCount || 0} reviews</span>
                      </div>
                      <div className="pt-4">
                        <Button variant="outline">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Store Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Modals */}
      <StoreForm 
        isOpen={showStoreForm} 
        onClose={() => setShowStoreForm(false)} 
      />
      <ProductForm 
        isOpen={showProductForm} 
        onClose={() => setShowProductForm(false)}
        userStores={userStores}
      />
    </div>
  );
}
