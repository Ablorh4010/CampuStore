import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { ImagePlus, Loader2, X } from 'lucide-react';
import type { Store } from '@shared/schema';

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  description: z.string().min(1, 'Description is required'),
  university: z.string().min(1, 'University is required'),
  campus: z.string().nullable().optional(),
  city: z.string().min(1, 'City is required'),
  logoUrl: z.string().nullable().optional(),
});

type StoreFormData = z.infer<typeof storeSchema>;

interface StoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  store?: Store; // Pass store for editing
}

export default function StoreForm({ isOpen, onClose, store }: StoreFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoUrl] = useState<string | null>(store?.logoUrl || null);

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name || '',
      description: store?.description || '',
      university: store?.university || user?.university || '',
      campus: store?.campus || user?.campus || '',
      city: store?.city || user?.city || '',
      logoUrl: store?.logoUrl || '',
    },
  });

  // Reset form when store changes
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        description: store.description,
        university: store.university,
        campus: store.campus,
        city: store.city,
        logoUrl: store.logoUrl,
      });
      setLogoUrl(store.logoUrl || null);
    } else {
      form.reset({
        name: '',
        description: '',
        university: user?.university || '',
        campus: user?.campus || '',
        city: user?.city || '',
        logoUrl: '',
      });
      setLogoUrl(null);
    }
  }, [store, form, user]);

  const saveStoreMutation = useMutation({
    mutationFn: async (data: StoreFormData) => {
      const url = store ? `/api/stores/${store.id}` : '/api/stores';
      const method = store ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, {
        ...data,
        userId: user!.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
      toast({
        title: store ? 'Store updated' : 'Store created',
        description: store ? 'Your store profile has been updated.' : 'Your store has been created successfully.',
      });
      onClose();
      if (!store) form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save store. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/product', { // Reusing product upload endpoint
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) throw new Error('Logo upload failed');
      const data = await response.json();
      return data.url;
    },
    onSuccess: (url) => {
      setLogoUrl(url);
      form.setValue('logoUrl', url);
      setIsUploading(false);
    },
    onError: () => {
      toast({ title: 'Upload failed', variant: 'destructive' });
      setIsUploading(false);
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadLogoMutation.mutate(file);
    }
  };

  const onSubmit = (data: StoreFormData) => {
    saveStoreMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{store ? 'Edit Store Profile' : 'Create Your Store'}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              {store ? 'Update your store details' : 'Fill out the form to start selling'}
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center justify-center py-4">
               <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                     {logoPreview ? (
                        <img src={logoPreview} className="w-full h-full object-cover" />
                     ) : (
                        <ImagePlus className="w-8 h-8 text-gray-400" />
                     )}
                     {isUploading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                           <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                     )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform">
                     <Plus className="w-4 h-4" />
                     <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} disabled={isUploading} />
                  </label>
                  {logoPreview && (
                    <button 
                      type="button"
                      onClick={() => { setLogoUrl(null); form.setValue('logoUrl', null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase mt-3 tracking-widest">Store Profile Picture</p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Student Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell customers about your store..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University</FormLabel>
                    <FormControl>
                      <Input placeholder="University Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="campus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campus (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Campus" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveStoreMutation.isPending || isUploading}
                className="flex-1"
              >
                {saveStoreMutation.isPending ? 'Saving...' : store ? 'Update Store' : 'Create Store'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
