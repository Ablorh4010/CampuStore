import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      const hasInstalled = localStorage.getItem('pwaInstalled');
      const hasDismissed = localStorage.getItem('pwaDismissed');
      if (!hasInstalled && !hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('pwaInstalled', 'true');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="shadow-2xl border-2 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Install CampusAffordHub</h3>
                <p className="text-sm text-gray-600">Get the app experience!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1"
              onClick={handleDismiss}
              data-testid="button-dismiss-install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              onClick={handleInstall}
              className="w-full"
              data-testid="button-install-pwa"
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Fast, reliable, and works offline
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
