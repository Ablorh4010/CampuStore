import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Grid, List, Filter, SortAsc, Search, ShoppingBag } from 'lucide-react';
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
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'products' | 'stores'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState('newest');

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const search = params.get('search');
    const categoryId = params.get('categoryId');
    
    if (search) setSearchQuery(search);
    if (categoryId) setSelectedCategory(parseInt(categoryId));
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
    setLocation(`/browse?${params.toString()}`);
  };

  const handleCategoryFilter = (categoryId: number | 'all') => {
    const newCategory = categoryId === 'all' ? undefined : categoryId;
    setSelectedCategory(newCategory);
    
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (newCategory) params.set('categoryId', newCategory.toString());
    setLocation(`/browse?${params.toString()}`);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === 'popular') return (b.viewCount || 0) - (a.viewCount || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const filteredProducts = sortedProducts.filter(product => {
    if (selectedCategory && product.categoryId !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return product.title.toLowerCase().includes(query) ||
             product.description.toLowerCase().includes(query) ||
             product.store.name.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredStores = stores.filter(store => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return store.name.toLowerCase().includes(query) ||
             store.description.toLowerCase().includes(query) ||
             store.university.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Search & Category Header */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <form onSubmit={handleSearch} className="relative w-full lg:max-w-2xl">
              <Input
                type="text"
                placeholder="Search for textbooks, laptops, dorm gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-2xl border-2 border-gray-100 focus:border-[#2E5BFF] transition-all bg-gray-50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </form>

            <div className="flex items-center gap-4 w-full lg:w-auto">
               <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 lg:w-48 font-bold">
                    <div className="flex items-center gap-2">
                       <SortAsc className="w-4 h-4" />
                       <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="font-bold">Newest Arrivals</SelectItem>
                    <SelectItem value="popular" className="font-bold">Most Popular</SelectItem>
                    <SelectItem value="price-low" className="font-bold">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="font-bold">Price: High to Low</SelectItem>
                  </SelectContent>
               </Select>

               <div className="flex bg-gray-50 p-1 rounded-2xl border-2 border-gray-100">
                  <Button
                    variant={viewMode === 'products' ? 'default' : 'ghost'}
                    className={`rounded-xl h-10 px-6 font-black ${viewMode === 'products' ? 'bg-[#2E5BFF] text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('products')}
                  >
                    Items
                  </Button>
                  <Button
                    variant={viewMode === 'stores' ? 'default' : 'ghost'}
                    className={`rounded-xl h-10 px-6 font-black ${viewMode === 'stores' ? 'bg-[#2E5BFF] text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('stores')}
                  >
                    Shops
                  </Button>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-6 scrollbar-hide no-scrollbar">
            <Badge
              className={`cursor-pointer px-6 py-2.5 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${
                selectedCategory === undefined 
                ? 'bg-[#2E5BFF] text-white border-[#2E5BFF]' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => handleCategoryFilter('all')}
            >
              All Items
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category.id}
                className={`cursor-pointer px-6 py-2.5 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${
                  selectedCategory === category.id 
                  ? 'bg-[#2E5BFF] text-white border-[#2E5BFF]' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                }`}
                onClick={() => handleCategoryFilter(category.id)}
              >
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
             {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Latest Marketplace'}
             <span className="ml-2 text-gray-300 font-medium">({viewMode === 'products' ? filteredProducts.length : filteredStores.length})</span>
           </h2>
        </div>

        {/* Content */}
        {viewMode === 'products' ? (
          <div>
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-[2rem] space-y-4 shadow-sm border border-gray-50">
                    <Skeleton className="h-56 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4 rounded-full" />
                    <Skeleton className="h-4 w-1/2 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                   <ShoppingBag className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                  Try widening your search or choosing a different category.
                </p>
                <Button onClick={() => { setSearchQuery(''); setSelectedCategory(undefined); }} className="rounded-2xl bg-[#2E5BFF] font-black h-12 px-8">
                   Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="animate-reveal-up group">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {storesLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 h-40">
                    <Skeleton className="h-full w-full rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                <h3 className="text-xl font-bold">No stores found</h3>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredStores.map((store) => (
                  <div key={store.id} className="animate-reveal-up">
                    <StoreCard store={store} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
