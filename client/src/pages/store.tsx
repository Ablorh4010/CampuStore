import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Star, MapPin, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/product/product-card';
import ChatBox from '@/components/chat/chat-box';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Store, Product, User, ProductWithStore, OrderWithDetails } from '@shared/schema';

export default function Store() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute('/store/:id');
  const storeId = params?.id ? parseInt(params.id) : null;

  const { data: store, isLoading: storeLoading } = useQuery<Store & { user?: User }>({
    queryKey: ['/api/stores', storeId],
    enabled: !!storeId,
  });

  const { data: purchases = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/buyer', user?.id],
    enabled: !!user,
  });

  const hasPurchasedFromSeller = purchases.some(order => order.sellerId === store?.userId);

  const createMessageMutation = useMutation({
    mutationFn: async (data: { toId: number; content: string }) => {
      if (!hasPurchasedFromSeller) {
        throw new Error('You must purchase an item from this seller before initiating contact.');
      }
      const response = await apiRequest('POST', '/api/messages', {
        fromId: user!.id,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message sent',
        description: 'Your inquiry has been sent to the seller.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Contact Restricted',
        description: error.message || 'Failed to send message.',
        variant: 'destructive',
      });
    },
  });

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to contact sellers.',
        variant: 'destructive',
      });
      return;
    }

    if (!store) return;

    if (!hasPurchasedFromSeller) {
      toast({
        title: 'Payment Required',
        description: 'Communication is only enabled after a successful purchase for security.',
        variant: 'destructive',
      });
      return;
    }

    createMessageMutation.mutate({
      toId: store.userId,
      content: `Hi! I'm interested in your store ${store.name}. Can we chat?`,
    });
  };

  const handleShare = async () => {
    if (!store) return;
    
    // Add referral code if user is logged in
    const shareUrl = new URL(window.location.href);
    if (user) {
      shareUrl.searchParams.set('ref', user.id.toString());
    }

    const shareData = {
      title: store.name,
      text: `Check out ${store.name} on The University Hub!`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ title: 'Shared!', description: 'Store link shared successfully.' });
      } else {
        await navigator.clipboard.writeText(shareUrl.toString());
        toast({ title: 'Link Copied', description: 'Store link with your referral code copied to clipboard.' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products/store', storeId],
    enabled: !!storeId,
  });

  if (storeLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600">The store you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const rating = parseFloat(store.rating || "0");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Store Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {store.name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
                  {store.isActive && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(rating) ? 'fill-current' : ''
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {rating.toFixed(1)} ({store.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{store.university}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{store.description}</p>
                
                <div className="flex items-center space-x-2">
                  <Button onClick={handleContactSeller} disabled={createMessageMutation.isPending}>
                    {createMessageMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                    Contact Seller
                  </Button>
                  <Button variant="outline" onClick={handleShare}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Share Store
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Products */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Products ({products.length})
          </h2>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products available</p>
            <p className="text-gray-400 text-sm mt-2">
              Check back later for new listings
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Chat Box */}
      <ChatBox
        storeId={store.id}
        sellerId={store.userId}
        sellerName={`${store.user?.firstName || 'Store'} ${store.user?.lastName || 'Owner'}`}
        sellerAvatar={store.user?.avatar || undefined}
        storeName={store.name}
      />
    </div>
  );
}
