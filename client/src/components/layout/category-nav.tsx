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
    return <i className={`${icon} text-lg`} />;
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
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto py-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              onClick={() => handleCategoryClick(category.id)}
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-primary flex-shrink-0 group h-auto p-2"
            >
              <div className={`w-12 h-12 ${getColorClass(category.color)} rounded-full flex items-center justify-center group-hover:text-white transition-colors`}>
                {getCategoryIcon(category.icon)}
              </div>
              <span className="text-xs font-medium">{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
