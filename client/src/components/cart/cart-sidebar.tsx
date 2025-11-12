import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPriceWithFee, calculatePriceWithFee } from '@/lib/utils';

export default function CartSidebar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const {
    cartItems,
    cartTotal,
    isOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const total = cartItems.reduce((sum, item) => {
    return sum + (calculatePriceWithFee(item.product.price) * (item.quantity || 0));
  }, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeCart}
        />
      )}

      {/* Sidebar */}
      <div
        className={`cart-sidebar fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 ${
          isOpen ? 'open' : 'closed'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          <Button variant="ghost" size="icon" onClick={closeCart}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center p-8 h-full">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign In to Shop</h3>
            <p className="text-gray-600 text-center mb-6">
              Sign in to add items to your cart and checkout
            </p>
            <Link href="/auth" onClick={closeCart}>
              <Button size="lg" className="w-full" data-testid="button-cart-signin">
                Sign In to Continue
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg"
                >
                  {item.product.images && item.product.images.length > 0 && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-2">
                      {item.product.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      by {item.product.store.user.firstName} {item.product.store.user.lastName[0]}.
                    </p>
                    <p className="text-primary font-semibold">
                      ${formatPriceWithFee(item.product.price)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge variant="outline">{item.quantity || 0}</Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </ScrollArea>

          {cartItems.length > 0 && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-primary">
                  ${total.toFixed(2)}
                </span>
              </div>
              <Button 
                className="w-full" 
                size="lg" 
                data-testid="button-checkout"
                onClick={() => {
                  closeCart();
                  setLocation('/checkout');
                }}
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </>
        )}
      </div>
    </>
  );
}