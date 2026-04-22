import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Store, Camera, Edit, DollarSign, Plus, BookOpen, Users, Heart, ArrowRight, Zap, Star, ShieldCheck, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/product/product-card';
import StoreCard from '@/components/store/store-card';
import { useAuth } from '@/lib/auth-context';
import type { ProductWithStore, StoreWithUser, Category } from '@shared/schema';
import studentsShoppingImage from '@assets/stock_images/diverse_students_sho_daf6aae6.jpg';

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, countryCode } = useAuth();
  
  // Check if mobile user should see mode selection
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasSeenModeSelection = localStorage.getItem('hasSeenModeSelection');
    const userMode = localStorage.getItem('userMode');
    
    // If mobile, first time, and not logged in, show mode selection
    if (isMobile && !hasSeenModeSelection && !user && !userMode) {
      localStorage.setItem('hasSeenModeSelection', 'true');
      setLocation('/mode-selection');
    }
  }, [user, setLocation]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: featuredStores = [] } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/stores/featured', user?.university, user?.city, user?.campus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
      return fetch(`/api/stores/featured?${params}`).then(res => res.json());
    },
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
    if (user) {
      setLocation('/browse');
    } else {
      setLocation('/auth');
    }
  };

  const handleCreateStore = () => {
    if (user) {
      setLocation('/dashboard');
    } else {
      setLocation('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white font-body">
      {/* PayLater Inspired Modern Hero */}
      <section className="relative paylater-hero overflow-hidden py-20 lg:py-32">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-20 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] animate-pulse"></div>
           <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left animate-reveal-up">
              <Badge className="bg-secondary text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border-none shadow-lg shadow-secondary/20">
                The New Way to Shop Campus
              </Badge>
              <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
                Shop Now.<br />
                <span className="text-secondary italic">Pay Later.</span>
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl leading-relaxed font-medium">
                Split your campus essentials into 4 interest-free payments with <span className="text-white font-bold underline decoration-secondary decoration-4 underline-offset-4">Bɔkɔɔ</span>. 
                Buy gear from fellow students at {user?.university || 'your university'} today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-16 px-10 text-lg font-black bg-secondary hover:bg-red-600 text-white rounded-2xl shadow-2xl shadow-secondary/40 transition-all hover:scale-105"
                  onClick={handleGetStarted}
                >
                  Start Shopping
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-16 px-10 text-lg font-black border-2 border-white/20 text-white hover:bg-white/10 rounded-2xl transition-all"
                  onClick={handleCreateStore}
                >
                  Open a Store
                </Button>
              </div>
              
              <div className="mt-16 flex flex-wrap items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Apple_Pay_logo.svg/512px-Apple_Pay_logo.svg.png" className="h-8 invert" alt="Apple Pay" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/MTN_Logo.svg/1024px-MTN_Logo.svg.png" className="h-8" alt="MTN MoMo" />
                <img src="https://seeklogo.com/images/V/vodafone-cash-logo-9759DB60F4-seeklogo.com.png" className="h-8" alt="Telecel Cash" />
              </div>
            </div>
            
            <div className="flex-1 relative w-full lg:w-auto animate-float">
              <div className="relative rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-[12px] border-white/10 backdrop-blur-sm">
                <img
                  src={studentsShoppingImage}
                  alt="Modern Marketplace"
                  className="w-full h-auto object-cover transform scale-105"
                />
                {/* Floating UI Element */}
                <div className="absolute top-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl animate-reveal-up border border-gray-100 hidden sm:block">
                   <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-2xl"><CheckCircle className="text-green-600" /></div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Installment Paid</p>
                         <p className="text-lg font-black text-gray-900">$25.00 <span className="text-xs text-gray-400">/ 1 of 4</span></p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works - PayLater Style */}
      <section className="py-24 bg-white overflow-hidden">
         <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20 animate-reveal-up">
               <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-gray-900 mb-4">How Bɔkɔɔ Works</h2>
               <p className="text-xl text-gray-500 font-medium">Simple. Transparent. Built for your budget.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
               {[
                 { step: '01', title: 'Choose at Checkout', desc: 'Find what you need and select Bɔkɔɔ as your payment method.', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
                 { step: '02', title: 'Pay 25% Today', desc: 'Pay just a quarter of the total using MoMo, Card, or Apple Pay.', icon: Wallet, color: 'bg-secondary/10 text-secondary' },
                 { step: '03', title: 'The Rest Later', desc: 'Your remaining balance is split into 3 more easy payments.', icon: Star, color: 'bg-primary/10 text-primary' },
               ].map((item, i) => (
                  <div key={i} className="group p-10 rounded-[3rem] bg-gray-50 border border-transparent hover:border-primary/10 hover:bg-white hover:shadow-2xl transition-all duration-500 hover-lift">
                     <div className="flex justify-between items-start mb-10">
                        <div className={`p-5 rounded-3xl ${item.color}`}>
                           <item.icon className="w-8 h-8" />
                        </div>
                        <span className="text-5xl font-black text-gray-200 group-hover:text-primary/10 transition-colors">{item.step}</span>
                     </div>
                     <h3 className="text-2xl font-black mb-4 text-gray-900">{item.title}</h3>
                     <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Category Icons Bar */}
        <div className="mb-32">
          <div className="flex items-center justify-between mb-12">
             <h2 className="text-3xl font-black tracking-tight">Browse Categories</h2>
             <Link href="/browse"><Button variant="link" className="font-black text-primary">View All</Button></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/browse?categoryId=${category.id}`}>
                <div className="flex flex-col items-center p-8 rounded-[2.5rem] bg-gray-50 hover:bg-white hover:shadow-xl transition-all group cursor-pointer border border-transparent hover:border-primary/5">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    {category.icon === 'fas fa-book' ? '📚' : category.icon === 'fas fa-laptop' ? '💻' : category.icon === 'fas fa-tshirt' ? '👕' : '📦'}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors">{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <Badge className="bg-primary text-white mb-4">Trending Now</Badge>
                <h2 className="text-5xl font-black text-gray-900 tracking-tighter italic">Student Favorites.</h2>
              </div>
              <Link href="/browse">
                <Button variant="outline" className="h-14 px-8 font-black border-2 rounded-2xl group hover:bg-primary hover:text-white hover:border-primary transition-all">
                  Browse Full Catalog
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.slice(0, 8).map((product) => (
                <div key={product.id} className="animate-reveal-up hover-lift">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Middle Banner - "Become a Merchant" */}
        <section className="mb-32 paylater-hero rounded-[4rem] p-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/20 -skew-x-12 transform translate-x-20"></div>
          <div className="relative z-10 grid lg:grid-cols-2 items-center gap-12">
             <div>
                <h2 className="text-5xl lg:text-7xl font-black mb-8 leading-tight tracking-tighter">
                   Sell to your <br />
                   <span className="text-secondary underline decoration-4 underline-offset-8">Campus.</span>
                </h2>
                <p className="text-xl text-gray-300 mb-12 font-medium leading-relaxed">
                   List your items in 30 seconds. Connect with thousands of students at {countryCode}.
                   Zero setup fees. Zero commission on student trades.
                </p>
                <Button size="lg" className="h-16 px-12 text-xl font-black bg-white text-primary hover:bg-gray-100 rounded-2xl shadow-2xl transition-all hover:scale-105" onClick={handleCreateStore}>
                   Launch Your Store
                </Button>
             </div>
             <div className="hidden lg:flex justify-center animate-float">
                <div className="bg-white/5 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 w-full max-w-sm">
                   <div className="space-y-6">
                      <div className="h-4 w-1/2 bg-white/20 rounded-full"></div>
                      <div className="h-4 w-full bg-white/10 rounded-full"></div>
                      <div className="h-4 w-3/4 bg-white/10 rounded-full"></div>
                      <div className="pt-6 grid grid-cols-2 gap-4">
                         <div className="h-20 bg-secondary rounded-2xl flex items-center justify-center">
                            <Plus className="text-white w-10 h-10" />
                         </div>
                         <div className="h-20 bg-white/10 rounded-2xl"></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Popular Stores */}
        {featuredStores.length > 0 && (
          <section className="mb-32">
            <div className="text-center mb-16">
               <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-gray-900">Verified Shops</h2>
               <p className="text-xl text-gray-500 font-medium mt-4">Safe and trusted student merchants at {user?.university || 'Campus'}</p>
            </div>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
              {featuredStores.slice(0, 4).map((store) => (
                <div key={store.id} className="hover-lift transition-all duration-500">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modern Floating Action */}
      {user && (
        <div className="fixed bottom-10 right-28 z-40 group">
           <div className="absolute right-0 bottom-full mb-4 px-4 py-2 bg-gray-900 text-white text-xs font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              SELL SOMETHING
           </div>
           <Button
             size="icon"
             className="h-16 w-16 rounded-2xl shadow-2xl bg-primary hover:bg-indigo-700 transition-all hover:scale-110"
             onClick={handleCreateStore}
           >
             <Plus className="h-8 w-8 text-white" />
           </Button>
        </div>
      )}
    </div>
  );
}
