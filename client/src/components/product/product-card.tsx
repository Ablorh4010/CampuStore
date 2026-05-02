import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MapPin, Video, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import type { ProductWithStore } from '@shared/schema';
import { useState } from 'react';
import { formatPriceWithFee, calculatePriceWithFee } from '@/lib/utils';

interface ProductCardProps {
  product: ProductWithStore;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [location] = useLocation();

  const isGh = location.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
  };

  const sellerName = `${product.store.user.firstName} ${product.store.user.lastName?.[0] || ''}.`;
  
  const isVideo = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$|^https?:\/\/.*video.*/i);
  };

  // Filter valid images and media
  const validImages = (product.images || []).filter(url => !!url && url.trim() !== '' && url !== 'uploaded');
  const hasValidGif = !!product.mediaGifUrl && product.mediaGifUrl.trim() !== '' && product.mediaGifUrl !== 'uploaded';

  // Prefer first valid image for non-hovered thumbnail to ensure something is visible
  // If no images, use mediaGifUrl. If neither, use placeholder.
  const staticThumbnail = validImages.length > 0 
    ? validImages[0] 
    : (hasValidGif ? product.mediaGifUrl! : '/placeholder-product.png');

  // On hover, if there's a GIF/Video, show it. Otherwise show second image if available.
  const displayImage = isHovered 
    ? (hasValidGif ? product.mediaGifUrl! : (validImages.length > 1 ? validImages[1] : staticThumbnail))
    : staticThumbnail;

  const productLink = user 
    ? `${basePrefix}/product/${product.id}?ref=${user.id}`
    : `${basePrefix}/product/${product.id}`;

  const isCurrentMediaVideo = isVideo(displayImage);

  return (
    <Link href={productLink}>
      <div 
        className="group relative flex flex-col h-full cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-2xl mb-4 transition-all duration-500">
          {!imgError ? (
            isCurrentMediaVideo ? (
              <video
                src={displayImage}
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={displayImage}
                alt={product.title}
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                onError={() => setImgError(true)}
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <Package className="h-12 w-12 mb-2 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Image</span>
            </div>
          )}
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.mediaGifUrl && (
              <div className="bg-white/90 backdrop-blur-md text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Video className="w-3 h-3" /> Showcase
              </div>
            )}
            {parseFloat(product.price) < 20 && (
              <Badge className="bg-black text-white border-none font-black text-[10px] px-3 py-1">STUDENT DEAL</Badge>
            )}
          </div>

          <Button
            size="sm"
            className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 rounded-xl h-10 bg-black text-white hover:bg-gray-800 font-black text-xs uppercase tracking-widest"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3 w-3 mr-2" /> Add to Bag
          </Button>
        </div>
        
        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
             <h3 className="font-black text-[13px] text-gray-900 leading-tight uppercase tracking-tight line-clamp-2">
               {product.title}
             </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[15px] font-black text-black">
              {formatPriceWithFee(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[12px] text-gray-400 line-through font-bold">
                {formatPriceWithFee(product.originalPrice)}
              </span>
            )}
          </div>
          
          <div className="mt-auto pt-3 flex items-center gap-1.5 border-t border-gray-50">
             <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[7px] font-black uppercase">{product.store.user.firstName?.[0]}</div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{product.store.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
