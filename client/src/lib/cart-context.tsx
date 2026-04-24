import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { useAuth } from './auth-context';
import type { CartItemWithProduct } from '@shared/schema';

interface CartContextType {
  cartItems: CartItemWithProduct[];
  isLoading: boolean;
  cartCount: number;
  cartTotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [guestCart, setGuestCart] = useState<any[]>(() => {
    const saved = localStorage.getItem('guest_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const queryClient = useQueryClient();

  const { data: serverCartItems = [], isLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ['/api/cart', user?.id],
    enabled: !!user?.id,
  });

  // Sync guest cart to server when user logs in
  useEffect(() => {
    if (user?.id && guestCart.length > 0) {
      const syncCart = async () => {
        for (const item of guestCart) {
          try {
            await apiRequest('POST', '/api/cart', {
              userId: user.id,
              productId: item.product.id,
              quantity: item.quantity,
            });
          } catch (error) {
            console.error('Failed to sync guest item:', error);
          }
        }
        setGuestCart([]);
        localStorage.removeItem('guest_cart');
        queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
      };
      syncCart();
    }
  }, [user?.id]);

  const cartItems = user ? serverCartItems : guestCart;

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: number; quantity?: number }) => {
      const response = await apiRequest('POST', '/api/cart', {
        userId: user!.id,
        productId,
        quantity,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: number; quantity: number }) => {
      const response = await apiRequest('PUT', `/api/cart/${cartItemId}`, { quantity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (cartItemId: number) => {
      const response = await apiRequest('DELETE', `/api/cart/${cartItemId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/cart/user/${user!.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
    },
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    if (!item.product || !item.product.price) return sum;
    return sum + (parseFloat(item.product.price) * (item.quantity || 0));
  }, 0);

  const addToCart = async (productId: number, quantity = 1) => {
    if (user) {
      await addToCartMutation.mutateAsync({ productId, quantity });
    } else {
      // Guest add
      const existingIndex = guestCart.findIndex(item => item.product.id === productId);
      let newCart;
      if (existingIndex > -1) {
        newCart = [...guestCart];
        newCart[existingIndex].quantity += quantity;
      } else {
        // Fetch product info for the guest cart display
        const res = await fetch(`/api/products/${productId}`);
        const product = await res.json();
        newCart = [...guestCart, { id: Date.now(), productId, quantity, product }];
      }
      setGuestCart(newCart);
      localStorage.setItem('guest_cart', JSON.stringify(newCart));
      setIsOpen(true);
    }
  };

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (user) {
      await updateQuantityMutation.mutateAsync({ cartItemId, quantity });
    } else {
      const newCart = guestCart.map(item => 
        item.id === cartItemId ? { ...item, quantity } : item
      );
      setGuestCart(newCart);
      localStorage.setItem('guest_cart', JSON.stringify(newCart));
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    if (user) {
      await removeFromCartMutation.mutateAsync(cartItemId);
    } else {
      const newCart = guestCart.filter(item => item.id !== cartItemId);
      setGuestCart(newCart);
      localStorage.setItem('guest_cart', JSON.stringify(newCart));
    }
  };

  const clearCart = async () => {
    if (user) {
      await clearCartMutation.mutateAsync();
    } else {
      setGuestCart([]);
      localStorage.removeItem('guest_cart');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isLoading,
        cartCount,
        cartTotal,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
