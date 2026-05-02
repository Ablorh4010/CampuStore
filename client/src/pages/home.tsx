import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  ArrowRight, 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  Users,
  Search,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/product/product-card';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { ProductWithStore, StoreWithUser, Category, WeeklyDealWithProduct, CampusActivityWithUser } from '@shared/schema';

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bokooIndex, setBokooIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const bokooSlides = [
    { title: "Buy Now. Pay Later.", desc: "Split your payments into 4 easy installments.", icon: <Wallet className="w-6 h-6" /> },
    { title: "0% Interest.", desc: "No hidden fees, no extra costs. Just pure campus convenience.", icon: <Zap className="w-6 h-6 text-yellow-400" /> },
    { title: "Quick Approval.", desc: "Get approved in minutes with our secure campus verification.", icon: <ShieldCheck className="w-6 h-6 text-green-400" /> }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBokooIndex((prev) => (prev + 1) % bokooSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const { data: deals = [], isLoading: dealsLoading } = useQuery<WeeklyDealWithProduct[]>({
    queryKey: ['/api/weekly-deals'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
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

  const handleImageError = (id: string) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const isGh = window.location.pathname.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';

  useEffect(() => {
    if (deals.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % deals.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [deals.length]);

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

  const handleShareHub = async () => {
    // Add referral code if user is logged in
    const shareUrl = new URL(window.location.origin);
    if (user) {
      shareUrl.searchParams.set('ref', user.id.toString());
    }

    const shareData = {
      title: 'The University Hub',
      text: 'Join Africa\'s leading student marketplace. Buy, sell, and discover everything campus!',
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ title: 'Shared!', description: 'The University Hub link shared successfully.' });
      } else {
        await navigator.clipboard.writeText(shareUrl.toString());
        toast({ title: 'Link Copied', description: 'The University Hub link with your referral code copied to clipboard.' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGetStarted = () => {
    const exploreUrl = user ? `/gh/browse?ref=${user.id}` : '/gh/browse';
    setLocation(exploreUrl);
  };

  const currentDeal = deals[currentIndex];

  const bokooLink = user ? `/gh/browse?installment=true&ref=${user.id}` : "/gh/browse?installment=true";
  const exploreLink = user ? `/gh/browse?ref=${user.id}` : "/gh/browse";

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner / Share Hub */}
      <div className="bg-black py-2 px-4 text-center">
         <button 
           onClick={handleShareHub}
           className="text-[10px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
         >
           <ExternalLink className="w-3 h-3" /> Invite your friends & earn rewards
         </button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 z-0">
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left animate-reveal-up">
              <Badge className="mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px]">
                Built for {user?.university || 'Your Campus'}
              </Badge>
              <h1 className="text-5xl lg:text-8xl font-black font-heading tracking-tighter text-gray-900 leading-[0.9] mb-8">
                UPGRADE YOUR <br />
                <span className="text-primary italic">CAMPUS LIFE.</span>
              </h1>
              <p className="text-xl text-gray-500 font-medium mb-10 max-w-xl mx-auto lg:mx-0">
                The ultimate marketplace for students. Buy gear, sell your old textbooks, and discover what's happening on campus today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button onClick={handleGetStarted} size="lg" className="h-16 px-10 rounded-2xl bg-black text-white font-black text-lg shadow-2xl shadow-black/20 hover:scale-105 transition-all">
                  Start Shopping <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button onClick={() => setLocation('/seller-auth')} size="lg" variant="outline" className="h-16 px-10 rounded-2xl border-2 border-gray-100 font-black text-lg hover:bg-gray-50 transition-all">
                   List an Item
                </Button>
              </div>
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8">
                 <div className="text-center">
                    <p className="text-3xl font-black text-gray-900 leading-none">5k+</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Students</p>
                 </div>
                 <div className="w-px h-8 bg-gray-100"></div>
                 <div className="text-center">
                    <p className="text-3xl font-black text-gray-900 leading-none">12k+</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Items Sold</p>
                 </div>
                 <div className="w-px h-8 bg-gray-100"></div>
                 <div className="text-center">
                    <p className="text-3xl font-black text-gray-900 leading-none">100%</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Secure</p>
                 </div>
              </div>
            </div>

            <div className="relative animate-reveal-up delay-200">
               {dealsLoading ? (
                 <Skeleton className="aspect-[4/5] w-full rounded-[3rem]" />
               ) : currentDeal && (
                 <div className="relative group">
                    <div className="absolute inset-0 bg-black rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <div className="relative aspect-[4/5] bg-gray-100 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                       <img 
                         src={currentDeal.product.images[0]} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                         alt={currentDeal.product.title} 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                       <div className="absolute bottom-4 left-4 right-4">
                          <p className="text-white font-black text-lg leading-tight mb-1">{currentDeal.product.title}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-secondary font-black text-xl">GH₵{currentDeal.product.price}</span>
                             <span className="text-white/60 line-through text-xs font-bold">GH₵{currentDeal.product.originalPrice || (parseFloat(currentDeal.product.price) * 1.5).toFixed(2)}</span>
                          </div>
                       </div>
                    </div>

                    <Link href={`${basePrefix}/product/${currentDeal.productId}${user ? `?ref=${user.id}` : ''}`}>
                      <Button className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg">
                         Shop This Deal
                      </Button>
                    </Link>

                    <div className="mt-4 flex justify-center gap-1.5">
                       {deals.map((_, i) => (
                          <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-primary' : 'w-1 bg-gray-200'}`}></div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </section>

      {/* Bɔkɔɔ Pay Slide Advert */}
      <section className="py-8 bg-black overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-gray-900 to-black rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
                  {bokooSlides[bokooIndex].icon}
                </div>
                <div className="space-y-1">
                  <Badge className="bg-primary/20 text-primary border-none font-black text-[8px] uppercase tracking-widest px-2 mb-1">
                    Bɔkɔɔ Pay
                  </Badge>
                  <h3 className="text-white text-xl font-black italic tracking-tight animate-in fade-in slide-in-from-left-4 duration-500">
                    {bokooSlides[bokooIndex].title}
                  </h3>
                  <p className="text-gray-400 text-xs font-bold animate-in fade-in slide-in-from-left-6 duration-700">
                    {bokooSlides[bokooIndex].desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-1.5 mr-4">
                  {bokooSlides.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === bokooIndex ? 'w-6 bg-primary' : 'w-2 bg-white/10'}`}></div>
                  ))}
                </div>
                <Link href={bokooLink}>
                  <Button className="h-12 px-8 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
                    Shop with Bɔkɔɔ <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Grid */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
              <div className="text-left">
                 <Badge className="mb-4 px-3 py-1 rounded-full bg-white text-gray-900 border-gray-100 font-black uppercase tracking-widest text-[9px] shadow-sm">
                    Trending Now
                 </Badge>
                 <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                    Fresh from <br /><span className="text-primary italic">Campus Sellers.</span>
                 </h2>
                 <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">New listings from your university hub</p>
              </div>
              <Link href={exploreLink}>
                 <Button variant="ghost" className="font-black uppercase tracking-widest text-xs hover:bg-white px-8 h-12 rounded-xl group transition-all">
                    Explore All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </Link>
           </div>

           {productsLoading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="space-y-4">
                   <Skeleton className="h-64 w-full rounded-3xl" />
                   <Skeleton className="h-4 w-3/4 rounded-full" />
                   <Skeleton className="h-4 w-1/2 rounded-full" />
                 </div>
               ))}
             </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
               {Array.isArray(featuredProducts) && featuredProducts.map((product) => (
                 <ProductCard key={product.id} product={product} />
               ))}
             </div>
           )}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-24 border-y border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
              <div className="text-left">
                 <Badge className="mb-4 px-3 py-1 rounded-full bg-primary/5 text-primary border-none font-black uppercase tracking-widest text-[9px]">
                    Browse Categories
                 </Badge>
                 <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                    What are you <br /><span className="text-secondary italic">looking for?</span>
                 </h2>
                 <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Choose your department</p>
              </div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
             {categories.map((category) => (
               <Link key={category.id} href={`/gh/browse?categoryId=${category.id}`}>
                 <div className="flex flex-col items-center p-8 rounded-[2.5rem] bg-gray-50 hover:bg-white hover:shadow-xl transition-all group cursor-pointer border border-transparent hover:border-primary/5">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm transition-all group-hover:scale-110 group-hover:bg-[#2E5BFF] group-hover:text-white">
                     {category.icon === 'fas fa-book' ? '📚' : category.icon === 'fas fa-laptop' ? '💻' : category.icon === 'fas fa-tshirt' ? '👕' : '📦'}
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary transition-colors">{category.name}</span>
                 </div>
               </Link>
             ))}
           </div>
        </div>
      </section>

      {/* Campus Activity Feed */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
              <div className="text-left">
                 <Badge className="mb-4 px-3 py-1 rounded-full bg-accent/10 text-accent border-none font-black uppercase tracking-widest text-[9px]">
                    Happening Now
                 </Badge>
                 <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                    The Campus <br /><span className="text-accent italic">Activity Feed.</span>
                 </h2>
                 <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Events, news and updates from your school</p>
              </div>
           </div>

           <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-4">
                  {activityLoading ? (
                     [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />)
                  ) : !Array.isArray(campusActivity) || campusActivity.length === 0 ? (
                     <div className="bg-gray-50 rounded-[3rem] p-12 text-center border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No recent activity for {user?.university || 'your campus'}.</p>
                     </div>
                  ) : (
                    campusActivity.map((activity) => (
                     <Card key={activity.id} className="rounded-3xl border-2 border-gray-50 hover:border-primary/20 transition-all group overflow-hidden">
                        <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                           {activity.imageUrl && !brokenImages[`activity-${activity.id}`] && (
                              <div className="sm:w-48 h-48 sm:h-auto overflow-hidden">
                                 <img 
                                   src={activity.imageUrl} 
                                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                   alt="" 
                                   onError={() => handleImageError(`activity-${activity.id}`)}
                                 />
                              </div>
                           )}
                           <div className="flex-1 p-6 flex flex-col justify-between">
                              <div>
                                 <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-[0.2em]">{activity.activityType}</Badge>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{activity.source}</span>
                                 </div>
                                 <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 group-hover:text-primary transition-colors">{activity.title}</h3>
                                 <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{activity.content}</p>
                              </div>
                              <div className="mt-4 flex items-center justify-between">
                                 {activity.user && (
                                    <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                                          {!brokenImages[`user-${activity.user.firstName}-${activity.id}`] ? (
                                            <img 
                                              src={activity.user.avatar || `https://i.pravatar.cc/100?u=${activity.user.firstName}`} 
                                              alt="" 
                                              onError={() => activity.user && handleImageError(`user-${activity.user.firstName}-${activity.id}`)}
                                            />
                                          ) : (
                                            <Users className="w-4 h-4 text-gray-400" />
                                          )}
                                       </div>
                                       <span className="text-[10px] font-black uppercase tracking-widest">{activity.user.firstName} {activity.user.lastName?.[0]}.</span>
                                    </div>
                                 )}
                                 {activity.externalLink && (
                                    <Link href={activity.externalLink}>
                                       <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[9px]">
                                          Read More <ExternalLink className="ml-1 h-3 w-3" />
                                       </Button>
                                    </Link>
                                 )}
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                    ))
                  )}
               </div>

               <div className="lg:col-span-1">
                  <div className="bg-black rounded-[3rem] p-10 h-full relative overflow-hidden text-white">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                     <h3 className="text-3xl font-black mb-4 relative z-10">Trending <br /><span className="text-[#B2FCE4]">Sellers.</span></h3>
                     <div className="space-y-6 mt-8 relative z-10">
                       {Array.isArray(featuredProducts) && featuredProducts.slice(0, 5).map((p) => (
                           <Link key={p.id} href={`${basePrefix}/store/${p.store.id}${user ? `?ref=${user.id}` : ''}`}>
                             <div className="flex items-center gap-4 group/item cursor-pointer">
                                <div className="w-12 h-12 rounded-2xl border-2 border-white/10 overflow-hidden group-hover/item:border-[#B2FCE4] transition-colors flex items-center justify-center bg-white/5">
                                   {!brokenImages[`seller-${p.id}`] ? (
                                     <img 
                                       src={p.store.user.avatar || `https://i.pravatar.cc/100?u=${p.store.user.firstName}`} 
                                       className="w-full h-full object-cover" 
                                       alt="" 
                                       onError={() => handleImageError(`seller-${p.id}`)}
                                     />
                                   ) : (
                                     <Users className="w-6 h-6 text-white/20" />
                                   )}
                                </div>
                                <div>
                                   <p className="font-black text-sm uppercase tracking-tight leading-none mb-1">{p.store.name}</p>
                                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{p.store.university}</p>
                                </div>
                                <ChevronRight className="ml-auto w-4 h-4 text-white/20 group-hover/item:text-[#B2FCE4] group-hover/item:translate-x-1 transition-all" />
                             </div>
                           </Link>
                        ))}
                     </div>
                     <Link href={`${basePrefix}/browse?sortBy=popular${user ? `&ref=${user.id}` : ''}`}>
                        <Button variant="ghost" className="w-full mt-10 h-14 rounded-2xl border-2 border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all">
                           View Ranking
                        </Button>
                     </Link>
                  </div>
               </div>
           </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-24 border-t border-gray-50">
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