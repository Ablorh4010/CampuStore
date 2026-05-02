import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Link as LinkIcon, AlertCircle, Plus, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Store } from '@shared/schema';

interface MagicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStores: Store[];
}

export default function MagicImportModal({ isOpen, onClose, userStores }: MagicImportModalProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<'url' | 'preview'>('url');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number>(userStores[0]?.id || -1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const response = await apiRequest('POST', '/api/products/extract-url', { url: importUrl });
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setStep('preview');
    },
    onError: (error: Error) => {
      toast({
        title: 'Magic Import Failed',
        description: error.message || 'Could not extract data from this URL. Please try another site.',
        variant: 'destructive',
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const response = await apiRequest('POST', '/api/products', {
        ...finalData,
        storeId: selectedStoreId,
        isAvailable: true,
        approvalStatus: 'approved', // Auto-approve magic imports if needed or set to pending
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Product imported and launched successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setUrl('');
    setStep('url');
    setExtractedData(null);
    onClose();
  };

  const handleExtract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    extractMutation.mutate(url);
  };

  const handleLaunch = () => {
    if (selectedStoreId === -1 && userStores.length > 0) {
      toast({ title: 'Select a Store', variant: 'destructive' });
      return;
    }
    launchMutation.mutate(extractedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-none p-8 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            Magic Import.
          </DialogTitle>
          <DialogDescription className="font-bold text-gray-400">
            Paste a product URL from any website and our AI will do the rest.
          </DialogDescription>
        </DialogHeader>

        {step === 'url' ? (
          <form onSubmit={handleExtract} className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Link</Label>
              <div className="relative">
                <Input 
                  placeholder="https://amazon.com/product/..." 
                  className="h-14 rounded-2xl pl-12 border-2 border-gray-100 focus:border-primary transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={extractMutation.isPending}
                />
                <LinkIcon className="absolute left-4 top-4.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
              disabled={extractMutation.isPending || !url}
            >
              {extractMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Casting Magic Spell...</>
              ) : (
                "Extract Product Data"
              )}
            </Button>

            <div className="p-4 bg-gray-50 rounded-2xl flex gap-3 items-start">
               <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
               <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                 Best for: Amazon, Jumia, Alibaba, and other major marketplaces. Results may vary depending on site protection.
               </p>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Preview Card */}
             <div className="flex gap-6 items-start p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                   {extractedData.images?.[0] ? (
                     <img src={extractedData.images[0]} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon /></div>
                   )}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-lg uppercase tracking-tight truncate pr-4">{extractedData.title}</h4>
                      <p className="font-black text-primary">GH₵{extractedData.price}</p>
                   </div>
                   <p className="text-xs text-gray-500 font-medium line-clamp-3 mb-4">{extractedData.description}</p>
                   <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-black uppercase text-green-600">AI Verified Data</span>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Store</Label>
                   <select 
                     className="w-full h-12 rounded-xl border-2 border-gray-100 px-4 font-bold text-sm"
                     value={selectedStoreId}
                     onChange={(e) => setSelectedStoreId(parseInt(e.target.value))}
                   >
                     {userStores.map(s => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                     ))}
                   </select>
                </div>

                <div className="flex gap-3">
                   <Button variant="outline" className="h-12 rounded-xl px-6" onClick={() => setStep('url')}>Back</Button>
                   <Button 
                     className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs"
                     onClick={handleLaunch}
                     disabled={launchMutation.isPending}
                   >
                     {launchMutation.isPending ? <Loader2 className="animate-spin" /> : "Confirm & Launch"}
                   </Button>
                </div>
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
