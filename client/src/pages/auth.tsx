import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Eye, EyeOff, GraduationCap, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const emailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const adminRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const phoneAuthSchema = z.object({
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  otpCode: z.string().optional(),
}).refine((data) => !data.otpCode || data.otpCode.length === 6, {
  message: 'OTP code must be 6 digits',
  path: ['otpCode'],
});

const registerSchema = z.object({
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  otpCode: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  university: z.string().min(1, 'University is required'),
  city: z.string().min(1, 'City is required'),
}).refine((data) => !data.otpCode || data.otpCode.length === 6, {
  message: 'OTP code must be 6 digits',
  path: ['otpCode'],
});

type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
type AdminRegisterFormData = z.infer<typeof adminRegisterSchema>;
type PhoneAuthFormData = z.infer<typeof phoneAuthSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Auth() {
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [adminActiveTab, setAdminActiveTab] = useState<'login' | 'signup'>('signup');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [userMode, setUserMode] = useState<'buyer' | 'seller' | null>(null);
  const { login, register, registerAdmin, sendOtp, isLoading } = useAuth();
  const { toast } = useToast();

  // Check for admin and mode query parameters on mount and whenever URL changes
  useEffect(() => {
    const checkParams = () => {
      const params = new URLSearchParams(window.location.search);
      const isAdmin = params.get('admin') === 'true';
      const mode = params.get('mode') as 'buyer' | 'seller' | null;
      console.log('Checking params:', { isAdmin, mode }, window.location.search);
      setIsAdminMode(isAdmin);
      if (mode) {
        setUserMode(mode);
        localStorage.setItem('userMode', mode);
      } else {
        const savedMode = localStorage.getItem('userMode') as 'buyer' | 'seller' | null;
        setUserMode(savedMode);
      }
    };
    
    checkParams();
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', checkParams);
    
    return () => {
      window.removeEventListener('popstate', checkParams);
    };
  }, []);
  
  // Also check when location changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isAdmin = params.get('admin') === 'true';
    console.log('Location changed, admin mode:', isAdmin);
    setIsAdminMode(isAdmin);
  }, [location]);

  const emailLoginForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneAuthForm = useForm<PhoneAuthFormData>({
    resolver: zodResolver(phoneAuthSchema),
    defaultValues: {
      phoneNumber: '',
      otpCode: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phoneNumber: '',
      otpCode: '',
      username: '',
      firstName: '',
      lastName: '',
      university: '',
      city: '',
    },
  });

  const adminRegisterForm = useForm<AdminRegisterFormData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
      firstName: '',
      lastName: '',
    },
  });

  const onEmailLogin = async (data: EmailLoginFormData) => {
    try {
      await login({ email: data.email, password: data.password });
      toast({
        title: '✅ Welcome back, Admin!',
        description: 'You have been successfully signed in. Redirecting...',
        duration: 6000,
      });
      setLocation('/admin');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }
  };

  const onAdminRegister = async (data: AdminRegisterFormData) => {
    try {
      await registerAdmin(data);
      toast({
        title: '✅ Admin account created successfully!',
        description: 'Your admin account is now active. Redirecting to admin portal...',
        duration: 8000,
      });
      setLocation('/admin');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again with different details.',
        variant: 'destructive',
      });
    }
  };

  const onPhoneLogin = async (data: PhoneAuthFormData) => {
    try {
      await login({ phoneNumber: data.phoneNumber, otpCode: data.otpCode });
      toast({
        title: '✅ Welcome back!',
        description: 'You have been successfully signed in. Redirecting...',
        duration: 6000,
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your OTP code and try again.',
        variant: 'destructive',
      });
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    if (!data.otpCode || data.otpCode.length !== 6) {
      toast({
        title: 'OTP Required',
        description: 'Please enter the 6-digit OTP code sent to your phone.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await register({
        phoneNumber: data.phoneNumber,
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
    const phoneNumber = formType === 'login' 
      ? phoneAuthForm.getValues('phoneNumber')
      : registerForm.getValues('phoneNumber');
      
    // Remove any spaces and validate phone number
    const cleanPhone = phoneNumber?.trim();
    
    if (!cleanPhone || cleanPhone.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number (at least 10 digits).',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOtp(cleanPhone);
      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: '✅ OTP sent successfully!',
        description: `A 6-digit code has been sent to ${cleanPhone}. Please check your messages and enter it below.`,
        duration: 10000,
      });
    } catch (error) {
      console.error('OTP send error:', error);
      toast({
        title: 'Failed to send OTP',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Admin login interface
  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Secure administrative access</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {adminActiveTab === 'login' ? 'Admin Sign In' : 'Create Admin Account'}
              </CardTitle>
              <CardDescription className="text-center">
                {adminActiveTab === 'login' 
                  ? 'Enter your admin credentials' 
                  : 'Set up your admin account'
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={adminActiveTab} onValueChange={(v) => setAdminActiveTab(v as 'login' | 'signup')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="tab-admin-sign-in">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" data-testid="tab-admin-sign-up">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...emailLoginForm}>
                    <form onSubmit={emailLoginForm.handleSubmit(onEmailLogin)} className="space-y-4">
                  <FormField
                    control={emailLoginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="admin@example.com" 
                            {...field}
                            data-testid="input-admin-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailLoginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password" 
                              {...field}
                              data-testid="input-admin-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-admin-sign-in"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm text-primary"
                          onClick={() => setLocation('/forgot-password')}
                          data-testid="link-admin-forgot-password"
                        >
                          Forgot your password?
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="signup">
                  <Form {...adminRegisterForm}>
                    <form onSubmit={adminRegisterForm.handleSubmit(onAdminRegister)} className="space-y-4">
                      <FormField
                        control={adminRegisterForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="admin@example.com" 
                                {...field}
                                data-testid="input-admin-signup-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={adminRegisterForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="adminuser" 
                                {...field}
                                data-testid="input-admin-signup-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={adminRegisterForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="John" 
                                  {...field}
                                  data-testid="input-admin-signup-firstname"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminRegisterForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="Doe" 
                                  {...field}
                                  data-testid="input-admin-signup-lastname"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={adminRegisterForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a strong password" 
                                  {...field}
                                  data-testid="input-admin-signup-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-toggle-signup-password"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                        data-testid="button-admin-sign-up"
                      >
                        {isLoading ? 'Creating account...' : 'Create Admin Account'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <div className="text-center pt-4 mt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => {
                    setIsAdminMode(false);
                    window.history.pushState({}, '', '/auth');
                  }}
                  data-testid="button-back-to-user-auth"
                >
                  Back to User Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Regular user OTP-based authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campus Exchange</h1>
          <p className="text-gray-600">Join the student marketplace community</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login' 
                ? 'Sign in with your phone number' 
                : 'Join thousands of students using Campus Exchange'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'login' | 'register');
              setShowOtpField(false);
              setOtpSent(false);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-sign-in">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-sign-up">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...phoneAuthForm}>
                  <form onSubmit={phoneAuthForm.handleSubmit(onPhoneLogin)} className="space-y-4">
                    <FormField
                      control={phoneAuthForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input 
                                type="tel" 
                                placeholder="+1234567890" 
                                {...field} 
                                className="flex-1"
                                data-testid="input-login-phone"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendOtp('login')}
                                disabled={isLoading || otpSent}
                                data-testid="button-send-login-otp"
                              >
                                {otpSent ? 'Sent' : 'Send OTP'}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {otpSent && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>OTP sent!</strong> Check your phone for the 6-digit code and enter it below.
                        </AlertDescription>
                      </Alert>
                    )}

                    {showOtpField && (
                      <FormField
                        control={phoneAuthForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OTP Code</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Enter 6-digit code" 
                                maxLength={6}
                                {...field}
                                data-testid="input-login-otp"
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
                      disabled={isLoading || !showOtpField || !phoneAuthForm.watch('otpCode') || phoneAuthForm.watch('otpCode')?.length !== 6}
                      data-testid="button-verify-login"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-gray-500"
                    onClick={() => {
                      setIsAdminMode(true);
                      window.history.pushState({}, '', '/auth?admin=true');
                    }}
                    data-testid="link-admin-login"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Admin Login
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
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
                            <Input placeholder="johndoe123" {...field} data-testid="input-username" />
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

                    <FormField
                      control={registerForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input 
                                type="tel" 
                                placeholder="+1234567890" 
                                {...field} 
                                className="flex-1"
                                data-testid="input-register-phone"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendOtp('register')}
                                disabled={isLoading || otpSent}
                                data-testid="button-send-register-otp"
                              >
                                {otpSent ? 'Sent' : 'Send OTP'}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {otpSent && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>OTP sent!</strong> Check your phone for the 6-digit code and enter it below.
                        </AlertDescription>
                      </Alert>
                    )}

                    {showOtpField && (
                      <FormField
                        control={registerForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OTP Code</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Enter 6-digit code" 
                                maxLength={6}
                                {...field}
                                data-testid="input-register-otp"
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
                      disabled={isLoading || !showOtpField || !registerForm.watch('otpCode') || registerForm.watch('otpCode')?.length !== 6}
                      data-testid="button-create-account"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
