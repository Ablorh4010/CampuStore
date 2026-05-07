import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Grid, List, Filter, SortAsc, Search, ShoppingBag, Wallet, ChevronDown, LayoutGrid, Store, SlidersHorizontal, MapPin } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProductCard from '@/components/product/product-card';
import StoreCard from '@/components/store/store-card';
import SEO from '@/components/seo/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import type { ProductWithStore, StoreWithUser, Category } from '@shared/schema';

export default function Browse() {
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<'products' | 'stores'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState('newest');
  const [isInstallmentOnly, setIsInstallmentOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
    updateUrlParams(searchQuery, selectedCategory, isInstallmentOnly);
  };

  const updateUrlParams = (search?: string, category?: number, installment?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('categoryId', category.toString());
    if (installment) params.set('installment', 'true');
    if (user) params.set('ref', user.id.toString());
    setLocation(`/browse?${params.toString()}`);
  };

  const handleCategoryFilter = (categoryId: number | 'all') => {
    const newCategory = categoryId === 'all' ? undefined : categoryId;
    setSelectedCategory(newCategory);
    updateUrlParams(searchQuery, newCategory, isInstallmentOnly);
  };

  const toggleInstallment = () => {
    const newValue = !isInstallmentOnly;
    setIsInstallmentOnly(newValue);
    updateUrlParams(searchQuery, selectedCategory, newValue);
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
             store.university?.toLowerCase().includes(query);
    }
    return true;
  }) : [];

  const categoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All Products';
  const pageTitle = searchQuery ? `Search: "${searchQuery}"` : categoryName;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(undefined);
    setIsInstallmentOnly(false);
    updateUrlParams('', undefined, false);
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={`${pageTitle} | The Hub Ghana`}
        description={`Find the best student deals for ${categoryName} in Ghana. Shop from student entrepreneurs across various campuses.`}
        keywords={`${categoryName}, student deals, ghana market, campus buy and sell`}
      />
      {/* Search Header */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-center justify-between">
            <form onSubmit={handleSearch} className="relative w-full lg:max-w-xl">
              <Input
                type="text"
                placeholder="Search for items, brands, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-xl border-gray-200 focus:border-black transition-all bg-gray-50/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </form>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
               {/* Desktop Category Dropdown */}
               <Select 
                 value={selectedCategory?.toString() || 'all'} 
                 onValueChange={(val) => handleCategoryFilter(val === 'all' ? 'all' : parseInt(val))}
               >
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white min-w-[140px] font-black text-[10px] uppercase tracking-widest hidden sm:flex">
                    <div className="flex items-center gap-2">
                       <LayoutGrid className="w-4 h-4" />
                       <SelectValue placeholder="Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[70vh]">
                    <SelectItem value="all" className="font-bold text-[10px] uppercase tracking-widest">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()} className="font-bold text-[10px] uppercase tracking-widest">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>

               <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white w-auto sm:w-48 font-black text-[10px] uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                       <SortAsc className="w-4 h-4" />
                       <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="font-bold text-[10px] uppercase tracking-widest">Newest Arrivals</SelectItem>
                    <SelectItem value="popular" className="font-bold text-[10px] uppercase tracking-widest">Most Popular</SelectItem>
                    <SelectItem value="price-low" className="font-bold text-[10px] uppercase tracking-widest">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="font-bold text-[10px] uppercase tracking-widest">Price: High to Low</SelectItem>
                  </SelectContent>
               </Select>

               {/* Menu / Filter Button */}
               <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                 <SheetTrigger asChild>
                   <Button variant="outline" className="h-12 rounded-xl border-2 border-primary/20 hover:border-primary text-primary font-black text-[10px] uppercase tracking-widest px-6">
                     <SlidersHorizontal className="w-4 h-4 mr-2" />
                     Menu
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right" className="w-full max-w-[350px] sm:max-w-[400px] p-0 border-none">
                    <div className="flex flex-col h-full bg-white">
                       <SheetHeader className="p-8 bg-gray-50/50 border-b">
                          <SheetTitle className="text-2xl font-black uppercase tracking-tighter">Market Filters.</SheetTitle>
                          <SheetDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Refine your campus shopping experience.</SheetDescription>
                       </SheetHeader>

                       <ScrollArea className="flex-grow">
                          <div className="p-8 space-y-10">
                             {/* Category List */}
                             <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Explore Categories</h4>
                                <div className="grid grid-cols-1 gap-2">
                                   <Button
                                     variant={selectedCategory === undefined ? 'default' : 'ghost'}
                                     className={`w-full justify-start h-12 rounded-xl font-black uppercase tracking-widest text-[10px] ${selectedCategory === undefined ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                     onClick={() => {
                                       handleCategoryFilter('all');
                                       setIsFilterOpen(false);
                                     }}
                                   >
                                      All Items
                                   </Button>
                                   {categories.map((category) => (
                                     <Button
                                       key={category.id}
                                       variant={selectedCategory === category.id ? 'default' : 'ghost'}
                                       className={`w-full justify-start h-12 rounded-xl font-black uppercase tracking-widest text-[10px] ${selectedCategory === category.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                       onClick={() => {
                                         handleCategoryFilter(category.id);
                                         setIsFilterOpen(false);
                                       }}
                                     >
                                        {category.name}
                                     </Button>
                                   ))}
                                </div>
                             </section>

                             {/* Specialized Filters */}
                             <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Special Offers</h4>
                                <Button
                                  variant={isInstallmentOnly ? 'default' : 'outline'}
                                  className={`w-full justify-start h-14 rounded-xl font-black uppercase tracking-widest text-[10px] px-6 ${isInstallmentOnly ? 'bg-primary text-white border-none' : 'border-primary/10 text-primary hover:bg-primary/5'}`}
                                  onClick={() => {
                                    toggleInstallment();
                                    setIsFilterOpen(false);
                                  }}
                                >
                                   <Wallet className="w-4 h-4 mr-3" />
                                   BƆKƆƆ Pay™ (Installments)
                                </Button>
                             </section>

                             {/* Campus Info */}
                             <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Current Location</h4>
                                <div className="p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                      <MapPin className="w-5 h-5 text-gray-400" />
                                   </div>
                                   <div>
                                      <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Showing for</p>
                                      <p className="text-xs font-black uppercase tracking-tight text-gray-900">{user?.university || 'All Universities'}</p>
                                   </div>
                                </div>
                             </section>
                          </div>
                       </ScrollArea>
                       
                       <div className="p-8 border-t bg-gray-50/50">
                          <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-gray-400"
                            onClick={() => { resetFilters(); setIsFilterOpen(false); }}
                          >
                             Reset All Filters
                          </Button>
                       </div>
                    </div>
                 </SheetContent>
               </Sheet>

               <div className="flex bg-gray-100 p-1 rounded-xl ml-auto lg:ml-0">
                  <Button
                    variant={viewMode === 'products' ? 'default' : 'ghost'}
                    className={`rounded-lg h-10 px-4 sm:px-6 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'products' ? 'bg-black text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('products')}
                  >
                    Items
                  </Button>
                  <Button
                    variant={viewMode === 'stores' ? 'default' : 'ghost'}
                    className={`rounded-lg h-10 px-4 sm:px-6 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'stores' ? 'bg-black text-white' : 'text-gray-500'}`}
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
        <main>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
             <h2 className="text-sm font-black tracking-[0.1em] text-gray-900 uppercase">
               {isInstallmentOnly ? 'BƆKƆƆ Pay™ Eligible' : (selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Explore Market')}
               <span className="ml-2 text-gray-300 font-medium tracking-normal text-xs uppercase">({viewMode === 'products' ? filteredProducts.length : filteredStores.length} results)</span>
             </h2>
          </div>

          {viewMode === 'products' ? (
            <div>
              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                      <Skeleton className="h-4 w-3/4 rounded-full" />
                      <Skeleton className="h-4 w-1/2 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                     <ShoppingBag className="w-10 h-10 text-gray-200" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-widest">No results</h3>
                  <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Try adjusting your filters or search query.</p>
                  <Button onClick={resetFilters} className="rounded-xl bg-black font-black text-xs uppercase tracking-widest h-12 px-10">
                     Reset all
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="animate-reveal-up group">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
