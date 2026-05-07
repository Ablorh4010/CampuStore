import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
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
  Package,
  Sparkles,
  Truck,
  RotateCcw,
  ShieldCheck,
  Wallet,
  ChevronDown,
  Video,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import ProductCard from '@/components/product/product-card';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { calculatePriceWithFee, formatPriceWithFee } from '@/lib/utils';
import { handleShare } from '@/lib/share-utils';
import type { ProductWithStore, OrderWithDetails } from '@shared/schema';
import SEO from '@/components/seo/SEO';


export default function Product() {
  const [location] = useLocation();
  const match = location.match(/\/product\/(\d+)/);
  const productId = match ? parseInt(match[1]) : null;
  
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<ProductWithStore>({
    queryKey: ['/api/products', productId],
    enabled: !!productId,
  });

  const { data: purchases = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/buyer', user?.id],
    enabled: !!user,
  });

  const hasPurchasedFromSeller = purchases.some(order => order.sellerId === product?.store.userId);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrentMediaIndex(api.selectedScrollSnap());
    });
  }, [api]);

  const rawMedia = product ? [
    ...(product.mediaGifUrl ? [product.mediaGifUrl] : []),
    ...(product.images || [])
  ].filter(url => !!url && url.trim() !== '' && url !== 'uploaded') : [];
  
  const isVideo = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$|^https?:\/\/.*(video|mp4|webm|mov).*/i);
  };

  const mediaItems = rawMedia.length > 0 ? rawMedia : ['/placeholder-product.png'];

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products', productId, 'suggestions'],
    enabled: !!productId,
  });

  const { data: relatedProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products', { categoryId: product?.categoryId, limit: 4 }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (product?.categoryId) params.append('categoryId', product.categoryId.toString());
      params.append('limit', '4');
      return fetch(`/api/products?${params.toString()}`).then(res => res.json());
    },
    enabled: !!product?.categoryId,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: { toId: number; productId: number; content: string }) => {
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
        description: 'Your message has been sent to the seller.',
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

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addToCart(product.id);
      toast({
        title: 'Added to Bag',
        description: `${product.title} has been added to your bag.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to bag.',
        variant: 'destructive',
      });
    }
  };

  const { data: whatsapp1 } = useQuery<{ value: string }>({ 
    queryKey: ['/api/admin/config/whatsapp_support_1'] 
  });

  const handleContactSeller = () => {
    if (!product) return;

    const adminWhatsApp = whatsapp1?.value || '233240000001';
    const cleanNumber = adminWhatsApp.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi Admin! I'm interested in the product: ${product.title} (ID: ${product.id}). Can you help me connect with the seller or provide more details?`);
    
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    window.open(url, '_blank');
  };

  const onShareClick = async () => {
    if (!product) return;
    
    handleShare({
      title: product.title,
      text: `🔥 Check out this ${product.title} for GH₵${product.price} at ${product.store.name} on The Hub Ghana!`,
      url: `/product/${product.id}${user ? `?ref=${user.id}` : ''}`
    });
  };

  const nextMedia = () => {
    if (api) api.scrollNext();
    else if (mediaItems.length > 0) {
      setCurrentMediaIndex((prev) => prev === mediaItems.length - 1 ? 0 : prev + 1);
    }
  };

  const prevMedia = () => {
    if (api) api.scrollPrev();
    else if (mediaItems.length > 0) {
      setCurrentMediaIndex((prev) => prev === 0 ? mediaItems.length - 1 : prev - 1);
    }
  };

  const scrollToMedia = (index: number) => {
    setCurrentMediaIndex(index);
    api?.scrollTo(index);
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="flex gap-4">
            <div className="hidden lg:flex flex-col gap-4 w-20">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-[600px] flex-1 rounded-2xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-8 w-1/2 rounded-full" />
            <Skeleton className="h-12 w-3/4 rounded-full" />
            <Skeleton className="h-10 w-1/4 rounded-full" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <Package className="h-20 w-20 text-gray-200 mx-auto mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-400 font-bold uppercase text-xs mb-8">It might have been sold or removed.</p>
          <Link href="/browse">
            <Button className="rounded-xl h-12 px-8 bg-black font-black uppercase tracking-widest text-xs">Browse Shop</Button>
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

  const productSchema = product ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": mediaItems[0],
    "description": product.description,
    "brand": { "@type": "Brand", "name": product.store.name },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "GHS",
      "price": product.price,
      "itemCondition": product.condition === 'new' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": product.store.name }
    }
  } : undefined;

  return (
    <div className="bg-white min-h-screen">
      {product && (
        <SEO 
          title={product.title}
          description={`${product.title} for GH₵${product.price} at ${product.store.name} on The Hub. ${product.description.substring(0, 150)}...`}
          image={mediaItems[0]}
          video={rawMedia.find(m => m.endsWith('.mp4') || m.endsWith('.mov') || m.endsWith('.webm'))}
          price={product.price}
          type="product"
          keywords={`${product.title}, buy ${product.title} ghana, ${product.store.university} marketplace`}
          schemaData={productSchema}
        />
      )}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
           <Link href="/browse" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors flex items-center gap-2">
             <ChevronLeft className="w-3 h-3" /> Back to Market
           </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:flex flex-col gap-3 w-24 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {mediaItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => scrollToMedia(index)}
                  className={`aspect-[3/4] rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-300 ${
                    index === currentMediaIndex ? 'border-black' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  {isVideo(item) ? (
                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                      <Video className="w-6 h-6 text-white opacity-50" />
                      <video src={item} className="absolute inset-0 w-full h-full object-cover" muted />
                    </div>
                  ) : (
                    <img src={item} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 relative aspect-[3/4] bg-gray-50 rounded-3xl overflow-hidden group">
               <Carousel setApi={setApi} className="w-full h-full">
                  <CarouselContent className="h-full ml-0">
                    {mediaItems.map((item, index) => (
                      <CarouselItem key={index} className="pl-0 h-full">
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo(item) ? (
                            <video src={item} className="w-full h-full object-cover" controls autoPlay={index === currentMediaIndex} muted loop />
                          ) : (
                            <img src={item || '/placeholder-product.png'} alt={product.title} className="w-full h-full object-cover transition-transform duration-1000" />
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {mediaItems.length > 1 && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                      <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-xl pointer-events-auto lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={prevMedia}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="icon" className="rounded-full bg-white/90 shadow-xl pointer-events-auto lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={nextMedia}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
               </Carousel>

               {savings && (
                  <div className="absolute top-6 left-6 z-10">
                    <Badge className="bg-black text-white border-none font-black text-xs px-4 py-1.5 rounded-lg shadow-xl uppercase tracking-widest">{savings}% Off</Badge>
                  </div>
               )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{product.category.name}</span>
                <div className="w-1 h-1 rounded-full bg-gray-200" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{product.condition}</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight leading-none mb-6">{product.title}</h1>
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-3xl font-black text-black">{formatPriceWithFee(product.price)}</span>
                {product.originalPrice && <span className="text-xl text-gray-300 line-through font-bold">{formatPriceWithFee(product.originalPrice)}</span>}
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 flex items-center justify-between group cursor-help transition-all hover:border-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><Wallet className="w-5 h-5" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">BƆKƆƆ Pay™ • 4 Installments</p>
                    <p className="text-xs font-black">4 payments of GH₵{(priceWithFee / 4).toFixed(2)} with <span className="text-primary italic font-black">BƆKƆƆ Pay™.</span></p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <Button size="lg" className="w-full h-16 bg-black hover:bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-black/10 transition-all active:scale-[0.98]" onClick={handleAddToCart} disabled={!product.isAvailable}>
                <ShoppingCart className="mr-3 h-5 w-5" />
                {product.isAvailable ? (product.isDigital ? 'Buy eBook / PDF' : 'Add to Bag') : 'Sold Out'}
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-14 rounded-2xl border-gray-200 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50" onClick={handleContactSeller} disabled={createMessageMutation.isPending}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {createMessageMutation.isPending ? 'Sending...' : 'Contact Seller'}
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl border-gray-200 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50" onClick={onShareClick}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Item
                </Button>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full border-t border-gray-100">
              <AccordionItem value="description" className="border-b border-gray-100">
                <AccordionTrigger className="font-black uppercase tracking-widest text-xs py-6 hover:no-underline">Description & Notes</AccordionTrigger>
                <AccordionContent className="text-gray-500 font-medium leading-relaxed pb-6">{product.description}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="details" className="border-b border-gray-100">
                <AccordionTrigger className="font-black uppercase tracking-widest text-xs py-6 hover:no-underline">Product Details</AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid grid-cols-2 gap-y-4 text-sm font-bold">
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Category</p>{product.category.name}</div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Condition</p>{product.condition}</div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Store</p><Link href={`/store/${product.store.id}`} className="hover:underline">{product.store.name}</Link></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</p>{product.store.university}</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {suggestions.length > 0 && (
          <section className="mt-24 pt-12 border-t border-gray-100">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-10">Better Deals for You.</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {suggestions.map((suggestion) => <ProductCard key={suggestion.id} product={suggestion} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
