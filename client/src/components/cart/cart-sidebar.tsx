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
    if (!item.product || !item.product.price) return sum;
    return sum + (calculatePriceWithFee(item.product.price) * (item.quantity || 0));
  }, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all"
          onClick={closeCart}
        />
      )}

      {/* Sidebar */}
      <div
        className={`cart-sidebar fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl z-50 transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-8 border-b border-gray-50">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-black uppercase tracking-tighter">My Bag.</h2>
             <Badge className="bg-black text-white font-black text-[10px] rounded-full px-2">{cartItems.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={closeCart} className="rounded-full hover:bg-gray-50">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-250px)] px-8 py-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-8 w-8 text-gray-200" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-2">Your bag is empty</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8">Items you add will appear here.</p>
              <Link href="/browse" onClick={closeCart}>
                <Button className="bg-black text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-6 group"
                >
                  <div className="relative w-24 h-32 flex-shrink-0 bg-gray-50 rounded-2xl overflow-hidden">
                    {item.product.images && item.product.images.length > 0 && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col py-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-xs uppercase tracking-tight text-gray-900 line-clamp-2 pr-4">
                        {item.product.title}
                      </h4>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {item.product.store.name}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1 border border-gray-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-white"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-black">{item.quantity || 0}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-white"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <span className="font-black text-sm">
                        {formatPriceWithFee(item.product.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {cartItems.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-50 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-gray-400">Total Amount</span>
              <span className="text-2xl font-black italic">
                GH₵{total.toFixed(2)}
              </span>
            </div>
            
            <Button 
              className="w-full h-16 bg-black hover:bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-black/10 transition-all active:scale-[0.98]" 
              size="lg" 
              onClick={() => {
                closeCart();
                setLocation('/checkout');
              }}
            >
              Secure Checkout
            </Button>
            
            <p className="text-[9px] text-center font-bold text-gray-300 uppercase tracking-[0.2em]">
              Free delivery on all campus orders
            </p>
          </div>
        )}
      </div>
    </>
  );

}