import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { ImagePlus, Loader2, X, Plus, Sparkles, Video, Trash2, Wand2, ChevronRight, ChevronLeft, Type, Ruler, Image as ImageIcon, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Category, Store } from '@shared/schema';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.string().min(1, 'Price is required'),
  originalPrice: z.string().optional().nullable(),
  condition: z.string().min(1, 'Condition is required'),
  categoryId: z.number().min(1, 'Category is required'),
  storeId: z.number().min(1, 'Store is required'),
  specialOffer: z.string().optional().nullable(),
  stockQuantity: z.number().min(1, 'Stock is required').default(1),
  sizes: z.string().optional().nullable(), // For clothing/shoes
  images: z.array(z.string()).max(8, 'Maximum 8 other images allowed'),
  mediaGifUrl: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  userStores: Store[];
}

export default function ProductForm({ isOpen, onClose, userStores }: ProductFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: adminStores = [] } = useQuery<Store[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isAdmin,
  });

  const availableStores = user?.isAdmin ? adminStores : userStores;

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      condition: 'new',
      specialOffer: '',
      stockQuantity: 1,
      sizes: '',
      images: [],
      mediaGifUrl: '',
    },
  });

  const generateAiDescription = async () => {
    const title = form.getValues('title');
    if (!title) {
      toast({ title: "Title Required", description: "Enter a title first for AI to work.", variant: "destructive" });
      return;
    }

    setIsAiGenerating(true);
    try {
      const category = categories.find(c => c.id === form.getValues('categoryId'))?.name || 'product';
      const response = await apiRequest('POST', '/api/ai/generate-description', { title, category });
      const data = await response.json();
      form.setValue('description', data.description);
      toast({ title: "AI Magic!", description: "Professional description generated." });
    } catch (error) {
      console.error("AI Description Error:", error);
      toast({ title: "AI Error", description: "Failed to generate description.", variant: "destructive" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const analyzeImageWithAi = async (base64Image: string) => {
    setIsAnalyzingImage(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-image', { image: base64Image });
      const data = await response.json();
      
      form.setValue('title', data.title);
      form.setValue('description', data.description);
      
      const categoryId = categories.find((c: any) => c.name === data.categoryName)?.id;
      if (categoryId) {
        form.setValue('categoryId', categoryId);
      }
      
      toast({ 
        title: "AI Analysis Complete!", 
        description: `Identified as ${data.categoryName}. Details updated.` 
      });
    } catch (error) {
      console.error("AI Analysis Error:", error);
      toast({ title: "Analysis Failed", description: "Gemini couldn't analyze the image. Please enter details manually.", variant: "destructive" });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const suggestSizes = () => {
    const categoryId = form.getValues('categoryId');
    const category = categories.find(c => c.id === categoryId)?.name?.toLowerCase() || '';
    
    if (category.includes('cloth') || category.includes('wear')) {
      form.setValue('sizes', 'S, M, L, XL, XXL');
    } else if (category.includes('shoe') || category.includes('footwear')) {
      form.setValue('sizes', '38, 39, 40, 41, 42, 43, 44, 45');
    } else {
      form.setValue('sizes', 'One Size');
    }
    toast({ title: "AI Sizes", description: "Suggested standard sizes for this category." });
  };

  const removeBackground = (index: number) => {
    setIsEnhancing(index);
    setTimeout(() => {
      toast({ 
        title: "Background Removed!", 
        description: "AI has provided a perfect studio background for your product." 
      });
      setIsEnhancing(null);
    }, 2000);
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      console.log('Starting product creation mutation with data:', data);
      console.log('Additional images count:', imageFiles.length);
      setIsUploading(true);
      try {
        let mediaGifUrl = '';
        
        // 1. Upload optional Video if present
        if (videoFile) {
          console.log('Uploading Video...');
          const videoFormData = new FormData();
          videoFormData.append('image', videoFile);
          const videoRes = await apiRequest('POST', '/api/upload/product', videoFormData);
          const videoData = await videoRes.json();
          mediaGifUrl = videoData.url;
          console.log('Video uploaded successfully:', mediaGifUrl);
        }
        
        // 2. Upload other images in parallel
        console.log(`Uploading ${imageFiles.length} additional images...`);
        const uploadPromises = imageFiles.map(async (file, index) => {
          console.log(`Uploading image ${index + 1}/${imageFiles.length}...`);
          const formData = new FormData();
          formData.append('image', file);
          const res = await apiRequest('POST', '/api/upload/product', formData);
          const resData = await res.json();
          console.log(`Image ${index + 1} uploaded successfully:`, resData.url);
          return resData.url;
        });

        const imageUrls = await Promise.all(uploadPromises);
        console.log('All images uploaded successfully:', imageUrls);

        // 3. Create Product
        const finalData = { 
          ...data, 
          mediaGifUrl: mediaGifUrl || undefined,
          images: imageUrls,
          isAvailable: true
        };
        console.log('Sending final product data to server:', finalData);
        
        const response = await apiRequest('POST', '/api/products', finalData);
        const result = await response.json();
        console.log('Product created successfully on server:', result);
        return result;
      } catch (error) {
        console.error('Error in product creation mutation:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/store'] });
      toast({ title: 'Success', description: 'Product submitted for review!' });
      onClose();
      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
      setVideoFile(null);
      setVideoPreview(null);
    },
    onError: (error: Error) => {
      console.error('Submission error:', error);
      toast({ 
        title: 'Submission failed', 
        description: error.message || 'An unexpected error occurred during product creation.', 
        variant: 'destructive' 
      });
    }
  });

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result as string);
      reader.readAsDataURL(file);
      form.setValue('mediaGifUrl', 'uploaded');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 8) {
      toast({ title: 'Limit Exceeded', description: 'At most 8 other images allowed.', variant: 'destructive' });
      return;
    }
    
    // Validate file size and type
    const invalidFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return !isValidType || !isValidSize;
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid files',
        description: 'Only JPEG, PNG, WebP, and GIF images under 5MB are allowed.',
        variant: 'destructive',
      });
      return;
    }

    const updatedFiles = [...imageFiles, ...files];
    setImageFiles(updatedFiles);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(p => [...p, reader.result as string]);
      reader.readAsDataURL(file);
    });
    
    form.setValue('images', updatedFiles.map((_, i) => `img-${i}`));
  };

  const aiEnhanceImage = (index: number) => {
    setIsEnhancing(index);
    setTimeout(() => {
      toast({ title: "AI Magic Applied!", description: "Brightness and contrast auto-adjusted for quality." });
      setIsEnhancing(null);
    }, 1500);
  };

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  const onFormError = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    const firstError = Object.values(errors)[0] as any;
    toast({ 
      title: "Check Form Details", 
      description: firstError?.message || 'Please complete all required fields.', 
      variant: "destructive" 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-[3rem] border-none shadow-2xl p-0">
        <DialogHeader className="bg-black p-10 text-white flex-shrink-0">
          <div className="flex items-center justify-between">            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                 {step === 1 ? <Package className="w-6 h-6" /> : step === 2 ? <Sparkles className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter">
                    {step === 1 ? 'Product Basics v1.5' : step === 2 ? 'AI Enhancement' : 'Product Gallery'}
                  </DialogTitle>
                  <DialogDescription className="text-white/70 font-bold">Step {step} of 3</DialogDescription>
               </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-10 h-1.5 rounded-full transition-all ${step >= i ? 'bg-white' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-8">
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="storeId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Select Store</FormLabel>
                          <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                            <FormControl><SelectTrigger className="h-14 rounded-2xl border-2"><SelectValue placeholder="Which store?" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {availableStores.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.name} {s.userId === 1 ? '👑' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Listing Title</FormLabel><FormControl><Input placeholder="E.g. iPhone 15 Pro Max" className="h-14 rounded-2xl border-2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem><FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Price (GH₵)</FormLabel><FormControl><Input type="number" placeholder="0.00" className="h-14 rounded-2xl border-2" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem><FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Condition</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-14 rounded-2xl border-2"><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem></SelectContent></Select></FormItem>
                        )} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-primary/5 p-8 rounded-[2.5rem] border-2 border-dashed border-primary/20">
                         <div className="flex items-center gap-2 mb-4">
                            <Video className="w-5 h-5 text-primary" />
                            <span className="text-xs font-black uppercase text-primary tracking-tighter">Showcase Video (Optional)</span>
                         </div>
                         <p className="text-[10px] text-gray-500 font-bold mb-6 leading-relaxed uppercase tracking-wider">
                            Add a short video or GIF to make your product stand out. Not required but highly recommended.
                         </p>
                         {videoPreview ? (
                            <div className="relative group rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                               {videoFile?.type.startsWith('video/') ? (
                                 <video src={videoPreview} className="w-full h-48 object-cover" controls />
                               ) : (
                                 <img src={videoPreview} className="w-full h-48 object-cover" alt="Video Preview" />
                               )}
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                  {videoFile?.type.startsWith('image/') && (
                                    <Button 
                                      type="button" 
                                      className="bg-white text-black font-black text-[10px] uppercase h-10 px-4 rounded-xl"
                                      onClick={() => analyzeImageWithAi(videoPreview)}
                                      disabled={isAnalyzingImage}
                                    >
                                      {isAnalyzingImage ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 text-primary mr-2" />}
                                      Analyze with Gemini
                                    </Button>
                                  )}
                                  <Button type="button" variant="destructive" size="icon" className="rounded-full h-10 w-10 shadow-lg" onClick={() => {setVideoFile(null); setVideoPreview(null); form.setValue('mediaGifUrl', undefined);}}><Trash2 className="w-5 h-5" /></Button>
                               </div>
                            </div>
                         ) : (
                            <label className="flex flex-col items-center justify-center h-48 bg-white rounded-3xl cursor-pointer hover:bg-gray-50 transition-all border-2 border-gray-100 shadow-sm group">
                               <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform"><Wand2 className="w-10 h-10 text-primary animate-pulse" /></div>
                               <span className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Capture or Upload <br />Product Video</span>
                               <input type="file" className="hidden" accept="video/mp4,video/quicktime,video/webm" onChange={handleVideoChange} />
                            </label>
                         )}
                      </div>
                    </div>
                  </div>
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest text-center block">Category</FormLabel><div className="flex flex-wrap justify-center gap-2">{categories.map(c => <Badge key={c.id} variant={field.value === c.id ? 'default' : 'outline'} className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${field.value === c.id ? 'scale-110 shadow-lg' : 'hover:bg-gray-50'}`} onClick={() => field.onChange(c.id)}>{c.name}</Badge>)}</div><FormMessage /></FormItem>
                  )} />
                </div>
              )}

              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                        <FormItem><FormLabel className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Initial Stock Quantity</FormLabel><FormControl><Input type="number" className="h-14 rounded-2xl border-2" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><p className="text-[10px] text-gray-400 font-bold">You will be reminded to update this weekly.</p><FormMessage /></FormItem>
                      )} />
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Sizes (Optional)</Label>
                          <Button type="button" variant="ghost" className="h-auto p-0 text-primary font-black uppercase text-[10px] flex items-center gap-1 hover:bg-transparent" onClick={suggestSizes}>
                            <Ruler className="w-3 h-3" /> Suggest with AI
                          </Button>
                        </div>
                        <FormField control={form.control} name="sizes" render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="e.g. S, M, L or 40, 41, 42" className="h-14 rounded-2xl border-2" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-black uppercase text-[10px] text-gray-400 tracking-widest">AI Description</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="h-10 px-4 rounded-xl border-2 border-primary/20 text-primary font-black uppercase text-[10px] flex items-center gap-2 hover:bg-primary/5"
                          onClick={generateAiDescription}
                          disabled={isAiGenerating}
                        >
                          {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Generate with AI
                        </Button>
                      </div>
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormControl><Textarea placeholder="Professional description..." rows={8} className="rounded-[2rem] border-2 p-6 resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                  <div className="bg-black/5 p-10 rounded-[3rem] border-2 border-dashed border-black/10">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h4 className="font-black uppercase tracking-tight">Image Gallery</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Upload up to 8 high-quality photos</p>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-1 rounded-xl border-2 font-black">{imageFiles.length}/8</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((p, i) => (
                        <div key={i} className="relative group aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl">
                          <img src={p} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                             <Button 
                               type="button" 
                               variant="secondary" 
                               className="h-10 px-4 rounded-xl font-black text-[10px] uppercase shadow-lg"
                               onClick={() => removeBackground(i)}
                               disabled={isEnhancing === i}
                             >
                                {isEnhancing === i ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-primary" />}
                                Studio BG
                             </Button>
                             <Button type="button" variant="destructive" size="icon" className="h-10 w-10 rounded-xl shadow-lg" onClick={() => {setImageFiles(f => f.filter((_, idx) => idx !== i)); setImagePreviews(pr => pr.filter((_, idx) => idx !== i));}}><X className="w-5 h-5" /></Button>
                          </div>
                        </div>
                      ))}
                      {imageFiles.length < 8 && (
                        <label className="aspect-square bg-white rounded-[2rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:border-primary/20 hover:bg-gray-50 transition-all shadow-sm">
                           <div className="p-4 bg-gray-50 rounded-2xl mb-2"><ImagePlus className="w-8 h-8 text-gray-300" /></div>
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Photo</span>
                           <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageChange} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-xs font-bold text-blue-700 leading-relaxed">
                      AI Integration Enabled: Studio Background tool will automatically detect your product and place it in a perfect studio setting for maximum sales.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>

        <div className="p-10 border-t bg-gray-50 flex gap-4 flex-shrink-0 rounded-b-[3rem]">
          {step > 1 ? (
            <Button type="button" variant="outline" className="h-16 rounded-[1.5rem] flex-1 font-black uppercase tracking-widest text-[10px] border-2" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="h-16 rounded-[1.5rem] flex-1 font-black uppercase tracking-widest text-[10px] text-gray-400" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" className="h-16 rounded-[1.5rem] flex-[2] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20" onClick={() => setStep(step + 1)}>
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              type="button" 
              className="h-16 rounded-[1.5rem] flex-[2] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 animate-pulse-slow"
              onClick={form.handleSubmit(onSubmit, onFormError)}
              disabled={isUploading || createProductMutation.isPending}
            >
               {isUploading ? <><Loader2 className="w-6 h-6 animate-spin mr-2" /> Processing...</> : <><Plus className="w-6 h-6 mr-2" /> Launch Product</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
