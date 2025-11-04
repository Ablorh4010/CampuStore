import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const emailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneLoginSchema = z.object({
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional(),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  university: z.string().min(1, 'University is required'),
}).refine((data) => data.email || data.phoneNumber, {
  message: "Either email or phone number is required",
  path: ["email"],
});

type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { login, register, sendOtp, isLoading } = useAuth();
  const { toast } = useToast();

  const emailLoginForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneLoginForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phoneNumber: '',
      otpCode: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      phoneNumber: '',
      password: '',
      username: '',
      firstName: '',
      lastName: '',
      university: '',
    },
  });

  const onEmailLogin = async (data: EmailLoginFormData) => {
    try {
      await login({ email: data.email, password: data.password });
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }
  };

  const onPhoneLogin = async (data: PhoneLoginFormData) => {
    try {
      await login({ phoneNumber: data.phoneNumber, otpCode: data.otpCode });
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
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

  const handleSendOtp = async () => {
    const phoneNumber = phoneLoginForm.getValues('phoneNumber');
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOtp(phoneNumber);
      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: 'OTP sent!',
        description: 'Please check your phone for the verification code.',
      });
    } catch (error) {
      toast({
        title: 'Failed to send OTP',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    try {
      await register({
        ...data,
        isMerchant: false,
      });
      toast({
        title: 'Account created!',
        description: 'Welcome to StudentMarket. Start browsing or create your store.',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">StudentMarket</h1>
          <p className="text-gray-600">Join the student marketplace community</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login' 
                ? 'Sign in to continue buying and selling' 
                : 'Join thousands of students already using StudentMarket'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="flex space-x-2 mb-4">
                    <Button
                      type="button"
                      variant={loginMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setLoginMethod('email')}
                      className="flex-1"
                    >
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === 'phone' ? 'default' : 'outline'}
                      onClick={() => {
                        setLoginMethod('phone');
                        setShowOtpField(false);
                        setOtpSent(false);
                      }}
                      className="flex-1"
                    >
                      Phone
                    </Button>
                  </div>

                  {loginMethod === 'email' ? (
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
                                  placeholder="your@university.edu" 
                                  {...field} 
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
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
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
                        >
                          {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        <div className="text-center">
                          <Button
                            type="button"
                            variant="link"
                            className="text-sm text-primary"
                            onClick={() => setLocation('/forgot-password')}
                            data-testid="link-forgot-password"
                          >
                            Forgot your password?
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <Form {...phoneLoginForm}>
                      <form onSubmit={phoneLoginForm.handleSubmit(onPhoneLogin)} className="space-y-4">
                        <FormField
                          control={phoneLoginForm.control}
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
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSendOtp}
                                    disabled={isLoading || otpSent}
                                  >
                                    {otpSent ? 'Sent' : 'Send OTP'}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {showOtpField && (
                          <FormField
                            control={phoneLoginForm.control}
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
                          {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </Button>
                      </form>
                    </Form>
                  )}
                </div>

                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>
                    New to StudentMarket?{' '}
                    <button 
                      onClick={() => setActiveTab('register')}
                      className="text-primary font-medium hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
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
                              <Input placeholder="John" {...field} />
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
                              <Input placeholder="Doe" {...field} />
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
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john.doe@university.edu" 
                              {...field} 
                            />
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
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="+1234567890" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password (Optional if using phone)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
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

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe123" {...field} />
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
                            <Input placeholder="University of California, Berkeley" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>
                    Already have an account?{' '}
                    <button 
                      onClick={() => setActiveTab('login')}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                By signing up, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/">
            <Button variant="ghost" className="text-gray-600">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
