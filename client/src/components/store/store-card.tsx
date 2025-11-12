import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import type { StoreWithUser } from '@shared/schema';

interface StoreCardProps {
  store: StoreWithUser;
}

export default function StoreCard({ store }: StoreCardProps) {
  const rating = parseFloat(store.rating || "0");
  const ownerName = `${store.user.firstName} ${store.user.lastName}`;

  return (
    <Link href={`/store/${store.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={store.user.avatar || ''} alt={ownerName} />
              <AvatarFallback>
                {store.user.firstName[0]}{store.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold font-heading text-primary hover:text-accent transition-colors duration-300">
                {store.name}
              </h3>
              <p className="text-sm text-gray-600 font-body">{store.university}</p>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {store.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating) ? 'fill-current' : ''
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating.toFixed(1)} ({store.reviewCount})
              </span>
            </div>
            <span className="text-sm font-medium text-primary">
              {store.productCount} products
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
