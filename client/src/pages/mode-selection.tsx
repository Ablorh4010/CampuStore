import { useState } from 'react';
import { useLocation } from 'wouter';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ModeSelection() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<'buyer' | 'seller' | null>(null);

  const handleModeSelect = (mode: 'buyer' | 'seller') => {
    setSelectedMode(mode);
    // Store mode preference in localStorage
    localStorage.setItem('userMode', mode);
    // Redirect based on mode
    if (mode === 'seller') {
      setLocation('/seller-auth');
    } else {
      setLocation(`/auth?mode=${mode}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-heading text-primary mb-3">
            Welcome to CampusAffordHub
          </h1>
          <p className="text-xl text-gray-600">
            the student market place
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Buyer Mode */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
              selectedMode === 'buyer' ? 'ring-4 ring-primary shadow-2xl' : ''
            }`}
            onClick={() => setSelectedMode('buyer')}
            data-testid="card-buyer-mode"
          >
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  I want to Buy
                </h2>
                <p className="text-gray-600 mb-6">
                  Browse products from student sellers, discover great deals, and shop from your campus community
                </p>
                <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Browse thousands of products
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Connect with sellers directly
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    ID verification at checkout only
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Support fellow students
                  </li>
                </ul>
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeSelect('buyer');
                  }}
                  data-testid="button-select-buyer"
                >
                  Continue as Buyer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seller Mode */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
              selectedMode === 'seller' ? 'ring-4 ring-accent shadow-2xl' : ''
            }`}
            onClick={() => setSelectedMode('seller')}
            data-testid="card-seller-mode"
          >
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Store className="h-12 w-12 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  I want to Sell
                </h2>
                <p className="text-gray-600 mb-6">
                  Create your own store, list products, and start earning money from items you no longer need
                </p>
                <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Create your own store
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    WhatsApp OTP verification
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Choose shipping options
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    Earn money quickly
                  </li>
                </ul>
                <Button 
                  className="w-full bg-accent hover:bg-accent/90"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeSelect('seller');
                  }}
                  data-testid="button-select-seller"
                >
                  Continue as Seller
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 mt-8 text-sm">
          You can switch between buyer and seller modes anytime from your account settings
        </p>
      </div>
    </div>
  );
}
