import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import type { Category } from '@shared/schema';

export default function CategoryNav() {
  const [, setLocation] = useLocation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const handleCategoryClick = (categoryId: number) => {
    setLocation(`/browse?categoryId=${categoryId}`);
  };

  const getCategoryIcon = (icon: string) => {
    // Map common category icons to actual icon components
    const iconMap: Record<string, React.ReactNode> = {
      'fas fa-book': '📚',
      'fas fa-laptop': '💻',
      'fas fa-tshirt': '👕',
      'fas fa-home': '🏠',
      'fas fa-gamepad': '🎮',
      'fas fa-music': '🎵',
      'fas fa-car': '🚗',
      'fas fa-dumbbell': '💪',
      'fas fa-utensils': '🍽️',
      'fas fa-heart': '❤️',
      'fas fa-star': '⭐',
      'fas fa-gift': '🎁',
      'fas fa-camera': '📷',
      'fas fa-mobile': '📱',
      'fas fa-bicycle': '🚲',
      'fas fa-graduation-cap': '🎓',
      'fas fa-palette': '🎨',
      'fas fa-calculator': '🧮',
      'fas fa-microscope': '🔬',
      'fas fa-football': '⚽',
      'fas fa-basketball': '🏀',
      'fas fa-tennis': '🎾',
    };
    
    return (
      <span className="text-2xl">
        {iconMap[icon] || '📦'}
      </span>
    );
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue-100': 'bg-blue-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
      'yellow-100': 'bg-yellow-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
      'pink-100': 'bg-pink-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
      'green-100': 'bg-green-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
      'red-100': 'bg-red-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
      'purple-100': 'bg-purple-100/80 group-hover:bg-primary/90 backdrop-blur-sm',
    };
    return colorMap[color] || 'bg-gray-100/80 group-hover:bg-primary/90 backdrop-blur-sm';
  };

  return (
    <nav className="bg-white/30 backdrop-blur-sm border-b border-white/20 shadow-sm relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/40 via-purple-100/40 to-pink-100/40 animate-pulse"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex space-x-6 overflow-x-auto py-4 scrollbar-hide scroll-smooth">
          {categories.map((category, index) => (
            <Button
              key={category.id}
              variant="ghost"
              onClick={() => handleCategoryClick(category.id)}
              className="flex flex-col items-center space-y-2 text-gray-600 hover:text-primary flex-shrink-0 group h-auto p-3 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-lg animate-fade-in-up"
              style={{
                animationDelay: `${index * 100}ms`,
                animationDuration: '600ms'
              }}
            >
              <div className={`w-14 h-14 ${getColorClass(category.color)} rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3`}>
                {getCategoryIcon(category.icon)}
              </div>
              <span className="text-xs font-medium font-body group-hover:font-semibold transition-all duration-300">{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
