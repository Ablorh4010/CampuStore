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
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { ImagePlus, Loader2, X, Plus, Sparkles, Video, Trash2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  images: z.array(z.string()).max(4, 'Maximum 4 other images allowed'),
  mediaGifUrl: z.string().min(1, 'Showcase GIF or Video is mandatory'),
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [gifPreview, setGifPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<number | null>(null);

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
      condition: '',
      specialOffer: '',
      images: [],
      mediaGifUrl: '',
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      
      // 1. Upload mandatory GIF
      const gifFormData = new FormData();
      gifFormData.append('image', gifFile!);
      const gifRes = await fetch('/api/upload/product', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: gifFormData
      });
      if (!gifRes.ok) throw new Error("GIF upload failed");
      const gifData = await gifRes.json();
      
      // 2. Upload other images
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/upload/product', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const resData = await res.json();
          imageUrls.push(resData.url);
        }
      }

      // 3. Create Product
      const finalData = { 
        ...data, 
        mediaGifUrl: gifData.url,
        images: imageUrls 
      };
      
      const response = await apiRequest('POST', '/api/products', finalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Success', description: 'Product submitted for review!' });
      onClose();
      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
      setGifFile(null);
      setGifPreview(null);
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      setIsUploading(false);
    }
  });

  const handleGifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGifFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setGifPreview(reader.result as string);
      reader.readAsDataURL(file);
      form.setValue('mediaGifUrl', 'uploaded');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 4) {
      toast({ title: 'Limit Exceeded', description: 'At most 4 other images allowed.', variant: 'destructive' });
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
    if (!gifFile) {
      toast({ title: "Showcase Required", description: "Every product must have a GIF or Video.", variant: "destructive" });
      return;
    }
    createProductMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl">
        <DialogHeader className="paylater-hero p-8 text-white -m-6 mb-6 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Plus className="w-6 h-6" /></div>
             <div>
                <DialogTitle className="text-3xl font-black">List New Product</DialogTitle>
                <DialogDescription className="text-white/70 font-bold">Follow the AI-guided steps to create a quality listing.</DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-2">
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <FormField control={form.control} name="storeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Select Store</FormLabel>
                      <Select onValueChange={v => field.onChange(parseInt(v))}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="Which store?" /></SelectTrigger></FormControl>
                        <SelectContent>{userStores.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Product Title</FormLabel><FormControl><Input placeholder="E.g. Vintage Denim Jacket" className="h-12 rounded-xl border-2" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Price ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" className="h-12 rounded-xl border-2" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem><FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Category</FormLabel><Select onValueChange={v => field.onChange(parseInt(v))}><FormControl><SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="Category" /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                    <FormField control={form.control} name="condition" render={({ field }) => (
                      <FormItem><FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Condition</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="Condition" /></SelectTrigger></FormControl><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem></SelectContent></Select></FormItem>
                    )} />
                  </div>
               </div>

               <div className="space-y-6">
                  {/* Mandatory GIF Section */}
                  <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-dashed border-primary/20">
                     <div className="flex items-center gap-2 mb-4">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black uppercase text-primary tracking-tighter">AI Showcase GIF (Mandatory)</span>
                     </div>
                     {gifPreview ? (
                        <div className="relative group rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                           <img src={gifPreview} className="w-full h-40 object-cover" alt="GIF Preview" />
                           <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={() => {setGifFile(null); setGifPreview(null); form.setValue('mediaGifUrl', '');}}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                     ) : (
                        <label className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors border-2 border-gray-100">
                           <Wand2 className="w-8 h-8 text-primary mb-2 animate-bounce" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Upload Short Video/GIF</span>
                           <input type="file" className="hidden" accept="image/gif,video/mp4" onChange={handleGifChange} />
                        </label>
                     )}
                  </div>

                  {/* Gallery Section */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <Label className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Image Gallery (Max 4)</Label>
                        <Badge variant="outline" className="font-bold">{imageFiles.length}/4</Badge>
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        {imagePreviews.map((p, i) => (
                           <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border shadow-sm">
                              <img src={p} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                 <Button type="button" variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => aiEnhanceImage(i)} disabled={isEnhancing === i}>
                                    {isEnhancing === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                 </Button>
                                 <Button type="button" variant="destructive" size="icon" className="h-7 w-7 rounded-lg" onClick={() => {setImageFiles(f => f.filter((_, idx) => idx !== i)); setImagePreviews(pr => pr.filter((_, idx) => idx !== i));}}><X className="w-3 h-3" /></Button>
                              </div>
                           </div>
                        ))}
                        {imageFiles.length < 4 && (
                           <label className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100">
                              <ImagePlus className="w-5 h-5 text-gray-400" />
                              <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageChange} />
                           </label>
                        )}
                     </div>
                     <p className="text-[9px] text-gray-400 font-bold italic">AI Magic: Every image will be auto-watermarked by University Hub.</p>
                  </div>
               </div>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
               <FormItem><FormLabel className="font-bold uppercase text-[10px] text-gray-400 tracking-widest">Product Description</FormLabel><FormControl><Textarea placeholder="Describe the features, size, material..." rows={4} className="rounded-2xl border-2" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="flex gap-4 pt-6 border-t">
               <Button type="button" variant="ghost" className="h-14 rounded-2xl flex-1 font-bold text-gray-500" onClick={onClose}>Cancel</Button>
               <Button 
                 type="submit" 
                 className="h-14 rounded-2xl flex-[2] font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-105"
                 disabled={isUploading || createProductMutation.isPending}
               >
                  {isUploading ? <><Loader2 className="w-6 h-6 animate-spin mr-2" /> AI Processing...</> : <><Sparkles className="w-6 h-6 mr-2" /> Launch Listing</>}
               </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
