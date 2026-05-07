import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import { CartProvider } from "./lib/cart-context";
import { SocketProvider } from "./lib/socket-context";
import { HelmetProvider } from 'react-helmet-async';
import { Suspense, lazy } from "react";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";
import Home from "./pages/home";
import Browse from "./pages/browse";
import Store from "./pages/store";
import Product from "./pages/product";
import Dashboard from "./pages/dashboard";
import SellerSettings from "./pages/seller-settings";
import Checkout from "./pages/checkout";
import PaymentSuccess from "./pages/payment-success";
import AdminDashboard from "./pages/admin";
import AdminPortal from "./pages/admin-portal";
import AdminRegister from "./pages/admin-register";
import Auth from "./pages/auth";
import SellerAuth from "./pages/seller-auth";
import ModeSelection from "./pages/mode-selection";
import CartSidebar from "./components/cart/cart-sidebar";
import PWAInstallPrompt from "./components/pwa-install-prompt";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import About from "./pages/about";
import Contact from "./pages/contact";
import NotFound from "@/pages/not-found";
import WhatsAppSupport from "./components/whatsapp-support";
import ErrorBoundary from "./components/error-boundary";
import { useChatNotifications } from "./lib/socket-context";
import { useToast } from "./hooks/use-toast";
import { useEffect } from "react";

function NotificationHandler() {
  const { notifications, clearNotifications } = useChatNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (notifications.length > 0) {
      notifications.forEach(notification => {
        if (notification.type === 'new_message') {
          toast({
            title: `New message from ${notification.fromUser?.firstName}`,
            description: notification.preview,
            variant: "default",
          });
        } else if (notification.type === 'new_order') {
          toast({
            title: notification.title || "New Order Received!",
            description: notification.message || `You have a new order (#${notification.orderId})`,
            variant: "default",
            className: "bg-black text-white border-none",
          });
        } else if (notification.type === 'admin_alert') {
          toast({
            title: notification.title || "Admin Alert",
            description: notification.message,
            variant: "destructive",
          });
        }
      });
      clearNotifications();
    }
  }, [notifications, toast, clearNotifications]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <Switch>
        <Route path="/mode-selection" component={ModeSelection} />
        <Route path="/" component={Home} />
        <Route path="/gh" component={Home} />
        <Route path="/gh/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/gh/browse" component={Browse} />
        <Route path="/store/:id" component={Store} />
        <Route path="/gh/store/:id" component={Store} />
        <Route path="/product/:id" component={Product} />
        <Route path="/gh/product/:id" component={Product} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/gh/dashboard" component={Dashboard} />
        <Route path="/seller-settings" component={SellerSettings} />
        <Route path="/gh/seller-settings" component={SellerSettings} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/gh/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/gh/payment-success" component={PaymentSuccess} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/gh/admin" component={AdminDashboard} />
        <Route path="/admin-portal" component={AdminPortal} />
        <Route path="/gh/admin-portal" component={AdminPortal} />
        <Route path="/auth" component={Auth} />
        <Route path="/gh/auth" component={Auth} />
        <Route path="/seller-auth" component={SellerAuth} />
        <Route path="/gh/seller-auth" component={SellerAuth} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationHandler />
              <CartProvider>
                <div className="min-h-screen bg-gray-50 overflow-x-hidden">
                  <ErrorBoundary>
                    <Header />
                    <main>
                      <Router />
                    </main>
                    <Footer />
                    <CartSidebar />
                    <PWAInstallPrompt />
                    <WhatsAppSupport />
                  </ErrorBoundary>
                </div>
                <Toaster />
              </CartProvider>
            </SocketProvider>
          </AuthProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
