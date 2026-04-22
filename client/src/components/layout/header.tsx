import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, ShoppingCart, Bell, Plus, Menu, X, BookOpen, Store, GraduationCap, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useQuery } from '@tanstack/react-query';
import type { Category, Store as StoreType } from '@shared/schema';
import logoImage from '@assets/generated_images/CampusStore_app_icon_7f47d6f5.png';

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout, countryCode } = useAuth();
  const { cartCount, openCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: stores = [] } = useQuery<StoreType[]>({
    queryKey: ['/api/stores'],
  });
  
  // Show Sign In button only on My Store (dashboard) page
  const shouldShowSignIn = !user && location === '/dashboard';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleProfileAction = (action: string) => {
    switch (action) {
      case 'dashboard':
        setLocation('/dashboard');
        break;
      case 'admin':
        setLocation('/admin');
        break;
      case 'logout':
        logout();
        setLocation('/');
        break;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="cursor-pointer flex items-center space-x-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                  <img 
                    src={logoImage} 
                    alt="The University Hub Logo" 
                    className="relative h-12 w-12 rounded-full border-2 border-transparent bg-white group-hover:border-primary/30 transition-all duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="group-hover:translate-x-1 transition-transform duration-300">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold font-heading text-primary group-hover:text-accent transition-colors duration-300">
                      The University Hub
                    </h1>
                    <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded-md">
                      {countryCode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 -mt-1 font-body group-hover:text-gray-700 transition-colors duration-300">
                    the student market place
                  </p>
                </div>
              </div>
            </Link>

            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-2xl ml-8">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search products, stores, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </form>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="font-medium flex items-center">
                    Categories <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[70vh] overflow-y-auto">
                  {categories.map((category) => (
                    <DropdownMenuItem 
                      key={category.id}
                      onClick={() => setLocation(`/browse?categoryId=${category.id}`)}
                    >
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/browse')}>
                    View All Categories
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="font-medium flex items-center">
                    Stores <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[70vh] overflow-y-auto">
                  {stores.slice(0, 10).map((store) => (
                    <DropdownMenuItem 
                      key={store.id}
                      onClick={() => setLocation(`/store/${store.id}`)}
                    >
                      {store.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/browse')}>
                    View All Stores
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/browse">
                <Button variant="ghost" size="sm" className="font-medium">
                  Latest Deals
                </Button>
              </Link>
            </nav>

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="font-medium flex items-center border-primary/20 hover:border-primary/50 text-primary">
                  <Store className="h-4 w-4 mr-2" />
                  Sell Items
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={openCart}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar || ''} alt={user.firstName} />
                        <AvatarFallback className="bg-primary/5 text-primary">
                          {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleProfileAction('dashboard')}>
                      Seller Dashboard
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <DropdownMenuItem onClick={() => handleProfileAction('admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Portal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleProfileAction('logout')} className="text-red-600 focus:text-red-600">
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col space-y-4 mt-4">
                  {user ? (
                    <>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || ''} alt={user.firstName} />
                          <AvatarFallback>
                            {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <Button onClick={() => handleProfileAction('dashboard')} className="w-full">
                        Dashboard
                      </Button>
                      {user.isAdmin && (
                        <Button onClick={() => handleProfileAction('admin')} variant="outline" className="w-full">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Portal
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => handleProfileAction('logout')} className="w-full">
                        Log out
                      </Button>
                    </>
                  ) : shouldShowSignIn ? (
                    <Link href="/auth">
                      <Button className="w-full" data-testid="button-sign-in-mobile">Sign In</Button>
                    </Link>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </form>
        </div>
      </div>
    </header>
  );
}
