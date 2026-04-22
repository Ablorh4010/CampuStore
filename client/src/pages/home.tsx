import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Store, Camera, Edit, DollarSign, Plus, BookOpen, Users, Heart, ArrowRight, Zap, Star, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="min-h-screen bg-white">
      {/* Modern E-commerce Hero */}
      <section className="relative bg-gray-50 border-b overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center py-12 lg:py-20 gap-12">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold mb-6 animate-bounce">
                <Zap className="h-4 w-4 fill-current" />
                <span>Exclusive Student Marketplace</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
                Everything You Need <br />
                <span className="text-primary bg-clip-text">For Campus Life.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
                Join the largest marketplace built by students, for students. 
                Buy essentials, sell your gear, and connect with your {countryCode} community.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105"
                  onClick={handleGetStarted}
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold border-2 transition-all hover:bg-gray-100"
                  onClick={handleCreateStore}
                >
                  Start Selling
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center lg:justify-start space-x-8 text-gray-400">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Secure Payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">Top Rated Sellers</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative w-full lg:w-auto">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
              <img
                src={studentsShoppingImage}
                alt="Modern Marketplace"
                className="relative rounded-3xl shadow-2xl border-8 border-white transform hover:rotate-1 transition-transform duration-500 lg:scale-110"
              />
              
              {/* Category Quick Grid in Hero */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl hidden sm:grid grid-cols-3 gap-2 border">
                {categories.slice(0, 3).map(cat => (
                  <div key={cat.id} className="w-16 h-16 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-gray-500 cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors">
                    <span className="text-xl mb-1">{cat.icon === 'fas fa-laptop' ? '💻' : cat.icon === 'fas fa-book' ? '📚' : '👕'}</span>
                    {cat.name?.split(' ')[0] || 'Item'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Category Icons Bar */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Explore by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-8">
            {categories.map((category) => (
              <Link key={category.id} href={`/browse?categoryId=${category.id}`}>
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mb-3 border transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:scale-110">
                    {category.icon === 'fas fa-book' ? '📚' : category.icon === 'fas fa-laptop' ? '💻' : category.icon === 'fas fa-tshirt' ? '👕' : '📦'}
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Today's Trending</h2>
                <p className="text-gray-500 mt-2">The most popular items on your campus right now.</p>
              </div>
              <Link href="/browse">
                <Button variant="outline" className="font-bold border-2 rounded-xl group">
                  See All
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
              {featuredProducts.slice(0, 16).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Middle Banner Section */}
        <section className="mb-20 bg-black rounded-[2.5rem] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/20 skew-x-12 transform translate-x-20"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">Turn Your Old Gear <br />Into Instant Cash.</h2>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              List your books, clothes, or electronics in under 2 minutes. 
              Connect with buyers instantly and earn money safely.
            </p>
            <Button size="lg" className="h-14 px-10 text-lg font-bold bg-white text-black hover:bg-gray-100 rounded-xl" onClick={handleCreateStore}>
              Sell Your First Item
            </Button>
          </div>
        </section>

        {/* Featured Stores Section */}
        {featuredStores.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Popular Stores</h2>
                <p className="text-gray-500 mt-2">Support your fellow students and shops.</p>
              </div>
              <Link href="/browse">
                <Button variant="ghost" className="font-bold text-primary hover:bg-primary/5">
                  Browse All Stores
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
              {featuredStores.slice(0, 8).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </section>
        )}

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-12 py-12 border-t border-b">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Campus Exclusive</h3>
            <p className="text-gray-600">Built only for students. Verify your campus ID to trade safely.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Zero Commissions</h3>
            <p className="text-gray-600">Keep 100% of what you earn. We don't take a cut from student trades.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Connections</h3>
            <p className="text-gray-600">Chat with buyers and sellers in real-time through our secure portal.</p>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      {user && (
        <Button
          size="icon"
          className="fixed bottom-10 right-10 h-16 w-16 rounded-full shadow-2xl bg-primary hover:scale-110 transition-transform z-40"
          onClick={handleCreateStore}
        >
          <Plus className="h-8 w-8" />
        </Button>
      )}
    </div>
  );
}
