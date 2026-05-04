import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Link as LinkIcon, AlertCircle, Plus, CheckCircle2, Image as ImageIcon, Tag, Bookmark, Edit3 } from 'lucide-react';
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

interface MagicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStores: Store[];
  initialUrl?: string;
}

type ImportStep = 'url' | 'bookmarking' | 'extracting' | 'preview' | 'editing';

export default function MagicImportModal({ isOpen, onClose, userStores, initialUrl }: MagicImportModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState(initialUrl || '');
  const [step, setStep] = useState<ImportStep>('url');

  useEffect(() => {
    if (isOpen && initialUrl) {
      setUrl(initialUrl);
      setStep('bookmarking');
      bookmarkMutation.mutate(initialUrl);
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

  const bookmarkMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const response = await apiRequest('POST', '/api/bookmarks', { 
        url: importUrl,
        status: 'pending'
      });
      return response.json();
    },
    onSuccess: () => {
      setStep('extracting');
      extractMutation.mutate(url);
    },
    onError: (error: Error) => {
      toast({
        title: 'Bookmarking Failed',
        description: error.message || 'Could not save bookmark. Proceeding to extraction...',
        variant: 'destructive',
      });
      setStep('extracting');
      extractMutation.mutate(url);
    },
  });

  const extractMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const response = await apiRequest('POST', '/api/products/extract-url', { url: importUrl });
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      if (data.categoryId) {
        setSelectedCategoryId(data.categoryId);
      }
      setStep('preview');
      toast({
        title: 'Magic Extraction Complete!',
        description: 'We found your product details.',
      });
    },
    onError: (error: Error) => {
      setStep('url');
      toast({
        title: 'Magic Import Failed',
        description: error.message || 'Could not extract data from this URL. Please try another site.',
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
        title: 'Success!',
        description: 'Product imported and launched successfully.',
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Launch Failed',
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

  const handleStartImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setStep('bookmarking');
    bookmarkMutation.mutate(url);
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
        <DialogContent className="max-w-2xl rounded-[2rem] border-none p-8 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              Magic Import.
            </DialogTitle>
            <DialogDescription className="font-bold text-gray-400">
              Paste a product URL and let AI handle the heavy lifting.
            </DialogDescription>
          </DialogHeader>

          {step === 'url' && (
            <form onSubmit={handleStartImport} className="space-y-6 py-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Link</Label>
                <div className="relative">
                  <Input 
                    placeholder="https://amazon.com/product/..." 
                    className="h-14 rounded-2xl pl-12 border-2 border-gray-100 focus:border-primary transition-all"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <LinkIcon className="absolute left-4 top-4.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                disabled={!url}
              >
                "Cast Magic Spell"
              </Button>

              <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-3">
                 <div className="flex gap-3 items-start">
                   <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                   <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                     Works best with Amazon, Jumia, Alibaba, and WooCommerce. We'll bookmark the URL and extract details automatically.
                   </p>
                 </div>
                 <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                   <p className="text-[9px] font-black uppercase text-primary mb-1">Store Owner? Use our Sync Plugin</p>
                   <p className="text-[9px] font-bold text-gray-500 lowercase leading-tight">
                     Download our WooCommerce plugin to add a "Sync to CampuStore" button directly to your WordPress dashboard.
                   </p>
                   <a 
                     href="/attached_assets/campustore-woocommerce-sync.php" 
                     download 
                     className="inline-block mt-2 text-[9px] font-black uppercase text-primary underline"
                   >
                     Download Sync Plugin
                   </a>
                 </div>
              </div>
            </form>
          )}

          {(step === 'bookmarking' || step === 'extracting') && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
               <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     {step === 'bookmarking' ? <Bookmark className="w-8 h-8 text-primary animate-bounce" /> : <Sparkles className="w-8 h-8 text-primary animate-pulse" />}
                  </div>
               </div>
               <div className="text-center">
                  <h3 className="text-xl font-black uppercase tracking-tighter">
                     {step === 'bookmarking' ? "Saving Bookmark..." : "Extracting Data..."}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                     {step === 'bookmarking' ? "Securing the link for you" : "AI is reading the page details"}
                  </p>
               </div>
            </div>
          )}

          {step === 'preview' && extractedData && (
            <div className="space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                     <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-4">{extractedData.description}</p>
                     <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-green-100 px-3 py-1 rounded-full">
                           <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                           <span className="text-[10px] font-black uppercase text-green-600">AI Extracted</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full">
                           <Tag className="w-3.5 h-3.5 text-primary" />
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
                        <SelectTrigger className="h-12 rounded-xl border-2">
                           <SelectValue placeholder="Select Store" />
                        </SelectTrigger>
                        <SelectContent>
                           {userStores.map(s => (
                             <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                           ))}
                           {userStores.length === 0 && <SelectItem value="-1">Official Store</SelectItem>}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verify Category</Label>
                     <Select value={selectedCategoryId.toString()} onValueChange={(v) => setSelectedCategoryId(parseInt(v))}>
                        <SelectTrigger className="h-12 rounded-xl border-2">
                           <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                           {categories.map(c => (
                             <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                           ))}
                      </SelectContent>
                   </Select>
                </div>
             </div>

             <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="h-16 rounded-2xl flex-1 font-black uppercase tracking-widest text-[10px]" 
                  onClick={openFullEditor}
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Details
                </Button>
                <Button 
                  className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                  onClick={handleLaunch}
                  disabled={launchMutation.isPending}
                >
                  {launchMutation.isPending ? <Loader2 className="animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Quick Launch</>}
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
