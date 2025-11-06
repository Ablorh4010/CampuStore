import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { GraduationCap, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const emailAuthSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otpCode: z.string().optional(),
}).refine((data) => !data.otpCode || data.otpCode.length === 6, {
  message: 'Verification code must be 6 digits',
  path: ['otpCode'],
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otpCode: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  university: z.string().min(1, 'University is required'),
  city: z.string().min(1, 'City is required'),
}).refine((data) => !data.otpCode || data.otpCode.length === 6, {
  message: 'Verification code must be 6 digits',
  path: ['otpCode'],
});

type EmailAuthFormData = z.infer<typeof emailAuthSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Auth() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [userMode, setUserMode] = useState<'buyer' | 'seller' | null>(null);
  const { login, register, sendOtp, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as 'buyer' | 'seller' | null;
    if (mode) {
      setUserMode(mode);
      localStorage.setItem('userMode', mode);
    } else {
      const savedMode = localStorage.getItem('userMode') as 'buyer' | 'seller' | null;
      setUserMode(savedMode);
    }
  }, []);

  const emailAuthForm = useForm<EmailAuthFormData>({
    resolver: zodResolver(emailAuthSchema),
    defaultValues: {
      email: '',
      otpCode: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      otpCode: '',
      username: '',
      firstName: '',
      lastName: '',
      university: '',
      city: '',
    },
  });

  const onEmailLogin = async (data: EmailAuthFormData) => {
    try {
      await login({ email: data.email, otpCode: data.otpCode });
      toast({
        title: '✅ Welcome back!',
        description: 'You have been successfully signed in. Redirecting...',
        duration: 6000,
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your verification code and try again.',
        variant: 'destructive',
      });
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    if (!data.otpCode || data.otpCode.length !== 6) {
      toast({
        title: 'Verification Code Required',
        description: 'Please enter the 6-digit verification code sent to your email.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await register({
        email: data.email,
        otpCode: data.otpCode,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        university: data.university,
        city: data.city,
        isMerchant: false,
      });
      toast({
        title: '✅ Account created successfully!',
        description: 'Welcome to Campus Exchange! Redirecting to homepage...',
        duration: 8000,
      });
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again with different details.',
        variant: 'destructive',
      });
    }
  };

  const handleSendOtp = async (formType: 'login' | 'register') => {
    const email = formType === 'login' 
      ? emailAuthForm.getValues('email')
      : registerForm.getValues('email');
      
    const cleanEmail = email?.trim();
    
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOtp(cleanEmail);
      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: '✅ Verification code sent!',
        description: `A 6-digit code has been sent to ${cleanEmail}. Please check your inbox and enter it below.`,
        duration: 10000,
      });
    } catch (error) {
      console.error('OTP send error:', error);
      toast({
        title: 'Failed to send verification code',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campus Exchange</h1>
          <p className="text-gray-600">Your university marketplace</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login' 
                ? 'Sign in to continue shopping' 
                : 'Join your campus marketplace'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-sign-in">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-sign-up">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <Form {...emailAuthForm}>
                  <form onSubmit={emailAuthForm.handleSubmit(onEmailLogin)} className="space-y-4">
                    <FormField
                      control={emailAuthForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input 
                                type="email" 
                                placeholder="you@university.edu" 
                                className="pl-10"
                                {...field}
                                data-testid="input-email-login"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!showOtpField && (
                      <Button
                        type="button"
                        onClick={() => handleSendOtp('login')}
                        className="w-full"
                        variant="outline"
                        data-testid="button-send-code-login"
                      >
                        Send Verification Code
                      </Button>
                    )}

                    {showOtpField && (
                      <>
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Verification code sent! Check your email inbox.
                          </AlertDescription>
                        </Alert>

                        <FormField
                          control={emailAuthForm.control}
                          name="otpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="Enter 6-digit code" 
                                  maxLength={6}
                                  {...field}
                                  data-testid="input-otp-login"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                          data-testid="button-submit-login"
                        >
                          {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                      </>
                    )}
                  </form>
                </Form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input 
                                type="email" 
                                placeholder="you@university.edu" 
                                className="pl-10"
                                {...field}
                                data-testid="input-email-register"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!otpSent && (
                      <Button
                        type="button"
                        onClick={() => handleSendOtp('register')}
                        className="w-full"
                        variant="outline"
                        data-testid="button-send-code-register"
                      >
                        Send Verification Code
                      </Button>
                    )}

                    {otpSent && (
                      <>
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Verification code sent! Check your email inbox.
                          </AlertDescription>
                        </Alert>

                        <FormField
                          control={registerForm.control}
                          name="otpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="Enter 6-digit code" 
                                  maxLength={6}
                                  {...field}
                                  data-testid="input-otp-register"
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
                                  <Input placeholder="John" {...field} data-testid="input-first-name" />
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
                                  <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} data-testid="input-username" />
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
                                <Input placeholder="University of Example" {...field} data-testid="input-university" />
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
                                <Input placeholder="New York" {...field} data-testid="input-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                          data-testid="button-submit-register"
                        >
                          {isLoading ? 'Creating account...' : 'Create Account'}
                        </Button>
                      </>
                    )}
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          By continuing, you agree to Campus Exchange's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
