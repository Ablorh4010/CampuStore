import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Shield, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const paymentDetailsSchema = z.object({
  paymentMethod: z.enum(['bank', 'paypal', 'mobile_money']),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  paypalUserId: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyPhone: z.string().optional(),
});

type PaymentDetailsData = z.infer<typeof paymentDetailsSchema>;

export default function SellerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userStores = [] } = useQuery<any[]>({
    queryKey: ['/api/stores/user', user?.id],
    enabled: !!user,
  });

  const primaryStore = userStores[0];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(user?.paymentMethod || 'bank');
  const [idScanFile, setIdScanFile] = useState<File | null>(null);
  const [idScanBackFile, setIdScanBackFile] = useState<File | null>(null);
  const [faceScanFile, setFaceScanFile] = useState<File | null>(null);
  const [idScanPreview, setIdScanPreview] = useState<string | null>(null);
  const [idScanBackPreview, setIdScanBackPreview] = useState<string | null>(null);
  const [faceScanPreview, setFaceScanPreview] = useState<string | null>(null);
  
  // New verification fields state
  const [idType, setIdType] = useState<string>('national_id');
  const [whatsappBusinessNumber, setWhatsappBusinessNumber] = useState<string>('');
  const [socialMediaPresence, setSocialMediaPresence] = useState<string>('');
  const [sellerVerificationType, setSellerVerificationType] = useState<string>('student');
  const [sellerAddress, setSellerAddress] = useState<string>('');
  const [location, setLocation] = useState<{lat: string, lng: string} | null>(null);
  
  // Store logo change state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          });
          toast({
            title: 'Location captured',
            description: 'Your live location has been successfully captured.',
          });
        },
        (error) => {
          toast({
            title: 'Location error',
            description: 'Could not capture your live location. Please ensure location services are enabled.',
            variant: 'destructive',
          });
        }
      );
    }
  };

  const form = useForm<PaymentDetailsData>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      paymentMethod: (user?.paymentMethod as any) || 'bank',
      bankAccountNumber: user?.bankAccountNumber || '',
      bankName: user?.bankName || '',
      accountHolderName: user?.accountHolderName || '',
      paypalUserId: user?.paypalUserId || '',
      mobileMoneyProvider: user?.mobileMoneyProvider || '',
      mobileMoneyPhone: user?.mobileMoneyPhone || '',
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentDetailsData) => {
      const response = await apiRequest('PUT', '/api/users/payment-details', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: 'Payment details saved',
        description: 'Your payment information has been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update payment details. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      if (!idScanFile || !faceScanFile) {
        throw new Error('Please upload both ID and face scan');
      }
      
      if (idType !== 'passport' && !idScanBackFile) {
        throw new Error('Please upload the back of your ID');
      }

      if (!location) {
        throw new Error('Please capture your live location');
      }

      const formData = new FormData();
      formData.append('idScan', idScanFile);
      if (idScanBackFile) {
        formData.append('idScanBack', idScanBackFile);
      }
      formData.append('faceScan', faceScanFile);
      formData.append('idType', idType);
      formData.append('whatsappBusinessNumber', whatsappBusinessNumber);
      formData.append('socialMediaPresence', socialMediaPresence);
      formData.append('sellerVerificationType', sellerVerificationType);
      formData.append('sellerAddress', sellerAddress);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);

      const response = await apiRequest('POST', '/api/upload/verification', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: 'Verification documents submitted',
        description: 'Your documents are being reviewed. You will be notified once verified.',
      });
      setIdScanFile(null);
      setIdScanBackFile(null);
      setFaceScanFile(null);
      setIdScanPreview(null);
      setIdScanBackPreview(null);
      setFaceScanPreview(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit verification documents.',
        variant: 'destructive',
      });
    },
  });

  const onSubmitPayment = (data: PaymentDetailsData) => {
    paymentMutation.mutate(data);
  };

  const handleIdScanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdScanFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdScanPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdScanBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdScanBackFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdScanBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceScanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaceScanFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceScanPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerificationSubmit = () => {
    verificationMutation.mutate();
  };

  const logoMutation = useMutation({
    mutationFn: async (storeId: number) => {
      if (!logoFile) throw new Error('Please select an image');
      
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await apiRequest('POST', `/api/stores/${storeId}/request-logo-change`, formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
      toast({
        title: 'Logo change requested',
        description: 'Your new store logo has been submitted for admin approval.',
      });
      setLogoFile(null);
      setLogoPreview(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit logo change request.',
        variant: 'destructive',
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getVerificationStatusBadge = () => {
    switch (user?.verificationStatus) {
      case 'verified':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Seller Settings</h1>
        <p className="text-muted-foreground">
          Manage your payment details and seller verification
        </p>
      </div>

      {/* Verification Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Verification Status
              </CardTitle>
              <CardDescription>Your seller account verification status</CardDescription>
            </div>
            {getVerificationStatusBadge()}
          </div>
        </CardHeader>
        {user?.verificationStatus === 'rejected' && user.verificationNotes && (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{user.verificationNotes}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Payment Details Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Choose how you want to receive payments for your sales
          </CardDescription>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Payment will only be processed if the name on your ID matches the payment account holder name.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPayment)} className="space-y-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPaymentMethod(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank">Bank Account</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPaymentMethod === 'bank' && (
                <>
                  <FormField
                    control={form.control}
                    name="accountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Full name as on your ID"
                            {...field}
                            data-testid="input-account-holder-name"
                          />
                        </FormControl>
                        <FormDescription>
                          Must match the name on your verification ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Bank of America"
                            {...field}
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Account number"
                            {...field}
                            data-testid="input-bank-account-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedPaymentMethod === 'paypal' && (
                <FormField
                  control={form.control}
                  name="paypalUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PayPal Email or User ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.email@example.com"
                          {...field}
                          data-testid="input-paypal-user-id"
                        />
                      </FormControl>
                      <FormDescription>
                        The PayPal account name must match your verified ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedPaymentMethod === 'mobile_money' && (
                <>
                  <FormField
                    control={form.control}
                    name="mobileMoneyProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Money Provider</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., M-Pesa, MTN Mobile Money"
                            {...field}
                            data-testid="input-mobile-money-provider"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileMoneyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Money Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1234567890"
                            {...field}
                            data-testid="input-mobile-money-phone"
                          />
                        </FormControl>
                        <FormDescription>
                          Account must be registered in the same name as your ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button
                type="submit"
                disabled={paymentMutation.isPending}
                className="w-full"
                data-testid="button-save-payment-details"
              >
                {paymentMutation.isPending ? 'Saving...' : 'Save Payment Details'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Store Logo Change */}
      {primaryStore && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Store Profile Picture</CardTitle>
            <CardDescription>
              Update your store's logo. Changes require admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border bg-gray-50 flex-shrink-0">
                <img 
                  src={logoPreview || primaryStore.logoUrl || '/placeholder-logo.png'} 
                  className="w-full h-full object-cover" 
                  alt="Store Logo" 
                />
              </div>
              <div className="flex-grow space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  data-testid="input-store-logo"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 400x400px.
                </p>
              </div>
            </div>

            {primaryStore.pendingLogoUrl && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  You have a logo change request pending approval.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => logoMutation.mutate(primaryStore.id)}
              disabled={!logoFile || logoMutation.isPending}
              className="w-full"
            >
              {logoMutation.isPending ? 'Uploading...' : 'Request Logo Change'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seller Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Seller Verification</CardTitle>
          <CardDescription>
            Upload your ID and a live face scan for verification
          </CardDescription>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Upload a clear photo of your government-issued ID</li>
                <li>Take a live selfie (face scan) for identity verification</li>
                <li>Ensure your face is clearly visible and well-lit</li>
                <li>Your ID name must match your payment account name</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Type</label>
              <Select value={sellerVerificationType} onValueChange={setSellerVerificationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">University Student</SelectItem>
                  <SelectItem value="business">Store / Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {sellerVerificationType === 'student' ? 'University Name' : 'Business / Store Name'}
              </label>
              <Input 
                placeholder={sellerVerificationType === 'student' ? 'e.g. University of Ghana' : 'e.g. Kay Store'} 
                value={sellerVerificationType === 'student' ? (user?.university || '') : (primaryStore?.name || '')}
                disabled
              />
              <p className="text-[10px] text-muted-foreground">
                This is pulled from your profile.
              </p>
            </div>
          </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID Type</label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="driving_license">Driving License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Business Number</label>
              <Input 
                placeholder="e.g. +233240000000" 
                value={whatsappBusinessNumber}
                onChange={(e) => setWhatsappBusinessNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Social Media Presence (URL)</label>
              <Input 
                placeholder="Instagram, Facebook, or LinkedIn URL" 
                value={socialMediaPresence}
                onChange={(e) => setSocialMediaPresence(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Store Address / Location</label>
            <Input 
              placeholder="Enter your physical store or residential address" 
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">Live Location</label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={captureLocation}
                className={location ? "border-green-500 text-green-500" : ""}
              >
                {location ? "Location Captured ✓" : "Capture Live Location"}
              </Button>
              {location && (
                <span className="text-xs text-gray-500">
                  {location.lat.substring(0, 8)}, {location.lng.substring(0, 8)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                ID Scan (Front{idType !== 'passport' ? ' side' : ''})
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleIdScanChange}
                disabled={user?.verificationStatus === 'verified'}
                data-testid="input-id-scan"
              />
              {idScanPreview && (
                <div className="mt-2">
                  <img
                    src={idScanPreview}
                    alt="ID Scan Preview"
                    className="w-full max-w-md h-48 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {idType !== 'passport' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  ID Scan (Back side)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleIdScanBackChange}
                  disabled={user?.verificationStatus === 'verified'}
                  data-testid="input-id-scan-back"
                />
                {idScanBackPreview && (
                  <div className="mt-2">
                    <img
                      src={idScanBackPreview}
                      alt="ID Scan Back Preview"
                      className="w-full max-w-md h-48 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Face Scan (Live Selfie)
            </label>
            <Input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFaceScanChange}
              disabled={user?.verificationStatus === 'verified'}
              data-testid="input-face-scan"
            />
            {faceScanPreview && (
              <div className="mt-2">
                <img
                  src={faceScanPreview}
                  alt="Face Scan Preview"
                  className="w-full max-w-md h-48 object-cover rounded border"
                />
              </div>
            )}
          </div>

          {user?.verificationStatus !== 'verified' && (
            <Button
              onClick={handleVerificationSubmit}
              disabled={!idScanFile || (idType !== 'passport' && !idScanBackFile) || !faceScanFile || !location || verificationMutation.isPending}
              className="w-full"
              data-testid="button-submit-verification"
            >
              {verificationMutation.isPending ? 'Uploading...' : 'Submit for Verification'}
            </Button>
          )}

          {user?.verificationStatus === 'verified' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your account has been verified! You can now receive payments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
