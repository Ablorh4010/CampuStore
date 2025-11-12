import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Store, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { IdScanCapture, FacialCapture } from '@/components/verification';

const whatsappLoginSchema = z.object({
  whatsappNumber: z.string().min(10, 'Please enter a valid phone number'),
  whatsappOtpCode: z.string().optional(),
}).refine((data) => !data.whatsappOtpCode || data.whatsappOtpCode.length === 6, {
  message: 'Verification code must be 6 digits',
  path: ['whatsappOtpCode'],
});

const sellerRegisterSchema = z.object({
  whatsappNumber: z.string().min(10, 'Please enter a valid WhatsApp number'),
  whatsappOtpCode: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  university: z.string().min(1, 'University is required'),
  city: z.string().min(1, 'City is required'),
}).refine((data) => !data.whatsappOtpCode || data.whatsappOtpCode.length === 6, {
  message: 'Verification code must be 6 digits',
  path: ['whatsappOtpCode'],
});

type WhatsappLoginFormData = z.infer<typeof whatsappLoginSchema>;
type SellerRegisterFormData = z.infer<typeof sellerRegisterSchema>;

export default function SellerAuth() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const { toast } = useToast();

  const loginForm = useForm<WhatsappLoginFormData>({
    resolver: zodResolver(whatsappLoginSchema),
    defaultValues: {
      whatsappNumber: '',
      whatsappOtpCode: '',
    },
  });

  const registerForm = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: {
      whatsappNumber: '',
      whatsappOtpCode: '',
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      university: '',
      city: '',
    },
  });

  const sendWhatsappOtp = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: '✅ Verification code sent!',
        description: `A 6-digit code has been sent to your WhatsApp number. Please check and enter it below.`,
        duration: 10000,
      });
    } catch (error: any) {
      console.error('WhatsApp OTP send error:', error);
      toast({
        title: 'Failed to send verification code',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onLogin = async (data: WhatsappLoginFormData) => {
    if (!data.whatsappOtpCode || data.whatsappOtpCode.length !== 6) {
      toast({
        title: 'Verification Code Required',
        description: 'Please enter the 6-digit verification code sent to your WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber: data.whatsappNumber,
          whatsappOtpCode: data.whatsappOtpCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const result = await response.json();
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      toast({
        title: '✅ Welcome back!',
        description: 'You have been successfully signed in.',
        duration: 6000,
      });
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Please check your verification code and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: SellerRegisterFormData) => {
    if (!data.whatsappOtpCode || data.whatsappOtpCode.length !== 6) {
      toast({
        title: 'Verification Code Required',
        description: 'Please enter the 6-digit verification code sent to your WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    if (!idFile || !faceFile) {
      toast({
        title: 'Verification Documents Required',
        description: 'Please upload your ID document and selfie to complete seller registration.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, register the seller
      const response = await fetch('/api/auth/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      // Upload verification documents
      const formData = new FormData();
      formData.append('idScan', idFile);
      formData.append('faceScan', faceFile);

      const uploadResponse = await fetch('/api/upload/verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        console.error('Failed to upload verification documents');
      }

      toast({
        title: '✅ Seller account created!',
        description: 'Welcome to CampusAffordHub! Your documents are under review.',
        duration: 8000,
      });
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again with different details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Portal</h1>
          <p className="text-gray-600">Create your store and start selling</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Seller Authentication
            </CardTitle>
            <CardDescription>
              Verify your WhatsApp number to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="whatsappNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp Number</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                placeholder="+1234567890" 
                                {...field}
                                disabled={showOtpField}
                              />
                              {!showOtpField && (
                                <Button
                                  type="button"
                                  onClick={() => sendWhatsappOtp(field.value)}
                                  disabled={!field.value}
                                >
                                  Send OTP
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {showOtpField && (
                      <FormField
                        control={loginForm.control}
                        name="whatsappOtpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verification Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter 6-digit code" 
                                maxLength={6}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading || !showOtpField}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                {!showVerification ? (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(() => setShowVerification(true))} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Number</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="+1234567890" 
                                  {...field}
                                  disabled={showOtpField}
                                />
                                {!showOtpField && (
                                  <Button
                                    type="button"
                                    onClick={() => sendWhatsappOtp(field.value)}
                                    disabled={!field.value}
                                  >
                                    Send OTP
                                  </Button>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {showOtpField && (
                        <>
                          <FormField
                            control={registerForm.control}
                            name="whatsappOtpCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Verification Code</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter 6-digit code" 
                                    maxLength={6}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={registerForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="university"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>University</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button type="submit" className="w-full">
                            Continue to Verification
                          </Button>
                        </>
                      )}
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <ShieldCheck className="h-4 w-4" />
                      <AlertDescription>
                        As a seller, you must verify your identity before creating your store.
                      </AlertDescription>
                    </Alert>

                    <IdScanCapture 
                      onCapture={setIdFile}
                      onRemove={() => setIdFile(null)}
                    />

                    <FacialCapture 
                      onCapture={setFaceFile}
                      onRemove={() => setFaceFile(null)}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowVerification(false)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => onRegister(registerForm.getValues())}
                        disabled={!idFile || !faceFile || isLoading}
                        className="flex-1"
                      >
                        {isLoading ? 'Creating Account...' : 'Complete Registration'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>
                Not a seller?{' '}
                <button
                  onClick={() => setLocation('/auth')}
                  className="text-primary hover:underline"
                >
                  Browse as buyer
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
