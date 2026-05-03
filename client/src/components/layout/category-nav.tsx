import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  Mail, 
  Laptop, 
  Book, 
  Shirt, 
  Home as HomeIcon, 
  Trophy, 
  Briefcase, 
  ShoppingBag,
  Smartphone,
  Gamepad,
  Music,
  Heart,
  Utensils
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category } from '@shared/schema';

export default function CategoryNav() {
  const [, setLocation] = useLocation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const handleCategoryClick = (categoryId: number) => {
    setLocation(`/gh/browse?categoryId=${categoryId}`);
  };

  const getModernCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    const iconProps = { className: "w-6 h-6 transition-all duration-500 group-hover:scale-125 group-hover:rotate-12" };
    
    if (n.includes('electronics')) return <Laptop {...iconProps} />;
    if (n.includes('academic')) return <Book {...iconProps} />;
    if (n.includes('fashion')) return <Shirt {...iconProps} />;
    if (n.includes('home')) return <HomeIcon {...iconProps} />;
    if (n.includes('sports')) return <Trophy {...iconProps} />;
    if (n.includes('services')) return <Briefcase {...iconProps} />;
    if (n.includes('phone')) return <Smartphone {...iconProps} />;
    if (n.includes('game')) return <Gamepad {...iconProps} />;
    if (n.includes('music')) return <Music {...iconProps} />;
    if (n.includes('health') || n.includes('beauty')) return <Heart {...iconProps} />;
    if (n.includes('food') || n.includes('kitchen')) return <Utensils {...iconProps} />;
    
    return <ShoppingBag {...iconProps} />;
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue-100': 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      'yellow-100': 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white',
      'pink-100': 'bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white',
      'green-100': 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white',
      'red-100': 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white',
      'purple-100': 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    };
    return colorMap[color] || 'bg-gray-50 text-gray-600 group-hover:bg-primary group-hover:text-white';
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex space-x-8 overflow-x-auto py-4 scrollbar-hide scroll-smooth items-center">
          {categories.filter(c => !c.parentId).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="ghost"
                onClick={() => handleCategoryClick(category.id)}
                className="flex flex-col items-center space-y-2 group h-auto p-2 rounded-2xl hover:bg-transparent transition-all duration-300"
                data-testid={`category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`w-12 h-12 ${getColorClass(category.color)} rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1`}>
                  {getModernCategoryIcon(category.name)}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors duration-300">{category.name}</span>
              </Button>
            </motion.div>
          ))}

          {/* Separator */}
          {categories.length > 0 && (
            <div className="h-8 w-px bg-gray-100 mx-2 flex-shrink-0"></div>
          )}

          {/* About Link */}
          <Button
            variant="ghost"
            onClick={() => setLocation('/gh/about')}
            className="flex flex-col items-center space-y-2 group h-auto p-2 rounded-2xl hover:bg-transparent transition-all duration-300"
            data-testid="nav-about"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1">
              <Info className="h-6 w-6 transition-all duration-500 group-hover:scale-125" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors duration-300">About</span>
          </Button>

          {/* Contact Link */}
          <Button
            variant="ghost"
            onClick={() => setLocation('/gh/contact')}
            className="flex flex-col items-center space-y-2 group h-auto p-2 rounded-2xl hover:bg-transparent transition-all duration-300"
            data-testid="nav-contact"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1">
              <Mail className="h-6 w-6 transition-all duration-500 group-hover:scale-125" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors duration-300">Contact</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
