import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MapPin } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPriceWithFee, calculatePriceWithFee } from '@/lib/utils';
import type { ProductWithStore } from '@shared/schema';

interface ProductCardProps {
  product: ProductWithStore;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      await addToCart(product.id);
    }
  };

  const sellerName = `${product.store.user.firstName} ${product.store.user.lastName[0]}.`;
  const priceWithFee = calculatePriceWithFee(product.price);
  const originalPriceWithFee = product.originalPrice ? calculatePriceWithFee(product.originalPrice) : null;
  const savings = originalPriceWithFee 
    ? ((originalPriceWithFee - priceWithFee) / originalPriceWithFee * 100).toFixed(0)
    : null;

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="product-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="relative">
          {product.images && product.images.length > 0 && (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {savings && (
            <Badge className="absolute top-2 left-2 bg-accent text-white">
              {savings}% off
            </Badge>
          )}
          {user && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {product.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{product.condition}</p>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-primary">
              ${formatPriceWithFee(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                ${formatPriceWithFee(product.originalPrice)}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>by {sellerName}</span>
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>{product.store.university}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
