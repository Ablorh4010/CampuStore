import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  ShoppingBag, Store, Camera, Edit, DollarSign, Plus, BookOpen, Users, 
  Heart, ArrowRight, Zap, Star, ShieldCheck, Clock, CheckCircle2, 
  Search, Video, Globe, MessageSquare, Newspaper, Facebook, Instagram
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import ProductCard from '@/components/product/product-card';
import type { ProductWithStore, StoreWithUser, Category, WeeklyDealWithProduct, CampusActivityWithUser } from '@shared/schema';

// Modern Phone Mockup Component for Weekly Deals
function PhoneMockup({ deals }: { deals: WeeklyDealWithProduct[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (deals.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [deals.length]);

  if (deals.length === 0) return null;

  const currentDeal = deals[currentIndex];

  return (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl overflow-hidden animate-reveal-up">
      <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white relative">
        <div className="absolute top-0 inset-x-0 h-6 bg-white z-20 flex justify-center">
           <div className="w-20 h-4 bg-gray-800 rounded-b-xl"></div>
        </div>
        
        {/* Mock App UI */}
        <div className="pt-10 px-4 h-full flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <span className="font-black text-xs text-gray-400">9:41</span>
              <div className="flex gap-1.5">
                 <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                 <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              </div>
           </div>

           <div className="bg-primary/5 rounded-2xl p-4 mb-4 border border-primary/10">
              <Badge className="bg-secondary text-white text-[8px] font-black mb-1">{currentDeal.dealLabel}</Badge>
              <h4 className="text-sm font-black text-gray-900">Weekly Flash Deal</h4>
           </div>

           <div className="flex-1 overflow-hidden relative rounded-2xl mb-4 group bg-gray-50 flex items-center justify-center">
              <img 
                src={currentDeal.product.images[0]} 
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" 
                alt="Deal"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                 <p className="text-white font-black text-lg leading-tight mb-1">{currentDeal.product.title}</p>
                 <div className="flex items-center gap-2">
                    <span className="text-secondary font-black text-xl">${currentDeal.product.price}</span>
                    <span className="text-white/60 line-through text-xs font-bold">${currentDeal.product.originalPrice || (parseFloat(currentDeal.product.price) * 1.5).toFixed(2)}</span>
                 </div>
              </div>
           </div>

           <Link href={`/product/${currentDeal.productId}`}>
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
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: weeklyDeals = [] } = useQuery<WeeklyDealWithProduct[]>({
    queryKey: ['/api/weekly-deals'],
  });

  const { data: campusActivity = [] } = useQuery<CampusActivityWithUser[]>({
    queryKey: ['/api/campus-activity'],
  });

  const { data: featuredProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products/featured', user?.university, user?.city, user?.campus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
      return fetch(`/api/products/featured?${params}`).then(res => res.json());
    },
  });

  const handleGetStarted = () => {
    setLocation('/browse');
  };

  return (
    <div className="min-h-screen bg-white font-heading">
      {/* Hero Section - Fintech Style */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 skew-x-12 translate-x-32"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#B2FCE4]/10 rounded-full blur-[100px] animate-pulse"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left animate-reveal-up">
              <Badge className="bg-[#B2FCE4] text-[#2E5BFF] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border-none shadow-lg shadow-[#B2FCE4]/20">
                The New Way to Shop Campus
              </Badge>
              <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
                Shop Now.<br />
                <span className="text-[#B2FCE4] italic">Pay Later.</span>
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl leading-relaxed font-medium">
                Split your campus essentials into 4 interest-free payments with <span className="text-white font-bold underline decoration-[#B2FCE4] decoration-4 underline-offset-4">Bɔkɔɔ Pay</span>. 
                Buy gear from fellow students at {user?.university || 'your university'} today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-16 px-10 text-lg font-black bg-[#2E5BFF] hover:bg-blue-600 text-white rounded-2xl shadow-2xl shadow-[#2E5BFF]/40 transition-all hover:scale-105"
                  onClick={handleGetStarted}
                >
                  Start Shopping
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-16 px-10 text-lg font-black border-2 border-white/20 text-white hover:bg-white/10 rounded-2xl transition-all"
                  onClick={() => setLocation(user?.isMerchant ? '/dashboard' : '/seller-auth')}
                >
                  Sell Items
                </Button>
              </div>
              
              <div className="mt-16 flex flex-wrap items-center justify-center lg:justify-start gap-4 opacity-90 transition-all">
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://www.vectorlogo.zone/logos/apple_pay/apple_pay-ar21.svg" className="h-5" alt="Apple Pay" referrerPolicy="no-referrer" /></div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://www.vectorlogo.zone/logos/google_pay/google_pay-ar21.svg" className="h-5" alt="Google Pay" referrerPolicy="no-referrer" /></div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://www.vectorlogo.zone/logos/visa/visa-ar21.svg" className="h-4" alt="Visa" referrerPolicy="no-referrer" /></div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://www.vectorlogo.zone/logos/mastercard/mastercard-ar21.svg" className="h-6" alt="Mastercard" referrerPolicy="no-referrer" /></div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/MTN_Logo.svg" className="h-8" alt="MTN MoMo" referrerPolicy="no-referrer" /></div>
                <div className="bg-white p-2 rounded-lg shadow-lg flex items-center justify-center h-10 w-16"><img src="https://www.vectorlogo.zone/logos/telecel/telecel-icon.svg" className="h-5" alt="Telecel" referrerPolicy="no-referrer" /></div>
              </div>
            </div>
            
            <div className="flex-1 relative w-full lg:w-auto flex justify-center">
              {weeklyDeals.length > 0 ? (
                <PhoneMockup deals={weeklyDeals} />
              ) : (
                <div className="relative rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-[12px] border-white/10 backdrop-blur-sm bg-gradient-to-br from-indigo-900 to-purple-900 p-8 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <Badge className="bg-yellow-400 text-black font-black px-4 py-1 animate-bounce">⚡ WEEKLY DEALS</Badge>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-white/20 font-black italic text-4xl text-center">
                     Hub <br /> Deals
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 py-32">
         {/* Campus Pulse - Activity Feed */}
         <section className="mb-40 overflow-hidden">
            <div className="flex items-center gap-3 mb-10">
               <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shadow-lg animate-pulse">
                  <Zap className="text-white w-6 h-6" />
               </div>
               <h2 className="text-4xl font-black tracking-tighter">Campus Pulse.</h2>
               <Badge variant="outline" className="ml-2 border-2 border-gray-100 text-gray-400 font-black uppercase">Live Updates</Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-4">
                  {campusActivity.map((activity) => (
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
                                    {activity.source === 'google' ? <Globe className="w-3.5 h-3.5 text-blue-500" /> : 
                                     activity.source === 'facebook' ? <Facebook className="w-3.5 h-3.5 text-blue-600" /> : 
                                     <MessageSquare className="w-3.5 h-3.5 text-primary" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{activity.source} • {activity.activityType}</span>
                                 </div>
                                 <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors mb-2">{activity.title}</h3>
                                 <p className="text-gray-500 font-medium line-clamp-2 text-sm">{activity.content}</p>
                              </div>
                              <div className="mt-4 flex items-center justify-between">
                                 {activity.user && (
                                    <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                                          {!brokenImages[`user-${activity.user.firstName}-${activity.id}`] ? (
                                            <img 
                                              src={activity.user.avatar || `https://i.pravatar.cc/100?u=${activity.user.firstName}`} 
                                              alt="" 
                                              onError={() => handleImageError(`user-${activity.user.firstName}-${activity.id}`)}
                                            />
                                          ) : (
                                            <Users className="w-4 h-4 text-gray-400" />
                                          )}
                                       </div>
                                       <span className="text-xs font-black">{activity.user.firstName} {activity.user.lastName}</span>
                                    </div>
                                 )}
                                 <span className="text-[10px] font-bold text-gray-300">{new Date(activity.createdAt).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>

               <div className="space-y-8">
                  <Card className="rounded-[2.5rem] bg-black text-white p-10 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-primary/40 transition-colors"></div>
                     <h3 className="text-3xl font-black mb-4 relative z-10">Trending <br /><span className="text-[#B2FCE4]">Sellers.</span></h3>
                     <div className="space-y-6 mt-8 relative z-10">
                        {featuredProducts.slice(0, 5).map((p) => (
                           <div key={p.id} className="flex items-center gap-4 group/item cursor-pointer">
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
                                 <p className="font-black text-sm">{p.store.user.firstName} {p.store.user.lastName}</p>
                                 <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{p.store.name}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 ml-auto text-white/20 group-hover/item:text-[#B2FCE4] transition-all group-hover/item:translate-x-1" />
                           </div>
                        ))}
                     </div>
                  </Card>
                  
                  <Card className="rounded-[2.5rem] bg-[#F8F9FB] border-2 border-gray-100 p-10">
                     <Newspaper className="w-10 h-10 text-primary mb-6" />
                     <h3 className="text-2xl font-black mb-4">Campus Newsletter</h3>
                     <p className="text-gray-500 font-medium mb-8">Get the latest deals and campus activities delivered to your inbox.</p>
                     <div className="flex gap-2">
                        <input className="flex-1 bg-white border-none rounded-2xl px-4 font-bold text-sm shadow-inner" placeholder="you@university.edu" />
                        <Button className="rounded-2xl h-14 w-14 bg-black text-white shadow-xl hover:scale-105 transition-all">
                           <ArrowRight className="w-5 h-5" />
                        </Button>
                     </div>
                  </Card>
               </div>
            </div>
         </section>

         {/* Categories Section */}
         <section className="mb-40">
           <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
              <div>
                 <h2 className="text-5xl font-black tracking-tighter italic">Marketplace.</h2>
                 <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Choose your department</p>
              </div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
             {categories.map((category) => (
               <Link key={category.id} href={`/browse?categoryId=${category.id}`}>
                 <div className="flex flex-col items-center p-8 rounded-[2.5rem] bg-gray-50 hover:bg-white hover:shadow-xl transition-all group cursor-pointer border border-transparent hover:border-primary/5">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm transition-all group-hover:scale-110 group-hover:bg-[#2E5BFF] group-hover:text-white">
                     {category.icon === 'fas fa-book' ? '📚' : category.icon === 'fas fa-laptop' ? '💻' : category.icon === 'fas fa-tshirt' ? '👕' : '📦'}
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary transition-colors">{category.name}</span>
                 </div>
               </Link>
             ))}
           </div>
         </section>

         {/* High Conversion Featured Products section */}
         <section className="mb-32">
           <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
             <div className="animate-reveal-up">
               <Badge className="bg-[#B2FCE4] text-[#2E5BFF] mb-4 font-black px-4 py-1 border-none shadow-sm">EXPLORE THE HUB</Badge>
               <h2 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tighter leading-none italic">
                 Best of <br />
                 <span className="text-[#2E5BFF]">Campus.</span>
               </h2>
             </div>
             <Link href="/browse" className="animate-reveal-up [animation-delay:200ms]">
               <Button className="h-16 px-10 font-black rounded-2xl bg-white text-[#2E5BFF] border-2 border-gray-100 hover:border-[#2E5BFF] transition-all group shadow-xl hover:shadow-[#2E5BFF]/10">
                 View Modern Store
                 <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-2" />
               </Button>
             </Link>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
             {featuredProducts.length > 0 ? (
               featuredProducts.slice(0, 8).map((product) => (
                 <div key={product.id} className="animate-reveal-up group">
                   <ProductCard product={product} />
                 </div>
               ))
             ) : (
               // Fallback skeleton or empty state
               [...Array(4)].map((_, i) => (
                 <div key={i} className="bg-gray-100 h-80 rounded-[2rem] animate-pulse"></div>
               ))
             )}
           </div>
         </section>

         {/* Middle Banner - "Become a Merchant" */}
         <section className="mb-32 paylater-hero rounded-[4rem] p-16 text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/20 -skew-x-12 transform translate-x-20 transition-transform duration-1000 group-hover:translate-x-0"></div>
           <div className="relative z-10 grid lg:grid-cols-2 items-center gap-12">
              <div>
                 <h2 className="text-5xl lg:text-7xl font-black mb-8 leading-tight tracking-tighter">
                    Sell to your <br />
                    <span className="text-[#B2FCE4]">Community.</span>
                 </h2>
                 <p className="text-xl text-white/70 font-medium mb-10 max-w-md">
                    The easiest way to turn your extra items into cash. Verified students only. Secure payments always.
                 </p>
                 <Link href="/seller-auth">
                    <Button size="lg" className="h-16 px-12 text-lg font-black bg-white text-black hover:bg-white/90 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95">
                       Start Selling
                    </Button>
                 </Link>
              </div>
              <div className="hidden lg:flex justify-center">
                 <div className="w-80 h-80 rounded-full border-[20px] border-white/5 flex items-center justify-center animate-float">
                    <Store className="w-32 h-32 text-[#B2FCE4]" />
                 </div>
              </div>
           </div>
         </section>
      </div>

      {/* How it Works - PayLater Style */}
      <section className="py-24 bg-white overflow-hidden border-t">
         <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20 animate-reveal-up">
               <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-gray-900 mb-4">How Bɔkɔɔ Pay Works</h2>
               <p className="text-xl text-gray-500 font-medium">Simple. Transparent. Built for your budget.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
               {[
                  { title: 'Grab what you need', desc: 'Shop textbooks, electronics, and more from students on your campus.', icon: <ShoppingBag className="w-8 h-8" /> },
                  { title: 'Choose Bɔkɔɔ Pay', desc: 'Select the Pay Later option at checkout. No credit check required for students.', icon: <Zap className="w-8 h-8" /> },
                  { title: 'Pay over time', desc: 'Split the cost into 4 easy interest-free payments over 6 weeks.', icon: <Clock className="w-8 h-8" /> }
               ].map((step, idx) => (
                  <div key={idx} className="group p-10 rounded-[3rem] bg-gray-50 border border-transparent hover:border-primary/10 hover:bg-white hover:shadow-2xl transition-all duration-500 hover-lift">
                     <div className="flex justify-between items-start mb-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-white transition-all duration-500">
                           {step.icon}
                        </div>
                        <span className="text-5xl font-black text-gray-100 group-hover:text-primary/10 transition-colors">0{idx + 1}</span>
                     </div>
                     <h3 className="text-2xl font-black text-gray-900 mb-4">{step.title}</h3>
                     <p className="text-gray-500 font-medium leading-relaxed">{step.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
}
