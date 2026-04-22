import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useState } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck } from 'lucide-react';

const trackingSchema = z.object({
  deliveryStatus: z.enum(['pending', 'in_transit', 'delivered', 'rejected']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  trackingHistory: z.string().optional(),
});

type TrackingFormData = z.infer<typeof trackingSchema>;

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  initialData?: Partial<TrackingFormData>;
}

export default function TrackingModal({ isOpen, onClose, orderId, initialData }: TrackingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      deliveryStatus: (initialData?.deliveryStatus as any) || 'pending',
      trackingNumber: initialData?.trackingNumber || '',
      carrier: initialData?.carrier || 'Ghana Post',
      estimatedDeliveryDate: initialData?.estimatedDeliveryDate ? new Date(initialData.estimatedDeliveryDate).toISOString().split('T')[0] : '',
      trackingHistory: initialData?.trackingHistory || '',
    },
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async (data: TrackingFormData) => {
      const response = await apiRequest('PUT', `/api/orders/${orderId}/tracking`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/seller'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/buyer'] });
      toast({
        title: 'Tracking Updated',
        description: 'The tracking information has been updated and the buyer has been notified.',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tracking.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TrackingFormData) => {
    updateTrackingMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Update Delivery Tracking
          </DialogTitle>
          <DialogDescription>
            Update the delivery status and tracking details for this order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deliveryStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-2">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="rejected">Rejected/Returned</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ghana Post" className="rounded-xl border-2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking #</FormLabel>
                    <FormControl>
                      <Input placeholder="GP12345678" className="rounded-xl border-2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimatedDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Delivery Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="rounded-xl border-2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackingHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Updates (History)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. Package arrived at Accra Hub..." 
                      className="rounded-xl border-2"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={updateTrackingMutation.isPending} className="flex-1 rounded-xl font-bold">
                {updateTrackingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Updates
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
