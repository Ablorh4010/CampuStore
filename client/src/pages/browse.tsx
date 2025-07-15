import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Grid, List, Filter, SortAsc } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState('popular');

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
    queryKey: ['/api/products', { categoryId: selectedCategory, search: searchQuery, user: user?.id }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
      return fetch(`/api/products?${params}`).then(res => res.json());
    },
  });

  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreWithUser[]>({
    queryKey: ['/api/stores', user?.university, user?.city, user?.campus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user?.university) params.append('userUniversity', user.university);
      if (user?.city) params.append('userCity', user.city);
      if (user?.campus) params.append('userCampus', user.campus);
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

  const filteredProducts = products.filter(product => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Marketplace</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <Input
            type="text"
            placeholder="Search products and stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </form>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'products' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('products')}
            >
              Products ({filteredProducts.length})
            </Button>
            <Button
              variant={viewMode === 'stores' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('stores')}
            >
              Stores ({filteredStores.length})
            </Button>
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex items-center space-x-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      {viewMode === 'products' && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedCategory === undefined ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => handleCategoryFilter('all')}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => handleCategoryFilter(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Content */}
      {viewMode === 'products' ? (
        <div>
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {storesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No stores found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
