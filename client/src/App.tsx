import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import { CartProvider } from "./lib/cart-context";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";
import CartSidebar from "./components/cart/cart-sidebar";
import PWAInstallPrompt from "./components/pwa-install-prompt";
import Home from "./pages/home";
import Browse from "./pages/browse";
import Store from "./pages/store";
import Product from "./pages/product";
import Dashboard from "./pages/dashboard";
import Auth from "./pages/auth";
import AdminDashboard from "./pages/admin";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import ModeSelection from "./pages/mode-selection";
import SellerSettings from "./pages/seller-settings";
import Checkout from "./pages/checkout";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/mode-selection" component={ModeSelection} />
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/store/:id" component={Store} />
      <Route path="/product/:id" component={Product} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/seller-settings" component={SellerSettings} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/auth" component={Auth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main>
                <Router />
              </main>
              <Footer />
              <CartSidebar />
              <PWAInstallPrompt />
            </div>
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
