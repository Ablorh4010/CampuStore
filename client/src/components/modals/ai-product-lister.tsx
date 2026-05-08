import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, Loader2, Link as LinkIcon, AlertCircle, Plus, CheckCircle2, Image as ImageIcon, Tag, Sparkles, Edit3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import ProductForm from './product-form';
import type { Store, Category } from '@shared/schema';

interface AIProductListerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStores: Store[];
  initialUrl?: string;
}

type ImportStep = 'url' | 'fetching' | 'preview' | 'editing';

export default function AIProductListerModal({ isOpen, onClose, userStores, initialUrl }: AIProductListerModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState(initialUrl || '');
  const [step, setStep] = useState<ImportStep>('url');

  useEffect(() => {
    if (isOpen && initialUrl) {
      setUrl(initialUrl);
      handleStartImport();
    }
  }, [isOpen, initialUrl]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number>(userStores[0]?.id || -1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(1);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  useEffect(() => {
    if (userStores.length > 0 && selectedStoreId === -1) {
      setSelectedStoreId(userStores[0].id);
    }
  }, [userStores, selectedStoreId]);

  const extractMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const response = await apiRequest('POST', '/api/products/ai-fetch', { url: importUrl });
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      if (data.categoryId) {
        setSelectedCategoryId(data.categoryId);
      }
      setStep('preview');
      toast({
        title: 'Gemini AI Listing Ready!',
        description: 'Product details successfully extracted and analyzed.',
      });
    },
    onError: (error: Error) => {
      setStep('url');
      toast({
        title: 'AI Fetch Failed',
        description: error.message || 'Gemini couldn\'t analyze this URL. Please try another link.',
        variant: 'destructive',
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const endpoint = user?.isAdmin ? '/api/admin/products' : '/api/products';
      const response = await apiRequest('POST', endpoint, {
        ...finalData,
        storeId: selectedStoreId,
        categoryId: selectedCategoryId,
        isAvailable: true,
        approvalStatus: 'approved',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: 'Live on Campus!',
        description: 'Your product has been listed successfully via AI.',
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Listing Failed',
        description: error.message || 'Failed to create the product.',
        variant: 'destructive',
      });
    }
  });

  const handleClose = () => {
    setUrl('');
    setStep('url');
    setExtractedData(null);
    onClose();
  };

  const handleStartImport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) return;
    setStep('fetching');
    extractMutation.mutate(url);
  };

  const handleLaunch = () => {
    if (selectedStoreId === -1) {
      toast({ title: 'Select a Store', variant: 'destructive' });
      return;
    }
    launchMutation.mutate(extractedData);
  };

  const openFullEditor = () => {
    setIsProductFormOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl rounded-[3rem] border-none p-8 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
              <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center">
                 <Brain className="w-6 h-6 text-primary animate-pulse" />
              </div>
              Gemini AI Lister.
            </DialogTitle>
            <DialogDescription className="font-bold text-gray-400">
              Paste any URL. Gemini will fetch, analyze, and list it for you.
            </DialogDescription>
          </DialogHeader>

          {step === 'url' && (
            <form onSubmit={handleStartImport} className="space-y-6 py-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product URL</Label>
                <div className="relative">
                  <Input 
                    placeholder="https://amazon.com/product/..." 
                    className="h-16 rounded-2xl pl-12 border-2 border-gray-100 focus:border-primary transition-all text-lg font-bold"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <LinkIcon className="absolute left-4 top-5.5 h-6 w-6 text-gray-400" />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-20 rounded-[2rem] bg-black text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-black/20 group overflow-hidden relative"
                disabled={!url}
              >
                <span className="relative z-10">Fetch with Gemini AI</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>

              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex flex-col gap-3">
                 <div className="flex gap-4 items-start">
                   <Zap className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                   <div>
                     <p className="text-xs font-black uppercase text-primary mb-1">AI Direct Fetch Enabled</p>
                     <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed">
                       Gemini will directly browse the URL, identify the product, extract HD images, and categorize it automatically for our marketplace.
                     </p>
                   </div>
                 </div>
              </div>
            </form>
          )}

          {step === 'fetching' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
               <div className="relative">
                  <div className="w-32 h-32 border-4 border-primary/10 border-t-primary rounded-[2.5rem] animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Brain className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                     <Sparkles className="w-8 h-8 text-primary animate-bounce" />
                  </div>
               </div>
               <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Gemini is Browsing...</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     Fetching HTML • Analyzing Images • Mapping Categories
                  </p>
               </div>
            </div>
          )}

          {step === 'preview' && extractedData && (
            <div className="space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex gap-6 items-start p-8 bg-gray-50 rounded-[3rem] border-2 border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16 rounded-full" />
                  <div className="w-40 h-40 rounded-[2rem] overflow-hidden bg-white shadow-xl flex-shrink-0 border-4 border-white relative z-10">
                     {extractedData.images?.[0] ? (
                       <img src={extractedData.images[0]} className="w-full h-full object-cover" alt="" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon className="w-10 h-10" /></div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                     <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-xl uppercase tracking-tight truncate pr-4">{extractedData.title}</h4>
                        <div className="bg-black text-white px-4 py-2 rounded-xl">
                           <p className="font-black text-lg">GH₵{extractedData.price}</p>
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 font-medium line-clamp-3 mb-6 leading-relaxed italic">"{extractedData.description}"</p>
                     <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-green-100 px-4 py-2 rounded-full border border-green-200">
                           <CheckCircle2 className="w-4 h-4 text-green-600" />
                           <span className="text-[10px] font-black uppercase text-green-600">AI Analyzed</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                           <Tag className="w-4 h-4 text-primary" />
                           <span className="text-[10px] font-black uppercase text-primary">
                             {categories.find(c => c.id === selectedCategoryId)?.name || 'Categorizing...'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Store</Label>
                     <Select value={selectedStoreId.toString()} onValueChange={(v) => setSelectedStoreId(parseInt(v))}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 font-bold uppercase text-xs">
                           <SelectValue placeholder="Select Store" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                           {userStores.map(s => (
                             <SelectItem key={s.id} value={s.id.toString()} className="font-bold uppercase text-xs">{s.name}</SelectItem>
                           ))}
                           {userStores.length === 0 && <SelectItem value="-1" className="font-bold uppercase text-xs">Official Store</SelectItem>}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verify Category</Label>
                     <Select value={selectedCategoryId.toString()} onValueChange={(v) => setSelectedCategoryId(parseInt(v))}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 font-bold uppercase text-xs">
                           <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                           {categories.map(c => (
                             <SelectItem key={c.id} value={c.id.toString()} className="font-bold uppercase text-xs">{c.name}</SelectItem>
                           ))}
                      </SelectContent>
                   </Select>
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="h-20 rounded-[1.5rem] flex-1 font-black uppercase tracking-widest text-[10px] border-2" 
                  onClick={openFullEditor}
                >
                  <Edit3 className="w-5 h-5 mr-2" /> Modify Data
                </Button>
                <Button 
                  className="flex-[2] h-20 rounded-[2rem] bg-black text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-black/30 group"
                  onClick={handleLaunch}
                  disabled={launchMutation.isPending}
                >
                  {launchMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2 text-primary group-hover:scale-125 transition-transform" />
                      List Product Now
                    </>
                  )}
                </Button>
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {extractedData && (
      <ProductForm
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        userStores={userStores}
        initialData={{
          title: extractedData.title,
          description: extractedData.description,
          price: extractedData.price?.toString(),
          originalPrice: extractedData.originalPrice?.toString(),
          condition: extractedData.condition || 'new',
          categoryId: selectedCategoryId,
          storeId: selectedStoreId,
          images: extractedData.images || [],
        }}
      />
    )}
    </>
  );
}

