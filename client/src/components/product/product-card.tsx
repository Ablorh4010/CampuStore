import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MapPin, Video, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import type { ProductWithStore } from '@shared/schema';
import { useState } from 'react';

interface ProductCardProps {
  product: ProductWithStore;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
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
      <Card className="overflow-hidden group hover-lift border-none shadow-sm bg-white rounded-[2rem] transition-all duration-500 hover:shadow-xl hover:shadow-[#2E5BFF]/5">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {!imgError ? (
            <img
              src={product.mediaGifUrl || product.images[0]}
              alt={product.title}
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <Package className="h-12 w-12 mb-2 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.mediaGifUrl && (
              <div className="bg-[#2E5BFF]/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                <Video className="w-3 h-3" /> Showcase
              </div>
            )}
            {parseFloat(product.price) < 20 && (
              <Badge className="bg-[#B2FCE4] text-[#2E5BFF] border-none font-black text-[10px] shadow-lg">STUDENT DEAL</Badge>
            )}
          </div>

          <Button
            size="icon"
            className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl h-12 w-12 bg-white text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white shadow-2xl border-none"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-5 w-5 font-black" />
          </Button>
        </div>
        
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
             <h3 className="font-black text-gray-900 leading-tight group-hover:text-[#2E5BFF] transition-colors">
               {product.title}
             </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-black text-[#2E5BFF]">
              ${formatPriceWithFee(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-300 line-through font-bold">
                ${formatPriceWithFee(product.originalPrice)}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between text-[11px] font-black text-gray-400 pt-4 border-t border-gray-50 uppercase tracking-widest">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[8px]">{product.store.user.firstName?.[0]}</div>
               <span className="text-gray-900">{sellerName}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-secondary" />
              <span>{product.store.university}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
