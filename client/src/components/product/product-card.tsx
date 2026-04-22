import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MapPin, Video } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import type { ProductWithStore } from '@shared/schema';

interface ProductCardProps {
  product: ProductWithStore;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      await addToCart(product.id);
    }
  };

  const sellerName = `${product.store.user.firstName} ${product.store.user.lastName?.[0] || ''}.`;
  
  const calculatePriceWithFee = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice + (numPrice * 0.05); // 5% service fee
  };

  const formatPriceWithFee = (price: string | number) => {
    return calculatePriceWithFee(price).toFixed(2);
  };

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden group hover-lift border-none shadow-sm bg-white rounded-[2rem]">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={product.mediaGifUrl || product.images[0]}
            alt={product.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
          {product.mediaGifUrl && (
            <div className="absolute top-3 left-3 bg-primary/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Video className="w-2.5 h-2.5" /> Showcase
            </div>
          )}
          {user && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 shadow-lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <CardContent className="p-5">
          <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
            {product.title}
          </h3>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter mb-3">{product.condition}</p>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-black text-primary">
              ${formatPriceWithFee(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through font-bold">
                ${formatPriceWithFee(product.originalPrice)}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-3 border-t">
            <span className="flex items-center gap-1">by <span className="text-gray-900">{sellerName}</span></span>
            <div className="flex items-center space-x-1">
              <MapPin className="h-2.5 w-2.5 text-secondary" />
              <span>{product.store.university}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
