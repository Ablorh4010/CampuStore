import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Grid, List, Filter, SortAsc, Search, ShoppingBag, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProductCard from '@/components/product/product-card';
import StoreCard from '@/components/store/store-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import type { ProductWithStore, StoreWithUser, Category } from '@shared/schema';

export default function Browse() {
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();
  const { user } = useAuth();
  
  const isGh = location.startsWith('/gh');
  const basePrefix = isGh ? '/gh' : '';
  
  const [viewMode, setViewMode] = useState<'products' | 'stores'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState('newest');
  const [isInstallmentOnly, setIsInstallmentOnly] = useState(false);

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const search = params.get('search');
    const categoryId = params.get('categoryId');
    const installment = params.get('installment') === 'true';
    
    if (search) setSearchQuery(search);
    if (categoryId) setSelectedCategory(parseInt(categoryId));
    if (installment) setIsInstallmentOnly(true);
  }, [searchParams]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products', { categoryId: selectedCategory, search: searchQuery, university: user?.university }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (user?.university) params.append('userUniversity', user.university);
      return fetch(`/api/products?${params}`).then(res => res.json());
    },
  });

  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/stores', user?.university],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      return fetch(`/api/stores?${params}`).then(res => res.json());
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('categoryId', selectedCategory.toString());
    if (isInstallmentOnly) params.set('installment', 'true');
    setLocation(`${basePrefix}/browse?${params.toString()}`);
  };

  const handleCategoryFilter = (categoryId: number | 'all') => {
    const newCategory = categoryId === 'all' ? undefined : categoryId;
    setSelectedCategory(newCategory);
    
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (newCategory) params.set('categoryId', newCategory.toString());
    if (isInstallmentOnly) params.set('installment', 'true');
    setLocation(`${basePrefix}/browse?${params.toString()}`);
  };

  const sortedProducts = Array.isArray(products) ? [...products].sort((a, b) => {
    if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === 'popular') return (b.viewCount || 0) - (a.viewCount || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }) : [];

  const filteredProducts = sortedProducts.filter(product => {
    if (selectedCategory && product.categoryId !== selectedCategory) return false;
    if (isInstallmentOnly && !product.isInstallmentEligible) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return product.title.toLowerCase().includes(query) ||
             product.description.toLowerCase().includes(query) ||
             product.store.name.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredStores = Array.isArray(stores) ? stores.filter(store => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return store.name.toLowerCase().includes(query) ||
             store.description.toLowerCase().includes(query) ||
             store.university.toLowerCase().includes(query);
    }
    return true;
  }) : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Search Header */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <form onSubmit={handleSearch} className="relative w-full lg:max-w-3xl">
              <Input
                type="text"
                placeholder="Search for items, brands, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-xl border-gray-200 focus:border-black transition-all bg-gray-50/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </form>

            <div className="flex items-center gap-4 w-full lg:w-auto">
               <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white lg:w-48 font-black text-xs uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                       <SortAsc className="w-4 h-4" />
                       <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="font-bold text-xs uppercase">Newest Arrivals</SelectItem>
                    <SelectItem value="popular" className="font-bold text-xs uppercase">Most Popular</SelectItem>
                    <SelectItem value="price-low" className="font-bold text-xs uppercase">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="font-bold text-xs uppercase">Price: High to Low</SelectItem>
                  </SelectContent>
               </Select>

               <div className="flex bg-gray-100 p-1 rounded-xl">
                  <Button
                    variant={viewMode === 'products' ? 'default' : 'ghost'}
                    className={`rounded-lg h-10 px-6 font-black text-[10px] uppercase tracking-widest ${viewMode === 'products' ? 'bg-black text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('products')}
                  >
                    Items
                  </Button>
                  <Button
                    variant={viewMode === 'stores' ? 'default' : 'ghost'}
                    className={`rounded-lg h-10 px-6 font-black text-[10px] uppercase tracking-widest ${viewMode === 'stores' ? 'bg-black text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('stores')}
                  >
                    Shops
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Sidebar - Filters */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-40 space-y-8">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 text-gray-400">Categories</h3>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      handleCategoryFilter('all');
                      setIsInstallmentOnly(false);
                    }}
                    className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      selectedCategory === undefined && !isInstallmentOnly
                      ? 'bg-black text-white shadow-lg shadow-black/10' 
                      : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    All Items
                  </button>

                  <button
                    onClick={() => {
                      const newValue = !isInstallmentOnly;
                      setIsInstallmentOnly(newValue);
                      setSelectedCategory(undefined);
                      const params = new URLSearchParams();
                      if (searchQuery) params.set('search', searchQuery);
                      if (newValue) params.set('installment', 'true');
                      setLocation(`${basePrefix}/browse?${params.toString()}`);
                    }}
                    className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all mb-4 mt-2 ${
                      isInstallmentOnly 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-primary hover:bg-primary/5 border-2 border-primary/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <Wallet className="w-3.5 h-3.5" />
                       <span>Bɔkɔɔ Pay Only</span>
                    </div>
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        handleCategoryFilter(category.id);
                        setIsInstallmentOnly(false);
                      }}
                      className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        selectedCategory === category.id 
                        ? 'bg-black text-white shadow-lg shadow-black/10' 
                        : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 text-gray-400">Campus Filters</h3>
                <div className="p-4 bg-gray-50 rounded-2xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                     Showing results for<br/>
                     <span className="text-black">{user?.university || 'All Universities'}</span>
                   </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
               <h2 className="text-sm font-black tracking-[0.1em] text-gray-900 uppercase">
                 {isInstallmentOnly ? 'Bɔkɔɔ Pay Eligible' : (selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Explore Market')}
                 <span className="ml-2 text-gray-300 font-medium tracking-normal text-xs uppercase">({viewMode === 'products' ? filteredProducts.length : filteredStores.length} results)</span>
               </h2>
            </div>

            {viewMode === 'products' ? (
              <div>
                {productsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="space-y-4">
                        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                        <Skeleton className="h-4 w-3/4 rounded-full" />
                        <Skeleton className="h-4 w-1/2 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                       <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-widest">No results</h3>
                    <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Try adjusting your filters.</p>
                    <Button onClick={() => { setSearchQuery(''); setSelectedCategory(undefined); setIsInstallmentOnly(false); }} className="rounded-xl bg-black font-black text-xs uppercase tracking-widest h-12 px-8">
                       Reset all
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="animate-reveal-up group">
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
