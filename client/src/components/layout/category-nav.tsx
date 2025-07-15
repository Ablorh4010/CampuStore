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
      'blue-100': 'bg-blue-100 group-hover:bg-primary',
      'yellow-100': 'bg-yellow-100 group-hover:bg-primary',
      'pink-100': 'bg-pink-100 group-hover:bg-primary',
      'green-100': 'bg-green-100 group-hover:bg-primary',
      'red-100': 'bg-red-100 group-hover:bg-primary',
      'purple-100': 'bg-purple-100 group-hover:bg-primary',
    };
    return colorMap[color] || 'bg-gray-100 group-hover:bg-primary';
  };

  return (
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-6 overflow-x-auto py-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              onClick={() => handleCategoryClick(category.id)}
              className="flex flex-col items-center space-y-2 text-gray-600 hover:text-primary flex-shrink-0 group h-auto p-3 rounded-xl hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <div className={`w-14 h-14 ${getColorClass(category.color)} rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:scale-110`}>
                {getCategoryIcon(category.icon)}
              </div>
              <span className="text-xs font-medium font-body group-hover:font-semibold transition-all">{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
