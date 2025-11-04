import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Store, Camera, Edit, DollarSign, Plus, BookOpen, Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProductCard from '@/components/product/product-card';
import StoreCard from '@/components/store/store-card';
import { useAuth } from '@/lib/auth-context';
import type { ProductWithStore, StoreWithUser } from '@shared/schema';
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="student-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold font-heading mb-6 leading-tight">
                CampusStore
                <span className="text-yellow-300 ml-3 text-2xl md:text-3xl font-bold bg-white/20 px-3 py-1 rounded-lg">
                  {countryCode}
                </span>
                <span className="text-yellow-300 block text-3xl md:text-4xl font-semibold">StudentMarket 🎓</span>
              </h1>
              <p className="text-xl mb-8 text-white/90 font-body leading-relaxed">
                Your campus marketplace where students buy, sell, and connect. 
                <span className="block mt-2 text-yellow-200">💰 Save money • 📚 Make money • 🤝 Build community</span>
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
                <Button
                  size="lg"
                  className="btn-student text-white border-0 px-8 py-4 text-lg font-semibold"
                  onClick={handleGetStarted}
                >
                  <BookOpen className="mr-3 h-6 w-6 icon-bounce" />
                  Start Browsing
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white/95 text-purple-700 hover:bg-white border-2 border-white/20 px-8 py-4 text-lg font-semibold playful-shadow"
                  onClick={handleCreateStore}
                >
                  <Store className="mr-3 h-6 w-6" />
                  Open Your Store
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src={studentsShoppingImage}
                alt="Students shopping in campus marketplace"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900 font-heading">Trending Products</h2>
              <Link href="/browse">
                <Button variant="ghost" className="text-primary font-medium">
                  View All →
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.slice(0, 16).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Stores Section */}
        {featuredStores.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold font-heading text-primary">Featured Student Stores</h2>
              <Link href="/browse">
                <Button variant="ghost" className="text-primary font-medium">
                  View All Stores →
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredStores.slice(0, 8).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </section>
        )}

        {/* More Products Section */}
        {featuredProducts.length > 16 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900 font-heading">More Products You'll Love</h2>
              <Link href="/browse">
                <Button variant="ghost" className="text-primary font-medium">
                  Browse All →
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.slice(16, 32).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start Selling?</h2>
            <p className="text-gray-600">Join thousands of students already earning money on StudentMarket</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Take Photos</h3>
              <p className="text-sm text-gray-600">Snap some great photos of your items</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Create Listing</h3>
              <p className="text-sm text-gray-600">Add details and set your price</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Start Earning</h3>
              <p className="text-sm text-gray-600">Connect with buyers and make money</p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Button size="lg" onClick={handleCreateStore}>
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Listing
            </Button>
          </div>
        </section>

        {/* Empty State for New Users */}
        {featuredProducts.length === 0 && featuredStores.length === 0 && (
          <section className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Store className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to StudentMarket!
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to start buying and selling in your student community.
              </p>
              <div className="space-y-3">
                <Button size="lg" onClick={handleGetStarted} className="w-full">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Start Browsing
                </Button>
                <Button size="lg" variant="outline" onClick={handleCreateStore} className="w-full">
                  <Store className="mr-2 h-5 w-5" />
                  Create a Store
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Button */}
      {user && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-secondary hover:bg-yellow-500"
          onClick={handleCreateStore}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
