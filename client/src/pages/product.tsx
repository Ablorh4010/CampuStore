import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { 
  ShoppingCart, 
  MessageCircle, 
  MapPin, 
  Star, 
  Share2, 
  Heart,
  ChevronLeft,
  ChevronRight,
  User,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/product/product-card';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatPriceWithFee, calculatePriceWithFee } from '@/lib/utils';
import type { ProductWithStore } from '@shared/schema';

export default function Product() {
  const [, params] = useRoute('/product/:id');
  const productId = params?.id ? parseInt(params.id) : null;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery<ProductWithStore>({
    queryKey: ['/api/products', productId],
    enabled: !!productId,
  });

  const { data: relatedProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products', { categoryId: product?.categoryId, limit: 4 }],
    enabled: !!product?.categoryId,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: { toId: number; productId: number; content: string }) => {
      const response = await apiRequest('POST', '/api/messages', {
        fromId: user!.id,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message sent',
        description: 'Your message has been sent to the seller.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add items to cart.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!product) return;
    
    try {
      await addToCart(product.id);
      toast({
        title: 'Added to cart',
        description: `${product.title} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart.',
        variant: 'destructive',
      });
    }
  };

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to contact sellers.',
        variant: 'destructive',
      });
      return;
    }

    if (!product) return;

    // Send initial message
    createMessageMutation.mutate({
      toId: product.store.userId,
      productId: product.id,
      content: `Hi! I'm interested in your ${product.title}. Is it still available?`,
    });
  };

  const nextImage = () => {
    if (product && product.images) {
      setCurrentImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product && product.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <Package className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/browse">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sellerName = `${product.store.user.firstName} ${product.store.user.lastName}`;
  const priceWithFee = calculatePriceWithFee(product.price);
  const originalPriceWithFee = product.originalPrice ? calculatePriceWithFee(product.originalPrice) : null;
  const savings = originalPriceWithFee 
    ? ((originalPriceWithFee - priceWithFee) / originalPriceWithFee * 100).toFixed(0)
    : null;

  const filteredRelatedProducts = relatedProducts.filter(p => p.id !== product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Product Details */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <>
                <img
                  src={product.images[currentImageIndex]}
                  alt={product.title}
                  className="w-full h-96 object-cover"
                />
                {product.images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-1/2 left-2 transform -translate-y-1/2"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-1/2 right-2 transform -translate-y-1/2"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {savings && (
                  <Badge className="absolute top-4 left-4 bg-accent text-white">
                    {savings}% off
                  </Badge>
                )}
              </>
            ) : (
              <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                <Package className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    index === currentImageIndex ? 'border-primary' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="secondary">{product.category.name}</Badge>
              <Badge variant="outline">{product.condition}</Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-bold text-primary">
                ${formatPriceWithFee(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-gray-500 line-through">
                  ${formatPriceWithFee(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          <Separator />

          {/* Seller Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={product.store.user.avatar || ''} alt={sellerName} />
                  <AvatarFallback>
                    {product.store.user.firstName[0]}{product.store.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{sellerName}</h4>
                    <Badge variant="outline" className="text-xs">Seller</Badge>
                  </div>
                  <Link href={`/store/${product.store.id}`}>
                    <p className="text-sm text-primary hover:underline">{product.store.name}</p>
                  </Link>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{product.store.university}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleAddToCart}
              disabled={!product.isAvailable || !user}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {product.isAvailable ? 'Add to Cart' : 'Sold Out'}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleContactSeller}
                disabled={!user || createMessageMutation.isPending}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {createMessageMutation.isPending ? 'Sending...' : 'Contact'}
              </Button>
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <Link href="/auth" className="font-medium underline">Sign in</Link> to add items to cart and contact sellers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {filteredRelatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {filteredRelatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
