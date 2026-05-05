import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Store, 
  MapPin, 
  ShieldCheck,
  CreditCard,
  Users,
  Search,
  Zap,
  Star,
  Clock,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Sparkles,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/product/product-card';
import { useAuth } from '@/lib/auth-context';
import type { ProductWithStore, StoreWithUser, Category, CampusActivityWithUser, WeeklyDealWithProduct } from '@shared/schema';

// High-quality category thumbnails for a modern, innovative look
const CATEGORY_IMAGES: Record<string, string> = {
  'Electronics': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=300', // MacBook/Laptop
  'Academic': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=300', // Books
  'Fashion': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=300', // Sneaker
  'Home & Dorm': 'https://media.gettyimages.com/id/1335426353/video/day-of-a-college-student.jpg?s=640x640&k=20&c=eaHlwkXJGGDCKQn9jOu1u-DcZiRLhfDPcJgfwJMfj8E=', // Modern Desk Lamp/Chair
  'Home & Dormitory': 'https://media.gettyimages.com/id/1335426353/video/day-of-a-college-student.jpg?s=640x640&k=20&c=eaHlwkXJGGDCKQn9jOu1u-DcZiRLhfDPcJgfwJMfj8E=',
  'Home and Decor': 'https://media.gettyimages.com/id/1335426353/video/day-of-a-college-student.jpg?s=640x640&k=20&c=eaHlwkXJGGDCKQn9jOu1u-DcZiRLhfDPcJgfwJMfj8E=',
  'Home': 'https://media.gettyimages.com/id/1335426353/video/day-of-a-college-student.jpg?s=640x640&k=20&c=eaHlwkXJGGDCKQn9jOu1u-DcZiRLhfDPcJgfwJMfj8E=',
  'Sports & Leisure': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=300', // Fitness
  'Services': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=300', // Work/Desk
  'Phones': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=300', // Smartphone
  'Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=300', // Skincare
};

const getCategoryImage = (name: string) => {
  // Normalize name by removing special chars for matching
  const normalizedName = name.replace(/[&]/g, 'and').toLowerCase();
  
  // Try exact match first
  if (CATEGORY_IMAGES[name]) return CATEGORY_IMAGES[name];
  
  // Try matching normalized keys
  const match = Object.entries(CATEGORY_IMAGES).find(([key]) => {
    const normalizedKey = key.replace(/[&]/g, 'and').toLowerCase();
    return normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName);
  });

  return match ? match[1] : 'https://images.unsplash.com/photo-1586769852044-692d6e3703a0?auto=format&fit=crop&q=80&w=300';
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const isGh = window.location.pathname.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    loop: false,
    dragFree: true
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const { data: featuredProducts = [], isLoading: productsLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products/featured', user?.university, user?.city, user?.campus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
      return fetch(`/api/products/featured?${params}`).then(res => res.json());
    },
  });

  const { data: featuredStores = [], isLoading: storesLoading } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/stores/featured', user?.university, user?.city, user?.campus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
      return fetch(`/api/stores/featured?${params}`).then(res => res.json());
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: campusActivity = [], isLoading: activityLoading } = useQuery<CampusActivityWithUser[]>({
    queryKey: ['/api/campus-activity', user?.university],
    queryFn: () => {
       const params = new URLSearchParams();
       if (user?.university) params.append('university', user.university);
       return fetch(`/api/campus-activity?${params}`).then(res => res.json());
    }
  });

  const { data: weeklyDeals = [], isLoading: dealsLoading } = useQuery<WeeklyDealWithProduct[]>({
    queryKey: ['/api/weekly-deals'],
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Redesigned for Maximum Impact */}
      <section className="relative overflow-hidden bg-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                <Sparkles className="w-3 h-3" />
                <span>2026 University Marketplace</span>
              </div>
              <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-gray-900 leading-[0.9] mb-8 uppercase">
                BUY. SELL. <br />
                <span className="text-primary italic">STUDENT LIFE.</span>
              </h1>
              <p className="text-lg text-gray-500 font-medium leading-relaxed mb-10 max-w-lg">
                The ultimate marketplace built for every student. From universities to training colleges, trade securely with verified IDs, on-campus pickups, and 24/7 WhatsApp support. Every student buyer is accepted.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="h-16 px-10 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-black/20 group active:scale-95 transition-all"
                  onClick={() => setLocation(`${basePrefix}/browse`)}
                >
                  Start Shopping
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-16 px-10 rounded-2xl border-2 border-gray-100 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 active:scale-95 transition-all"
                  onClick={() => setLocation('/seller-auth')}
                >
                  Open Your Store
                </Button>
              </div>
              
              <div className="mt-12 flex items-center space-x-6">
                 <div className="flex -space-x-3">
                    {[
                      "photo-1531123897727-8f129e1688ce",
                      "photo-1506277886164-e25aa3f4ef7f",
                      "photo-1521572267360-ee0c2909d518",
                      "photo-1523910088385-d313124c68aa"
                    ].map((id, i) => (
                       <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
                          <img 
                            src={`https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=100&h=100`} 
                            alt="Student face"
                            className="w-full h-full object-cover"
                          />
                       </div>
                    ))}
                 </div>
                 <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span className="text-black font-black">10,000+</span> Students Trust Us
                 </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end relative mt-16 lg:mt-0">
               {/* iPhone Frame for Weekly Deals - Positioned Beside Hero Text */}
               {weeklyDeals.length > 0 && (
                  <motion.div 
                     initial={{ x: 50, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ duration: 0.8 }}
                     className="relative w-[300px] h-[600px] bg-[#1a1a1a] rounded-[3.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-[#333] overflow-hidden group z-20"
                  >
                     {/* Speaker/Camera Notch */}
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#333] rounded-b-2xl z-30 flex items-center justify-center gap-2">
                        <div className="w-8 h-1 bg-white/10 rounded-full"></div>
                        <div className="w-2 h-2 bg-white/10 rounded-full"></div>
                     </div>

                     {/* Screen Content */}
                     <div className="relative h-full w-full bg-white rounded-[2.8rem] overflow-hidden flex flex-col">
                        <div className="p-5 pt-10 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                           <h4 className="font-black uppercase tracking-tighter text-[11px]">Deals of the Week</h4>
                           <Badge className="bg-primary text-black font-black text-[7px] uppercase px-2 py-0.5 rounded-full animate-pulse">Live Now</Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
                           {weeklyDeals.map((deal) => (
                              <Link key={deal.id} href={`${basePrefix}/product/${deal.productId}`}>
                                 <div className="bg-gray-50 rounded-2xl p-3 border border-transparent hover:border-primary/20 transition-all cursor-pointer group/deal">
                                    <div className="flex gap-4 items-center">
                                       <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                                          <img 
                                             src={deal.product.images[0]} 
                                             alt="" 
                                             className="w-full h-full object-cover group-hover/deal:scale-110 transition-transform duration-500" 
                                          />
                                       </div>
                                       <div className="min-w-0">
                                          <h4 className="text-gray-900 font-black text-[10px] uppercase truncate mb-1">{deal.product.title}</h4>
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className="text-primary font-black text-xs">GH₵{deal.dealPrice}</span>
                                             <span className="text-gray-300 line-through text-[8px]">GH₵{deal.product.price}</span>
                                          </div>
                                          <Badge className="bg-primary/10 text-primary border-none font-black text-[7px] uppercase tracking-widest px-2 py-0.5">
                                             -{deal.discountPercentage}% OFF
                                          </Badge>
                                       </div>
                                    </div>
                                 </div>
                              </Link>
                           ))}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                           <Button className="w-full h-10 rounded-xl bg-black text-white font-black uppercase tracking-widest text-[8px]">
                              View Catalog
                           </Button>
                        </div>
                     </div>
                  </motion.div>
               )}

               {/* Floating elements for visual interest */}
               <div className="absolute top-1/4 -right-12 w-24 h-24 bg-primary/20 rounded-3xl rotate-12 blur-xl animate-pulse"></div>
               <div className="absolute bottom-1/4 -left-12 w-32 h-32 bg-secondary/20 rounded-full blur-xl animate-pulse delay-700"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Hub Circle Scroll - Redesigned for Space Efficiency & Innovation */}
      <section className="py-12 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-none">The Marketplaces.</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">Swipe to explore campus hubs</p>
            </div>
            <Link href={`${basePrefix}/browse`}>
              <Button variant="link" className="font-black uppercase tracking-widest text-[9px] p-0 h-auto group">
                Browse All <ArrowRight className="ml-1 w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <div className="flex overflow-x-auto scrollbar-hide gap-6 sm:gap-10 pb-4 px-2 -mx-2">
            {categoriesLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-3">
                  <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full" />
                  <Skeleton className="w-12 h-2 rounded-full" />
                </div>
              ))
            ) : (
              categories.filter(c => !c.parentId).map((category) => (
                <Link key={category.id} href={`${basePrefix}/browse?categoryId=${category.id}`}>
                  <div className="group cursor-pointer flex-shrink-0 flex flex-col items-center gap-4 w-20 sm:w-24">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                      {/* Background Circle with Glassmorphism */}
                      <div className={`absolute inset-0 rounded-full ${category.color || 'bg-gray-100'} opacity-30 group-hover:opacity-50 transition-all duration-500 scale-90 group-hover:scale-100`} />
                      
                      {/* Interactive Glow Effect */}
                      <div className="absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/10 blur-xl transition-all duration-500" />
                      
                      {/* Category Image - "Floating" out of the circle */}
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                         <img 
                           src={getCategoryImage(category.name)} 
                           alt={category.name}
                           className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-2xl transform group-hover:scale-125 group-hover:-translate-y-2 transition-all duration-500"
                         />
                      </div>

                      {/* Floating Mini Icon */}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-50 transform group-hover:rotate-12 transition-transform">
                        <i className={`${category.icon} text-[10px] text-gray-900`} />
                      </div>
                    </div>
                    
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors text-center leading-tight">
                      {category.name}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Scrolling Announcement Bar - Repositioned and Styled */}
      <div className="bg-gray-100 overflow-hidden py-3 border-y border-gray-200 shadow-sm">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ 
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 40,
              ease: "linear",
            },
          }}
          className="flex whitespace-nowrap"
        >
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center mx-16 text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-4 border-2 border-white shadow-md flex-shrink-0 bg-primary/10 flex items-center justify-center">
                 <Truck className="w-4 h-4 text-primary" />
              </div>
              <span>Free delivery for items across all campuses and schools</span>
              <span className="mx-8 text-primary font-black opacity-40">•</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Featured Products - Carousel Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary">New Arrivals</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-[0.8]">
                TRENDING <br />EXPLORATIONS.
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full h-12 w-12 border-2"
                  onClick={scrollPrev}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full h-12 w-12 border-2"
                  onClick={scrollNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <Link href={`${basePrefix}/browse`}>
                 <Button variant="link" className="font-black uppercase tracking-widest text-[10px] p-0 h-auto group">
                   See Catalog <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-4">
              {productsLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="flex-[0_0_80%] sm:flex-[0_0_40%] lg:flex-[0_0_25%] pl-4">
                    <Skeleton className="h-[400px] rounded-3xl" />
                  </div>
                ))
              ) : (
                featuredProducts.map((product) => (
                  <div key={product.id} className="flex-[0_0_80%] sm:flex-[0_0_40%] lg:flex-[0_0_25%] pl-4">
                    <ProductCard product={product} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bɔkɔɔ Pay Section - New & Innovative - Reduced Height */}
      <section className="py-12 bg-black text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <Badge className="bg-primary text-black font-black text-[10px] uppercase px-3 py-1 mb-4 rounded-full">Financial Freedom</Badge>
              <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
                BƆKƆƆ <br />
                <span className="text-primary italic">PAY.</span>
              </h2>
              <p className="text-lg text-gray-400 font-medium leading-relaxed mb-8 max-w-lg">
                Buy today, pay over time. Split your purchase into 4 easy payments with 0% interest.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-white">0%</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Interest</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-white">4</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Payments</p>
                </div>
              </div>

              <Button 
                size="lg" 
                className="h-14 px-8 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all"
                onClick={() => setLocation(`${basePrefix}/browse?installment=true`)}
              >
                Browse Items
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="mt-12 lg:mt-0 relative">
              <div className="relative bg-gray-900 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">1</div>
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[9px] text-white">Choose Bɔkɔɔ Pay</h4>
                      <p className="text-[8px] text-gray-500 font-bold">Select at checkout</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">2</div>
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[9px] text-white">Quick Verify</h4>
                      <p className="text-[8px] text-gray-500 font-bold">Done in &lt; 2 mins</p>

                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">3</div>
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[9px] text-white">Pay Slowly</h4>
                      <p className="text-[8px] text-gray-500 font-bold">Spread over 4 months</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Activity Feed - Compact */}
      <section className="py-12 bg-white border-y border-gray-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
               <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Campus Pulse.</h2>
               <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">What's happening at {user?.university || 'your university'}</p>
            </div>

            <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-6 pb-4 scrollbar-hide snap-x">
               {activityLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="flex-shrink-0 w-[280px] md:w-auto h-40 rounded-3xl" />)
               ) : !Array.isArray(campusActivity) || campusActivity.length === 0 ? (
                  <div className="col-span-full text-center py-10">
                     <p className="text-gray-400 font-medium italic text-xs">No recent activity.</p>
                  </div>
               ) : (
                  campusActivity.slice(0, 3).map((activity) => (
                     <div key={activity.id} className="flex-shrink-0 w-[280px] md:w-auto bg-gray-50/50 rounded-3xl p-5 border border-transparent hover:border-gray-100 transition-all group snap-start">
                        <div className="flex items-center gap-2 mb-3 text-[8px] font-black uppercase tracking-widest text-primary">
                           <Zap className="w-2.5 h-2.5" />
                           {activity.activityType || 'Update'}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tighter text-gray-900 mb-2 leading-tight line-clamp-2">{activity.title}</h3>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-2">{activity.content}</p>
                     </div>
                  ))
               )}
            </div>
         </div>
      </section>

      {/* Featured Stores - Compact Grid/Scroll - Reduced Height */}
      <section className="py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-none">HUB <br />VENDORS.</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">Top performers</p>
            </div>
            <Link href={`${basePrefix}/browse?view=stores`}>
               <Button variant="link" className="font-black uppercase tracking-widest text-[10px] p-0 h-auto group">
                 All Stores <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
               </Button>
            </Link>
          </div>

          <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 pb-6 scrollbar-hide snap-x">
            {storesLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="flex-shrink-0 w-[300px] md:w-auto h-64 rounded-3xl" />)
            ) : (
              featuredStores.map((store) => (
                <Link key={store.id} href={`${basePrefix}/store/${store.id}`}>
                  <Card className="flex-shrink-0 w-[300px] md:w-auto group cursor-pointer rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-white snap-start">
                    <CardContent className="p-0">
                      <div className="h-24 bg-gray-100 relative overflow-hidden">
                        {store.bannerUrl ? (
                          <img src={store.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10" />
                        )}
                      </div>
                      <div className="px-6 pb-8 -mt-8 relative z-10">
                        <div className="flex justify-between items-end mb-4">
                           <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white">
                              {store.logoUrl ? (
                                <img src={store.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <div className="w-full h-full bg-black text-white flex items-center justify-center font-black rounded-xl text-lg">
                                  {store.name[0]}
                                </div>
                              )}
                           </div>
                           <div className="flex gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map(i => (
                                 <Star key={i} className={`w-2 h-2 ${i <= (store.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                              ))}
                           </div>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-1 group-hover:text-primary transition-colors truncate">{store.name}</h3>
                        <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-gray-400 gap-1.5 mb-3">
                          <MapPin className="h-2.5 w-2.5" />
                          {store.university}
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-2 leading-relaxed h-8 mb-6">{store.description}</p>
                        <Button className="w-full h-10 rounded-xl bg-gray-50 text-black border border-gray-100 font-black uppercase tracking-widest text-[9px] group-hover:bg-black group-hover:text-white transition-all">
                          Enter Store
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Trust Badges - Hidden on mobile */}
      <section className="py-20 border-t border-gray-50 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid md:grid-cols-4 gap-12">
              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                 </div>
                 <h4 className="font-black uppercase tracking-widest text-xs mb-2">Verified Sellers</h4>
                 <p className="text-gray-400 text-xs font-medium">All student IDs are verified</p>
              </div>
              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <MapPin className="w-8 h-8 text-primary" />
                 </div>
                 <h4 className="font-black uppercase tracking-widest text-xs mb-2">Campus Pickup</h4>
                 <p className="text-gray-400 text-xs font-medium">Safe meeting spots on campus</p>
              </div>
              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <CreditCard className="w-8 h-8 text-primary" />
                 </div>
                 <h4 className="font-black uppercase tracking-widest text-xs mb-2">Secure Pay</h4>
                 <p className="text-gray-400 text-xs font-medium">Funds held until you receive items</p>
              </div>
              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8 text-primary" />
                 </div>
                 <h4 className="font-black uppercase tracking-widest text-xs mb-2">Student Community</h4>
                 <p className="text-gray-400 text-xs font-medium">Exclusive to your university</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
